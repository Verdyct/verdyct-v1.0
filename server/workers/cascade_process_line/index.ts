import { Inngest } from "inngest";
import type {
  CascadeInput,
  CascadeResult,
  Layer1Result,
  Layer2Result,
  Layer3Result,
} from "@verdyct/shared-types";

const inngest = new Inngest({ id: "verdyct" });

export const cascadeProcessLine = inngest.createFunction(
  {
    id: "cascade-process-line",
    name: "Cascade: process line",
    retries: 3,
  },
  [{ event: "dossier.lines_extracted" }],
  async ({ event, step, runId }): Promise<CascadeResult> => {
    const input = event.data as CascadeInput;

    function log(
      level: "info" | "warn" | "error",
      msg: string,
      extra?: Record<string, unknown>,
    ) {
      console.log(
        JSON.stringify({
          level,
          msg,
          worker: "cascade_process_line",
          correlation_id: runId,
          dossier_id: input.dossier_id,
          ligne_id: input.ligne_id,
          ...extra,
        }),
      );
    }

    log("info", "Cascade started", { broker_id: input.broker_id });

    // ── Layer 1 — Match historique ──────────────────────────────────────────
    // Callback return type is annotated explicitly so Inngest infers step.run<Layer1Result>
    // — without this, TypeScript narrows on the narrow stub literal and breaks the union check.
    const layer1 = await step.run("layer-1", async (): Promise<Layer1Result> => {
      log("info", "Layer 1 stub called");
      // Stub: always not-found so the cascade reaches L2 and L3 end-to-end
      // Real implementation: exact hash match → fuzzy same-client → fuzzy cross-client
      return { found: false, layer: 1 };
    });

    if (layer1.found && layer1.confidence >= 0.75) {
      log("info", "Cascade stopped at Layer 1", { confidence: layer1.confidence });
      return { stopped_at: 1, result: layer1 };
    }

    // ── Layer 2 — Référentiels publics + RAG ────────────────────────────────
    const layer2 = await step.run("layer-2", async (): Promise<Layer2Result> => {
      log("info", "Layer 2 stub called");
      // Stub: always not-found so the cascade reaches L3
      // Real implementation: EBTI vector search → TARIC coherence check
      return { found: false, layer: 2 };
    });

    if (layer2.found && layer2.confidence >= 0.80) {
      log("info", "Cascade stopped at Layer 2", { confidence: layer2.confidence });
      return { stopped_at: 2, result: layer2 };
    }

    // ── Layer 3 — Agent IA ──────────────────────────────────────────────────
    const layer3 = await step.run("layer-3", async (): Promise<Layer3Result> => {
      log("info", "Layer 3 stub called");
      // Stub: returns needs_human_input, no candidates
      // Real implementation: Mistral Large 2 agent loop (max 8 iterations)
      return {
        status: "needs_human_input",
        layer: 3,
        iterations: 0,
        summary_of_findings: "STUB — real agent not yet implemented",
        best_candidates: [],
      };
    });

    log("info", "Cascade complete at Layer 3", { status: layer3.status });

    return { stopped_at: 3, result: layer3 };
  },
);
