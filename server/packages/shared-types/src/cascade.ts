// ── Input ─────────────────────────────────────────────────────────────────────

export type CascadeInput = {
  broker_id: string;
  dossier_id: string;
  ligne_id: string;
  importateur_id: string | null;
  fournisseur_id: string | null;
  description_produit: string;
  pays_origine: string | null;   // ISO 3166-1 alpha-2
  valeur_unitaire: number | null;
  devise: string | null;          // ISO 4217
  unite_quantite: string | null;
  quantite: number | null;
};

// ── Layer 1 — Match historique ────────────────────────────────────────────────

export type Layer1Result =
  | {
      found: true;
      layer: 1;
      hs_code: string;
      regime: string;
      origine: string;
      confidence: number;
      source: {
        type: "exact_match" | "fuzzy_same_client" | "fuzzy_cross_client";
        matched_lignes_ids: string[];
        occurrences: number;
        acceptance_rate?: number;       // 0–1, only for exact_match with enough data
        most_recent_dossier_date: string;
        similarity?: number;            // for fuzzy types
        cross_client_count?: number;    // for fuzzy_cross_client
      };
      alternative_codes?: Array<{ code: string; occurrences: number }>;
    }
  | { found: false; layer: 1 };

// ── Layer 2 — Référentiels publics + RAG ──────────────────────────────────────

export type Layer2Result =
  | {
      found: true;
      layer: 2;
      hs_code: string;
      regime: string;
      origine: string;
      confidence: number;
      source: {
        type: "ebti_match";
        primary_bti: {
          id: string;
          description: string;
          reasoning: string;
          similarity: number;
          issuing_country: string;
        };
        alternatives: Array<{
          bti_id: string;
          hs_code: string;
          similarity: number;
        }>;
        taric_measures: Array<{
          measure_type: string;
          description: string;
          value: string;
        }>;
        flags: Array<"anti_dumping" | "quota" | "prohibition" | "origin_specific">;
      };
    }
  | { found: false; layer: 2 };

// ── Layer 3 — Agent IA ────────────────────────────────────────────────────────

export type Layer3Result =
  | {
      status: "submitted";
      layer: 3;
      hs_code: string;
      regime: string;
      origine: string;
      confidence: number; // capped at 0.85
      source: {
        type: "ai_agent";
        iterations: number;
        reasoning: string;
        tools_used: Array<{ tool: string; args: object; result_summary: string }>;
        sources_cited: Array<{ type: string; reference: string; description: string }>;
      };
    }
  | {
      status: "needs_clarification";
      layer: 3;
      target: "broker" | "importer";
      question: string;
      options?: string[];
      pending_email_draft_id?: string;
      iterations: number;
      best_candidates: Array<{
        hs_code: string;
        confidence_if_chosen: number;
        condition: string;
      }>;
    }
  | {
      status: "needs_human_input";
      layer: 3;
      iterations: number;
      summary_of_findings: string;
      best_candidates: Array<{ hs_code: string; pros: string; cons: string }>;
    };

// ── Cascade output ────────────────────────────────────────────────────────────

export type CascadeResult =
  | { stopped_at: 1; result: Extract<Layer1Result, { found: true }> }
  | { stopped_at: 2; result: Extract<Layer2Result, { found: true }> }
  | { stopped_at: 3; result: Layer3Result };
