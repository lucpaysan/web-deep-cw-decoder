/**
 * Bayesian Decoder Web Worker
 * Runs the Bayesian CW decoder in a separate thread
 */

import { BayesianDecoder } from "../core/bayesianDecoder";
import type { BayesianDecodeResult } from "../core/bayesianDecoder";

interface WorkerRequest {
  id: number;
  type: "init" | "decode" | "reset";
  audioBuffer?: Float32Array;
  sampleRate?: number;
}

interface WorkerResponse {
  id: number;
  type: "ready" | "result" | "error";
  result?: BayesianDecodeResult;
  error?: string;
}

// Decoder instance (per-worker)
const decoder = new BayesianDecoder();

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  switch (request.type) {
    case "init":
      decoder.reset();
      respond({ id: request.id, type: "ready" });
      break;

    case "decode":
      if (!request.audioBuffer) {
        respond({ id: request.id, type: "error", error: "No audio buffer provided" });
        return;
      }
      try {
        const result = decoder.processAudio(
          request.audioBuffer,
          request.sampleRate || 3200,
        );
        respond({ id: request.id, type: "result", result });
      } catch (error) {
        respond({
          id: request.id,
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
      break;

    case "reset":
      decoder.reset();
      respond({ id: request.id, type: "ready" });
      break;
  }
};

function respond(response: WorkerResponse) {
  self.postMessage(response);
}

// Signal ready
self.postMessage({ id: -1, type: "ready" });
