import { useState, useRef, useCallback, useEffect } from "react";
import { Box, Button, Flex, Stack, TextInput, Slider, Text, Group, SegmentedControl, Modal, ActionIcon, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { MorseEncoder } from "../core/morseEncoder";
import { presetManager } from "../core/presetManager";

export const Encoder = () => {
  const [text, setText] = useState<string>("CQ CQ DE BH4DUF");
  const [wpm, setWpm] = useState<number>(20);
  const [farnsworth, setFarnsworth] = useState<number>(1.0);
  const [toneHz, setToneHz] = useState<number>(700);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);
  const [selectedCallsign, setSelectedCallsign] = useState<string>(presetManager.getSelectedCallsignValue());
  const [callsigns, setCallsigns] = useState(presetManager.getCallsigns());
  const [addModalOpened, { open: openAddModal, close: closeAddModal }] = useDisclosure(false);
  const [newCallsign, setNewCallsign] = useState<string>("");

  const encoderRef = useRef<MorseEncoder>(new MorseEncoder());
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Update encoder config when settings change
  useEffect(() => {
    encoderRef.current.setConfig({ wpm, farnsworth, toneHz });
  }, [wpm, farnsworth, toneHz]);

  // Sync callsign selection with preset manager
  useEffect(() => {
    const pm = presetManager;
    pm.selectCallsign(pm.getCallsigns().find(c => c.callsign === selectedCallsign)?.id || "");
  }, [selectedCallsign]);

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playMorse = useCallback(async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    try {
      // Create or resume AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const audioContext = audioContextRef.current;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // Create gain node if needed
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContext.createGain();
        gainNodeRef.current.connect(audioContext.destination);
      }
      gainNodeRef.current.gain.value = volume;

      // Generate Morse audio
      const audioBuffer = encoderRef.current.generateAudio(text);
      if (audioBuffer.length === 0) {
        return;
      }

      // Convert Float32Array to AudioBuffer
      const audioBufferNode = audioContext.createBuffer(
        1, // mono
        audioBuffer.length,
        audioContext.sampleRate,
      );
      audioBufferNode.copyToChannel(audioBuffer, 0);

      // Create and connect source
      const source = audioContext.createBufferSource();
      source.buffer = audioBufferNode;
      source.connect(gainNodeRef.current);
      sourceNodeRef.current = source;

      setIsPlaying(true);

      source.onended = () => {
        setIsPlaying(false);
        sourceNodeRef.current = null;
      };

      source.start(0);
    } catch (error) {
      console.error("Error playing Morse audio:", error);
      setIsPlaying(false);
    }
  }, [text, volume, isPlaying, stopAudio]);

  const handleAddCallsign = () => {
    if (newCallsign.trim()) {
      presetManager.addCallsign(newCallsign.trim());
      setCallsigns(presetManager.getCallsigns());
      setSelectedCallsign(newCallsign.toUpperCase().trim());
      setNewCallsign("");
      closeAddModal();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopAudio]);

  // Get Morse preview
  const preview = encoderRef.current.getPreview(text);

  return (
    <Stack gap="md" p="md" style={{ background: "var(--mantine-color-dark-8)", borderRadius: 8 }}>
      {/* Header with Callsign Selector */}
      <Flex justify="space-between" align="center" wrap="wrap" gap="sm">
        <Text size="lg" fw={600} c="white">
          ENCODER
        </Text>
        <Group gap="xs">
          <Text size="sm" c="dimmed">CALLSIGN:</Text>
          <SegmentedControl
            size="xs"
            value={selectedCallsign}
            onChange={setSelectedCallsign}
            data={callsigns.map(c => ({
              label: c.callsign,
              value: c.callsign,
            }))}
            styles={{
              root: { background: "var(--mantine-color-dark-7)" },
            }}
          />
          <Tooltip label="Add new callsign">
            <ActionIcon variant="subtle" color="gray" onClick={openAddModal} size="sm">
              <Text size="lg">+</Text>
            </ActionIcon>
          </Tooltip>
        </Group>
      </Flex>

      {/* Text Input with Callsign Quick Insert */}
      <TextInput
        label="TEXT"
        placeholder="Enter text to encode..."
        value={text}
        onChange={(e) => setText(e.currentTarget.value.toUpperCase())}
        disabled={isPlaying}
        styles={{
          input: {
            fontFamily: "monospace",
            fontSize: "16px",
          },
        }}
        rightSection={
          <Tooltip label="Insert callsign">
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => setText(text + selectedCallsign)}
              disabled={isPlaying}
              size="sm"
            >
              <Text size="xs">DE</Text>
            </ActionIcon>
          </Tooltip>
        }
        rightSectionWidth={40}
      />

      {/* Morse Preview */}
      {preview.morse && (
        <Box
          p="xs"
          style={{
            background: "var(--mantine-color-dark-7)",
            borderRadius: 4,
            fontFamily: "monospace",
            fontSize: "14px",
            color: "var(--mantine-color-gray-4)",
            wordBreak: "break-all",
          }}
        >
          <Text size="xs" c="dimmed" mb={4}>
            MORSE: {preview.morse}
          </Text>
          <Text size="xs" c="dimmed">
            Duration: {preview.duration.toFixed(1)}s | Est. WPM: {preview.wpm}
          </Text>
        </Box>
      )}

      {/* Speed Control */}
      <Box>
        <Group justify="space-between" mb={4}>
          <Text size="sm" c="dimmed">
            WPM
          </Text>
          <Text size="sm" c="white">
            {wpm}
          </Text>
        </Group>
        <Slider
          value={wpm}
          onChange={setWpm}
          min={5}
          max={50}
          step={1}
          marks={[
            { value: 5, label: "5" },
            { value: 20, label: "20" },
            { value: 35, label: "35" },
            { value: 50, label: "50" },
          ]}
          disabled={isPlaying}
          color="indigo"
        />
      </Box>

      {/* Farnsworth Spacing */}
      <Box>
        <Group justify="space-between" mb={4}>
          <Text size="sm" c="dimmed">
            CHAR SPACING
          </Text>
          <Text size="sm" c="white">
            {farnsworth.toFixed(1)}x
          </Text>
        </Group>
        <Slider
          value={farnsworth}
          onChange={setFarnsworth}
          min={1.0}
          max={4.0}
          step={0.1}
          marks={[
            { value: 1.0, label: "1.0" },
            { value: 2.5, label: "2.5" },
            { value: 4.0, label: "4.0" },
          ]}
          disabled={isPlaying}
          color="cyan"
        />
      </Box>

      {/* Tone Frequency */}
      <Box>
        <Group justify="space-between" mb={4}>
          <Text size="sm" c="dimmed">
            TONE
          </Text>
          <Text size="sm" c="white">
            {toneHz} Hz
          </Text>
        </Group>
        <Slider
          value={toneHz}
          onChange={setToneHz}
          min={400}
          max={1000}
          step={50}
          marks={[
            { value: 400, label: "400" },
            { value: 700, label: "700" },
            { value: 1000, label: "1000" },
          ]}
          disabled={isPlaying}
          color="teal"
        />
      </Box>

      {/* Volume */}
      <Box>
        <Group justify="space-between" mb={4}>
          <Text size="sm" c="dimmed">
            VOLUME
          </Text>
          <Text size="sm" c="white">
            {Math.round(volume * 100)}%
          </Text>
        </Group>
        <Slider
          value={volume}
          onChange={setVolume}
          min={0}
          max={1}
          step={0.1}
          disabled={isPlaying}
          color="gray"
        />
      </Box>

      {/* Play Controls */}
      <Flex gap="md" mt="sm">
        <Button
          flex={1}
          size="lg"
          color={isPlaying ? "red" : "indigo"}
          onClick={playMorse}
          variant={isPlaying ? "filled" : "outline"}
        >
          {isPlaying ? "■ STOP" : "▶ PLAY"}
        </Button>
      </Flex>

      {/* Add Callsign Modal */}
      <Modal opened={addModalOpened} onClose={closeAddModal} title="Add Callsign" centered>
        <Stack>
          <TextInput
            label="Callsign"
            placeholder="e.g., BH4DUF"
            value={newCallsign}
            onChange={(e) => setNewCallsign(e.currentTarget.value.toUpperCase())}
            autoFocus
          />
          <Flex gap="sm" justify="flex-end">
            <Button variant="outline" onClick={closeAddModal}>Cancel</Button>
            <Button onClick={handleAddCallsign} disabled={!newCallsign.trim()}>Add</Button>
          </Flex>
        </Stack>
      </Modal>
    </Stack>
  );
};
