import { useEffect, useState } from "react";
import { loadModel, runInference } from "./utils/inference";
import { useAudioProcessing, type AudioBufferState } from "./hooks/useAudioProcessing";
import type { TextSegment } from "./utils/textDecoder";

type UseDecodeParams = {
  filterFreq: number | null;
  filterWidth: number;
  gain: number;
  stream: MediaStream | null;
  language: "EN" | "EN/JA";
  decoderMode: "DL" | "BAYESIAN";
  enabled: boolean;
};

export const useDecode = ({
  filterFreq,
  filterWidth,
  gain,
  stream,
  language,
}: UseDecodeParams) => {
  const [loaded, setLoaded] = useState(false);
  const [loadedJa, setLoadedJa] = useState(false);
  const [currentSegments, setCurrentSegments] = useState<TextSegment[]>([]);
  const [currentSegmentsJa, setCurrentSegmentsJa] = useState<TextSegment[]>([]);
  const [isDecoding, setIsDecoding] = useState(false);

  const audioBufferRef = useAudioProcessing(stream, gain, 12);

  useEffect(() => {
    (async () => {
      try {
        await loadModel("en");
        setLoaded(true);
      } catch (error) {
        console.error("[useDecode] Failed to load English model:", error);
      }
    })();
  }, []);

  useEffect(() => {
    if (language === "EN/JA" && !loadedJa) {
      (async () => {
        try {
          await loadModel("ja");
          setLoadedJa(true);
        } catch (error) {
          console.error("[useDecode] Failed to load Japanese model:", error);
        }
      })();
    }
  }, [language, loadedJa]);

  useEffect(() => {
    if (!stream || !loaded) {
      return;
    }

    let cancelled = false;

    const decodeContinuously = async () => {
      while (!cancelled) {
        const audioState: AudioBufferState = audioBufferRef.current;

        const segmentsEn = await runInference(
          audioState.samples,
          filterFreq,
          filterWidth,
          "en"
        );
        if (cancelled) {
          return;
        }
        setCurrentSegments(segmentsEn);

        if (language === "EN/JA" && loadedJa) {
          const segmentsJa = await runInference(
            audioState.samples,
            filterFreq,
            filterWidth,
            "ja"
          );
          if (cancelled) {
            return;
          }
          setCurrentSegmentsJa(segmentsJa);
        }
      }
    };

    setIsDecoding(true);
    void decodeContinuously();

    return () => {
      cancelled = true;
      setIsDecoding(false);
    };
  }, [stream, loaded, loadedJa, language, filterFreq, filterWidth, audioBufferRef]);

  return { loaded, loadedJa, currentSegments, currentSegmentsJa, isDecoding };
};
