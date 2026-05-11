"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { FilterList, NavArrowRight, NavArrowLeft, ArrowUpRight, EditPencil, Check, OpenNewWindow, Lock } from "iconoir-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// ─── Types & config ──────────────────────────────────────────────────────────

export type Statut = "Validé" | "En attente" | "CBAM" | "Conflit";

export const statutConfig: Record<Statut, { bg: string; color: string }> = {
  "Validé":     { bg: "rgba(22,163,74,0.08)",  color: "#15803d" },
  "En attente": { bg: "rgba(217,119,6,0.09)",  color: "#b45309" },
  "CBAM":       { bg: "rgba(234,88,12,0.08)",  color: "#c2410c" },
  "Conflit":    { bg: "rgba(220,38,38,0.08)",  color: "#dc2626" },
};

export interface Dossier {
  ref: string;
  importateur: string;
  statut: Statut;
  flags: string[];
}

export const ALL_DOSSIERS: Dossier[] = [
  { ref: "#2026-0184", importateur: "Dupont Métaux SARL",            statut: "Validé",     flags: ["BTI"] },
  { ref: "#2026-0183", importateur: "Acier Normandie SAS",           statut: "En attente", flags: [] },
  { ref: "#2026-0182", importateur: "Import Express Lyon",           statut: "CBAM",       flags: ["CBAM", "EUR.1"] },
  { ref: "#2026-0181", importateur: "Plastiques Réunis SARL",        statut: "Conflit",    flags: [] },
  { ref: "#2026-0180", importateur: "Métal Service Rhône",           statut: "Validé",     flags: ["BTI"] },
  { ref: "#2026-0179", importateur: "Électro Import Bretagne",       statut: "En attente", flags: ["CBAM"] },
  { ref: "#2026-0178", importateur: "Transports Pellerin & Fils",    statut: "Validé",     flags: [] },
  { ref: "#2026-0177", importateur: "Acier Atlantique EURL",         statut: "CBAM",       flags: ["EUR.1"] },
  { ref: "#2026-0176", importateur: "Textile Horizon SAS",           statut: "Validé",     flags: [] },
  { ref: "#2026-0175", importateur: "Chimie Provence SARL",          statut: "En attente", flags: ["BTI"] },
  { ref: "#2026-0174", importateur: "Bureau Import SARL",            statut: "Validé",     flags: [] },
  { ref: "#2026-0173", importateur: "Équipements Est SAS",           statut: "CBAM",       flags: ["CBAM"] },
  { ref: "#2026-0172", importateur: "Bois & Matériaux EURL",         statut: "Conflit",    flags: [] },
  { ref: "#2026-0171", importateur: "Agro-Import Sud SARL",          statut: "Validé",     flags: [] },
  { ref: "#2026-0170", importateur: "Fonderie du Nord SAS",          statut: "En attente", flags: ["EUR.1"] },
  { ref: "#2026-0169", importateur: "Négoce Méditerranée EURL",      statut: "Validé",     flags: ["BTI"] },
  { ref: "#2026-0168", importateur: "Pièces Auto Import SA",         statut: "CBAM",       flags: ["CBAM", "BTI"] },
  { ref: "#2026-0167", importateur: "Logistique Garonne SARL",       statut: "Validé",     flags: [] },
  { ref: "#2026-0166", importateur: "Groupe Ferraille Ouest",        statut: "Conflit",    flags: ["EUR.1"] },
  { ref: "#2026-0165", importateur: "Packaging Premium SAS",         statut: "En attente", flags: [] },
  { ref: "#2026-0164", importateur: "Matières Premières Alsace",     statut: "Validé",     flags: [] },
  { ref: "#2026-0163", importateur: "Électronique Grand Est SARL",   statut: "En attente", flags: ["CBAM"] },
  { ref: "#2026-0162", importateur: "Chaudronnerie Bourgogne SAS",   statut: "CBAM",       flags: [] },
  { ref: "#2026-0161", importateur: "Visserie & Fixations Rhône",    statut: "Validé",     flags: ["BTI"] },
  { ref: "#2026-0160", importateur: "France Import Céramique",       statut: "Validé",     flags: [] },
  { ref: "#2026-0159", importateur: "Pneumatiques Atlantique SARL",  statut: "Conflit",    flags: [] },
  { ref: "#2026-0158", importateur: "Industries Légères du Centre",  statut: "En attente", flags: ["EUR.1"] },
  { ref: "#2026-0157", importateur: "Dupont Métaux SARL",            statut: "Validé",     flags: [] },
  { ref: "#2026-0156", importateur: "Acier Normandie SAS",           statut: "CBAM",       flags: ["CBAM"] },
  { ref: "#2026-0155", importateur: "Métal Service Rhône",           statut: "Validé",     flags: ["BTI", "EUR.1"] },
  { ref: "#2026-0154", importateur: "Composants Méca Paris SAS",     statut: "En attente", flags: [] },
  { ref: "#2026-0153", importateur: "Thermoformage Aquitaine EURL",  statut: "Validé",     flags: [] },
  { ref: "#2026-0152", importateur: "Import Express Lyon",           statut: "CBAM",       flags: ["EUR.1"] },
  { ref: "#2026-0151", importateur: "Distributeur Pro Lille SARL",   statut: "Conflit",    flags: [] },
  { ref: "#2026-0150", importateur: "Acier Atlantique EURL",         statut: "Validé",     flags: ["BTI"] },
];

const dossiers = ALL_DOSSIERS.slice(0, 8);
const COLS = "150px 1fr 130px 100px 24px";

// ─── Row state ────────────────────────────────────────────────────────────────

type RowStatus = "à valider" | "validé" | "info manquante";

interface RowState {
  label: string;
  value: string;
  status: RowStatus;
  missingNote?: string;
}

const INFO_GENERALE_BY_STATUT: Record<Statut, RowState[]> = {
  "Validé": [
    { label: "Régime douanier", value: "40 — Mise en libre pratique", status: "validé" },
    { label: "EORI",            value: "FR123456789012",              status: "validé" },
    { label: "Incoterm",        value: "DAP",                         status: "validé" },
    { label: "Pays d'origine",  value: "Allemagne",                   status: "validé" },
  ],
  "En attente": [
    { label: "Régime douanier", value: "40 — Mise en libre pratique", status: "validé" },
    { label: "EORI",            value: "FR987654321098",              status: "à valider" },
    { label: "Incoterm",        value: "CIF",                         status: "à valider" },
    { label: "Pays d'origine",  value: "Chine",                       status: "validé" },
  ],
  "CBAM": [
    { label: "Régime douanier", value: "40 — Mise en libre pratique", status: "validé" },
    { label: "EORI",            value: "FR543210987654",              status: "validé" },
    { label: "Incoterm",        value: "FOB",                         status: "validé" },
    { label: "Pays d'origine",  value: "Inde",                        status: "à valider" },
  ],
  "Conflit": [
    { label: "Régime douanier", value: "40 — Mise en libre pratique", status: "validé" },
    { label: "EORI",            value: "FR111222333444",              status: "validé" },
    { label: "Incoterm",        value: "EXW",                         status: "à valider" },
    { label: "Pays d'origine",  value: "",                            status: "info manquante", missingNote: "pays d'origine exact de la marchandise" },
  ],
};

const DONNEES_EXTRAITES_BY_STATUT: Record<Statut, RowState[]> = {
  "Validé": [
    { label: "Valeur déclarée", value: "48 200 €", status: "validé" },
    { label: "Poids brut",      value: "1 840 kg", status: "validé" },
    { label: "Devise",          value: "EUR",       status: "validé" },
    { label: "Nombre de colis", value: "24",        status: "validé" },
  ],
  "En attente": [
    { label: "Valeur déclarée", value: "112 400 €", status: "à valider" },
    { label: "Poids brut",      value: "3 200 kg",  status: "validé" },
    { label: "Devise",          value: "USD",        status: "à valider" },
    { label: "Nombre de colis", value: "48",         status: "validé" },
  ],
  "CBAM": [
    { label: "Valeur déclarée",   value: "67 800 €", status: "validé" },
    { label: "Poids brut",        value: "2 400 kg", status: "validé" },
    { label: "Émissions CO₂",     value: "",          status: "info manquante", missingNote: "taux d'émissions CO₂ intégrées en tCO₂e/t" },
    { label: "Prix carbone payé", value: "",          status: "info manquante", missingNote: "prix carbone payé dans le pays d'origine" },
  ],
  "Conflit": [
    { label: "Valeur déclarée", value: "28 500 €", status: "à valider" },
    { label: "Poids brut",      value: "980 kg",   status: "validé" },
    { label: "Devise",          value: "GBP",       status: "à valider" },
    { label: "Nombre de colis", value: "12",        status: "validé" },
  ],
};

// ─── Drawer helpers ───────────────────────────────────────────────────────────

type SourceStatus = "validé" | "à valider" | "info";

const sourceStatusConfig: Record<SourceStatus, { dot: string; label: string; bg: string; color: string }> = {
  "validé":     { dot: "#15803d", label: "Validé",     bg: "rgba(22,163,74,0.08)",  color: "#15803d" },
  "à valider":  { dot: "#b45309", label: "À valider",  bg: "rgba(217,119,6,0.09)",  color: "#b45309" },
  "info":       { dot: "#2563eb", label: "Info",       bg: "rgba(37,99,235,0.07)",  color: "#2563eb" },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13.5px] font-semibold tracking-tight mb-3" style={{ color: "var(--color-text)" }}>
      {children}
    </p>
  );
}

function SourceStatusBadge({ status }: { status: SourceStatus }) {
  const cfg = sourceStatusConfig[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-0.5 rounded-md font-medium shrink-0"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="size-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function DataRow({
  row,
  onValidate,
  onValueChange,
  onFillMissing,
  onRequestInfo,
  importateurName,
  isLast,
}: {
  row: RowState;
  onValidate: () => void;
  onValueChange: (val: string) => void;
  onFillMissing: (val: string) => void;
  onRequestInfo: () => void;
  importateurName: string;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [tempValue, setTempValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      if (row.status === "info manquante") setTempValue("");
      inputRef.current?.focus();
    }
  }, [editing, row.status]);

  function commit() {
    if (row.status === "info manquante" && tempValue.trim()) {
      onFillMissing(tempValue.trim());
    }
    setEditing(false);
    setTempValue("");
  }

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid var(--color-border)" }}>
      {/* Row */}
      <div
        className="flex items-center gap-3 py-2.5"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className="text-[13px] shrink-0 w-36" style={{ color: "var(--color-text-secondary)" }}>
          {row.label}
        </span>

        {/* Value area */}
        {editing ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              ref={inputRef}
              value={row.status === "info manquante" ? tempValue : row.value}
              onChange={(e) => {
                if (row.status === "info manquante") setTempValue(e.target.value);
                else onValueChange(e.target.value);
              }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") commit(); }}
              onBlur={commit}
              placeholder={row.status === "info manquante" ? "Saisir la valeur…" : undefined}
              className="text-[13px] bg-transparent outline-none border-b flex-1 min-w-0"
              style={{ color: "var(--color-text)", borderColor: "var(--color-primary)", caretColor: "var(--color-primary)" }}
            />
            <button onMouseDown={(e) => { e.preventDefault(); commit(); }} style={{ color: "var(--color-primary)" }}>
              <Check width={12} height={12} strokeWidth={2.25} />
            </button>
          </div>
        ) : row.status === "info manquante" ? (
          <button className="flex items-center gap-1.5 flex-1 text-left" onClick={() => setEditing(true)}>
            <span className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>—</span>
            <EditPencil width={11} height={11} strokeWidth={1.5} style={{ color: "var(--color-text-tertiary)", opacity: hovered ? 1 : 0, transition: "opacity 75ms ease", flexShrink: 0 }} />
          </button>
        ) : (
          <button className="flex items-center gap-1.5 flex-1 text-left" onClick={() => setEditing(true)}>
            <span className="text-[13px]" style={{ color: "var(--color-text)" }}>{row.value}</span>
            <EditPencil width={11} height={11} strokeWidth={1.5} style={{ color: "var(--color-text-tertiary)", opacity: hovered ? 1 : 0, transition: "opacity 75ms ease", flexShrink: 0 }} />
          </button>
        )}

        {/* Status + action */}
        {row.status === "validé" && (
          <Check width={13} height={13} strokeWidth={2.25} style={{ color: "#15803d", flexShrink: 0 }} />
        )}
        {row.status === "à valider" && !editing && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: "#b45309" }}>
              <span className="size-1.5 rounded-full shrink-0" style={{ background: "#b45309" }} />
              À valider
            </span>
            <button
              onClick={onValidate}
              className="text-[12px] font-medium px-2 py-0.5 rounded-md transition-colors duration-75"
              style={{ background: "rgba(217,119,6,0.09)", color: "#b45309" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(217,119,6,0.16)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(217,119,6,0.09)"; }}
            >
              Valider
            </button>
          </div>
        )}
        {row.status === "info manquante" && (
          <span className="flex items-center gap-1.5 text-[12px] font-medium shrink-0" style={{ color: "#dc2626" }}>
            <span className="size-2 rounded-full shrink-0" style={{ background: "#dc2626" }} />
            Info manquante
          </span>
        )}
      </div>

      {/* Info manquante encart */}
      {row.status === "info manquante" && row.missingNote && (
        <div
          className="rounded-lg px-4 py-3.5 mb-3"
          style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.1)" }}
        >
          <p className="text-[12.5px] leading-snug mb-3" style={{ color: "var(--color-text-secondary)" }}>
            Pour finaliser cette ligne, demander à l'importateur :{" "}
            <span style={{ color: "var(--color-text)", fontWeight: 500 }}>{row.missingNote}.</span>
          </p>
          <button
            onClick={onRequestInfo}
            className="text-[12px] font-medium px-3 py-1.5 rounded-md transition-colors duration-75"
            style={{ background: "rgba(13,15,20,0.06)", color: "var(--color-text)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.10)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.06)"; }}
          >
            Envoyer la demande à {importateurName}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Email modal ──────────────────────────────────────────────────────────────

function EmailModal({
  open,
  onOpenChange,
  missingNote,
  importateur,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  missingNote: string;
  importateur: string;
}) {
  const defaultBody = `Bonjour,\n\nAfin de finaliser votre dossier d'importation, nous avons besoin des informations suivantes :\n\n• ${missingNote}\n\nMerci de nous communiquer ces éléments dans les meilleurs délais.\n\nCordialement`;
  const [subject, setSubject] = useState("Demande d'information complémentaire — Dossier en cours");
  const [body, setBody] = useState(defaultBody);

  useEffect(() => {
    if (open) setBody(defaultBody);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[520px] p-0 overflow-hidden gap-0"
        style={{ background: "#FFFFFF", border: "1px solid var(--color-border)", boxShadow: "0 8px 40px rgba(13,15,20,0.09)" }}
      >
        <DialogTitle className="sr-only">Demande à l'importateur</DialogTitle>

        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-[14px] font-medium tracking-tight" style={{ color: "var(--color-text)" }}>
            Demande à l'importateur
          </span>
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center size-7 rounded-lg transition-colors duration-75"
            style={{ border: "1px solid var(--color-border-strong)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.04)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <span className="text-[12px] leading-none" style={{ color: "var(--color-text-tertiary)" }}>✕</span>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* To — read-only */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>À</label>
            <div
              className="flex items-center h-9 px-3 rounded-lg text-[13px]"
              style={{ border: "1px solid var(--color-border)", background: "rgba(13,15,20,0.02)", color: "var(--color-text-secondary)" }}
            >
              {importateur.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "")}@contact.fr
            </div>
          </div>

          {/* Subject */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>Objet</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-9 px-3 rounded-lg text-[13px] outline-none"
              style={{ border: "1px solid var(--color-border-strong)", color: "var(--color-text)", background: "transparent", caretColor: "var(--color-primary)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; }}
            />
          </div>

          {/* Body */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              className="px-3 py-2.5 rounded-lg text-[13px] outline-none resize-none leading-relaxed"
              style={{ border: "1px solid var(--color-border-strong)", color: "var(--color-text)", background: "transparent", caretColor: "var(--color-primary)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => onOpenChange(false)}
              className="text-[13px] transition-colors duration-75"
              style={{ color: "var(--color-text-tertiary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
            >
              Annuler
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 rounded-lg text-[13px] font-medium transition-opacity duration-75"
              style={{ background: "var(--color-primary)", color: "#0A0A0A" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              Envoyer la demande
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Source panel ─────────────────────────────────────────────────────────────

const SIMILAR_DOSSIERS = [
  { ref: "#2026-0147", importateur: "Dupont Métaux SARL",      date: "12 avr. 2026" },
  { ref: "#2026-0133", importateur: "Acier Normandie SAS",     date: "28 mars 2026" },
  { ref: "#2026-0119", importateur: "Métal Service Rhône",     date: "14 mars 2026" },
  { ref: "#2026-0104", importateur: "Équipements Est SAS",     date: "01 mars 2026" },
];

function SourcePanel({ onBack, iaValidated, onValidateIA }: { onBack: () => void; iaValidated: boolean; onValidateIA: () => void }) {
  const [showCorrection, setShowCorrection] = useState(false);
  const [correction, setCorrection] = useState("");
  const [correctionSent, setCorrectionSent] = useState(false);

  function submitCorrection() {
    setShowCorrection(false);
    setCorrection("");
    setCorrectionSent(true);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div
        className="flex items-center gap-2 px-6 py-4 border-b shrink-0"
        style={{ borderColor: "var(--color-border)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] transition-colors duration-75"
          style={{ color: "var(--color-text-secondary)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
        >
          <NavArrowLeft width={14} height={14} strokeWidth={2} />
          Classification SH
        </button>
        <span className="ml-auto text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
          8708.99.97
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-10">

        {/* Section 1 — Dossiers similaires */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Dossiers similaires</SectionLabel>
            <SourceStatusBadge status="validé" />
          </div>
          <p className="text-[12.5px] mb-3" style={{ color: "var(--color-text-tertiary)" }}>
            47 dossiers avec le même code SH pour ce client ou ce type de marchandise.
          </p>
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--color-border)" }}
          >
            {SIMILAR_DOSSIERS.map((d, i) => (
              <div
                key={d.ref}
                className="flex items-center justify-between px-4 py-2.5"
                style={{
                  borderBottom: i < SIMILAR_DOSSIERS.length - 1 ? "1px solid var(--color-border)" : "none",
                  background: "#FAFAFA",
                }}
              >
                <span className="text-[12.5px]" style={{ color: "var(--color-text-secondary)" }}>
                  {d.ref}
                </span>
                <span className="text-[12.5px] truncate mx-4 flex-1" style={{ color: "var(--color-text)" }}>
                  {d.importateur}
                </span>
                <span className="text-[12px] shrink-0" style={{ color: "var(--color-text-tertiary)" }}>
                  {d.date}
                </span>
              </div>
            ))}
            <div
              className="flex items-center justify-center px-4 py-2.5 text-[12px]"
              style={{ color: "var(--color-text-tertiary)", background: "#FAFAFA", borderTop: "1px solid var(--color-border)" }}
            >
              +43 autres dossiers similaires
            </div>
          </div>
        </div>

        {/* Section 2 — Note tarifaire (lecture seule) */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-1">
            <SectionLabel>Note tarifaire SH 8708.99.97</SectionLabel>
            <SourceStatusBadge status="info" />
          </div>
          <div className="flex items-center gap-1.5 mb-3">
            <Lock width={11} height={11} strokeWidth={1.75} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
            <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
              Source réglementaire · Lecture seule
            </span>
          </div>
          <div className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            <p>
              Cette position tarifaire couvre les <strong style={{ color: "var(--color-text)", fontWeight: 500 }}>parties et accessoires des véhicules automobiles</strong> des nos 87.01 à 87.05, y compris les pièces de suspension, de direction et de freinage, à l'exclusion des pièces d'usage général.
            </p>
            <p className="mt-2">
              Règlement (CEE) nº 2658/87 du Conseil — version consolidée 2026, Annexe I, Section XVII, Chapitre 87, Note 3.
            </p>
          </div>
        </div>

        {/* Section 3 — Raisonnement IA */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <SectionLabel>Raisonnement IA</SectionLabel>
            {iaValidated
              ? <SourceStatusBadge status="validé" />
              : <SourceStatusBadge status="à valider" />
            }
          </div>
          <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--color-text-secondary)" }}>
            Le modèle a sélectionné <strong style={{ color: "var(--color-text)", fontWeight: 500 }}>8708.99.97</strong> à partir de la description de la marchandise ("pièces automobiles — suspension avant") et de 47 précédents de ce client. Taux de confiance : <strong style={{ color: "var(--color-text)", fontWeight: 500 }}>94 %</strong>. La sous-position .97 a été retenue car les pièces ne sont pas nommément visées aux positions 8708.10–8708.94.
          </p>

          {!iaValidated && (
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={onValidateIA}
                  className="flex items-center gap-2 h-8 px-3 rounded-lg text-[13px] font-medium transition-colors duration-75"
                  style={{ background: "rgba(22,163,74,0.08)", color: "#15803d" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(22,163,74,0.14)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(22,163,74,0.08)"; }}
                >
                  <Check width={13} height={13} strokeWidth={2.25} />
                  Valider ce raisonnement
                </button>
                <button
                  onClick={() => setShowCorrection((v) => !v)}
                  className="flex items-center gap-2 h-8 px-3 rounded-lg text-[13px] font-medium transition-colors duration-75"
                  style={{
                    background: showCorrection ? "rgba(13,15,20,0.07)" : "rgba(13,15,20,0.04)",
                    color: "var(--color-text-secondary)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(13,15,20,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = showCorrection ? "rgba(13,15,20,0.07)" : "rgba(13,15,20,0.04)"; }}
                >
                  Affiner / corriger l'IA
                </button>
              </div>

              {showCorrection && (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={correction}
                    onChange={(e) => setCorrection(e.target.value)}
                    rows={4}
                    placeholder="Décrivez les corrections ou le contexte supplémentaire à apporter au raisonnement..."
                    className="px-3 py-2.5 rounded-lg text-[13px] outline-none resize-none leading-relaxed"
                    style={{
                      border: "1px solid var(--color-border-strong)",
                      color: "var(--color-text)",
                      background: "transparent",
                      caretColor: "var(--color-primary)",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; }}
                  />
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => { setShowCorrection(false); setCorrection(""); }}
                      className="text-[12.5px] transition-colors duration-75"
                      style={{ color: "var(--color-text-tertiary)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={submitCorrection}
                      disabled={!correction.trim()}
                      className="h-8 px-3 rounded-lg text-[12.5px] font-medium transition-opacity duration-75"
                      style={{
                        background: correction.trim() ? "var(--color-text)" : "rgba(13,15,20,0.06)",
                        color: correction.trim() ? "#FFFFFF" : "var(--color-text-tertiary)",
                        cursor: correction.trim() ? "pointer" : "not-allowed",
                      }}
                    >
                      Soumettre la correction
                    </button>
                  </div>
                </div>
              )}

              {correctionSent && !showCorrection && (
                <p className="text-[12.5px]" style={{ color: "var(--color-text-tertiary)" }}>
                  Correction envoyée · L'IA prendra en compte vos retours au prochain traitement.
                </p>
              )}
            </div>
          )}
          {iaValidated && (
            <div className="flex items-center gap-2 mb-6">
              <Check width={13} height={13} strokeWidth={2.25} style={{ color: "#15803d" }} />
              <span className="text-[13px]" style={{ color: "#15803d" }}>Raisonnement validé</span>
            </div>
          )}

          <p className="text-[13.5px] font-semibold tracking-tight mb-2.5" style={{ color: "var(--color-text)" }}>
            Sources web consultées
          </p>
          <div className="flex flex-col gap-1.5">
            {[
              "Règlement UE 2658/87 · Nomenclature combinée 2026",
              "Base tarifaire TARIC — consultation du 08 mai 2026",
              "Avis de classement de la Commission européenne · 12/03/2026",
            ].map((src) => (
              <button
                key={src}
                className="flex items-center gap-2 text-[12.5px] text-left transition-colors duration-75 w-fit"
                style={{ color: "var(--color-text-secondary)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
              >
                <OpenNewWindow width={11} height={11} strokeWidth={1.75} style={{ flexShrink: 0, color: "var(--color-text-tertiary)" }} />
                {src}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Drawer ──────────────────────────────────────────────────────────────────

export function DossierDrawer({
  dossier,
  open,
  onOpenChange,
}: {
  dossier: Dossier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const badge = dossier ? statutConfig[dossier.statut] : null;
  const [showSource, setShowSource] = useState(false);
  const [infoRows, setInfoRows] = useState<RowState[]>([]);
  const [dataRows, setDataRows] = useState<RowState[]>([]);
  const [iaValidated, setIaValidated] = useState(false);
  const [emailRow, setEmailRow] = useState<RowState | null>(null);

  const allValidated =
    infoRows.length > 0 &&
    infoRows.every((r) => r.status === "validé") &&
    dataRows.every((r) => r.status === "validé");

  // Load statut-specific data whenever the opened dossier changes
  useEffect(() => {
    if (dossier) {
      setInfoRows(INFO_GENERALE_BY_STATUT[dossier.statut]);
      setDataRows(DONNEES_EXTRAITES_BY_STATUT[dossier.statut]);
      setShowSource(false);
      setIaValidated(false);
      setEmailRow(null);
    }
  }, [dossier?.ref]);

  function validateRow(section: "info" | "data", idx: number) {
    const setter = section === "info" ? setInfoRows : setDataRows;
    setter((rows) => rows.map((r, i) => i === idx ? { ...r, status: "validé" } : r));
  }

  function updateValue(section: "info" | "data", idx: number, val: string) {
    const setter = section === "info" ? setInfoRows : setDataRows;
    setter((rows) => rows.map((r, i) => i === idx ? { ...r, value: val } : r));
  }

  function fillMissingRow(section: "info" | "data", idx: number, val: string) {
    const setter = section === "info" ? setInfoRows : setDataRows;
    setter((rows) => rows.map((r, i) => i === idx ? { ...r, value: val, status: "à valider" } : r));
  }

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="p-0 flex flex-col overflow-hidden gap-0"
        style={{ borderLeft: "1px solid var(--color-border)", background: "#FFFFFF", width: "50vw", maxWidth: "50vw" }}
      >
        <SheetTitle className="sr-only">{dossier?.ref ?? "Dossier"}</SheetTitle>

        {/* Fixed header */}
        <div className="px-6 pt-6 pb-5 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>{dossier?.ref}</span>
                {badge && (
                  <span className="inline-flex items-center text-[12px] px-2 py-0.5 rounded-md" style={{ background: badge.bg, color: badge.color }}>
                    {dossier?.statut}
                  </span>
                )}
              </div>
              <h2 className="text-[16px] font-semibold tracking-tight leading-snug" style={{ color: "var(--color-text)" }}>
                {dossier?.importateur}
              </h2>
              <p className="text-[13px] mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                Reçu le 08 mai 2026 · Traitement en cours
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="shrink-0 flex items-center justify-center size-7 rounded-lg transition-colors duration-75 mt-0.5"
              style={{ border: "1px solid var(--color-border-strong)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.04)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span className="text-[13px] leading-none" style={{ color: "var(--color-text-tertiary)" }}>✕</span>
            </button>
          </div>
        </div>

        {/* Sliding two-panel body */}
        <div className="flex-1 relative overflow-hidden">
          <div
            className="flex h-full"
            style={{
              width: "200%",
              transform: showSource ? "translateX(-50%)" : "translateX(0)",
              transition: "transform 200ms cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            {/* ── Panel 1: Dossier detail ── */}
            <div className="flex flex-col" style={{ width: "50%" }}>
              <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-10">

                {/* Classification SH */}
                <div>
                  <SectionLabel>Classification SH</SectionLabel>
                  <span className="text-[16px] font-semibold tracking-tight" style={{ color: "var(--color-text)" }}>
                    8708.99.97
                  </span>
                  <p className="text-[13px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
                    Pièces et accessoires pour véhicules automobiles
                  </p>
                  <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
                    <div className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full shrink-0" style={{ background: "#15803d" }} />
                      <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                        <span className="font-medium" style={{ color: "var(--color-text)" }}>47 dossiers similaires</span>
                        {" · "}Historique broker
                      </span>
                    </div>
                    <button
                      onClick={() => setShowSource(true)}
                      className="ml-auto flex items-center gap-1.5 text-[12.5px] font-medium transition-opacity duration-75 shrink-0"
                      style={{ color: "var(--color-primary)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    >
                      Voir la source
                      <ArrowUpRight width={13} height={13} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>

                {/* Informations générales */}
                <div>
                  <SectionLabel>Informations générales</SectionLabel>
                  {infoRows.map((row, i) => (
                    <DataRow
                      key={row.label}
                      row={row}
                      isLast={i === infoRows.length - 1}
                      importateurName={dossier?.importateur ?? ""}
                      onValidate={() => validateRow("info", i)}
                      onValueChange={(val) => updateValue("info", i, val)}
                      onFillMissing={(val) => fillMissingRow("info", i, val)}
                      onRequestInfo={() => setEmailRow(row)}
                    />
                  ))}
                </div>

                {/* Données extraites */}
                <div>
                  <SectionLabel>Données extraites</SectionLabel>
                  {dataRows.map((row, i) => (
                    <DataRow
                      key={row.label}
                      row={row}
                      isLast={i === dataRows.length - 1}
                      importateurName={dossier?.importateur ?? ""}
                      onValidate={() => validateRow("data", i)}
                      onValueChange={(val) => updateValue("data", i, val)}
                      onFillMissing={(val) => fillMissingRow("data", i, val)}
                      onRequestInfo={() => setEmailRow(row)}
                    />
                  ))}
                </div>

                {/* Documents joints */}
                <div>
                  <SectionLabel>Documents joints</SectionLabel>
                  <div className="flex flex-col gap-1.5">
                    {["facture-renault-2026-05.pdf", "packing-list.pdf", "certificat-eur1.pdf"].map((doc) => (
                      <button
                        key={doc}
                        className="text-left text-[12px] underline underline-offset-2 transition-colors duration-75 w-fit"
                        style={{ color: "var(--color-text-secondary)", textDecorationColor: "var(--color-border-strong)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; }}
                      >
                        {doc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contexte broker */}
                <div>
                  <SectionLabel>Contexte broker</SectionLabel>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    Client toujours en DAP, acier grade S355, origine Allemagne. Code vérifié 47 fois sur des envois similaires.
                  </p>
                </div>
              </div>

              {/* Sticky footer — Générer la déclaration */}
              <div className="px-6 py-4 border-t shrink-0" style={{ borderColor: "var(--color-border)" }}>
                {!allValidated && (
                  <p className="text-[12px] mb-3 text-center" style={{ color: "var(--color-text-tertiary)" }}>
                    {[...infoRows, ...dataRows].filter((r) => r.status !== "validé").length} ligne{[...infoRows, ...dataRows].filter((r) => r.status !== "validé").length > 1 ? "s" : ""} à valider avant de générer
                  </p>
                )}
                <button
                  disabled={!allValidated}
                  className="w-full h-10 rounded-lg text-[13.5px] font-medium transition-opacity duration-75"
                  style={{
                    background: allValidated ? "var(--color-primary)" : "rgba(13,15,20,0.06)",
                    color: allValidated ? "#0A0A0A" : "var(--color-text-tertiary)",
                    cursor: allValidated ? "pointer" : "not-allowed",
                  }}
                  onMouseEnter={(e) => { if (allValidated) e.currentTarget.style.opacity = "0.88"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  Générer la déclaration
                </button>
              </div>
            </div>

            {/* ── Panel 2: Source detail ── */}
            <div style={{ width: "50%" }}>
              <SourcePanel
                onBack={() => setShowSource(false)}
                iaValidated={iaValidated}
                onValidateIA={() => setIaValidated(true)}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>

    <EmailModal
      open={emailRow !== null}
      onOpenChange={(v) => { if (!v) setEmailRow(null); }}
      missingNote={emailRow?.missingNote ?? ""}
      importateur={dossier?.importateur ?? ""}
    />
    </>
  );
}

// ─── Main table ──────────────────────────────────────────────────────────────

export default function DossiersTable() {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);

  return (
    <>
      <div>
        <div
          className="rounded-xl overflow-hidden flex flex-col"
          style={{ background: "#FFFFFF", border: "1px solid var(--color-border)" }}
        >
          {/* Table header */}
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
            style={{ borderColor: "var(--color-border)" }}
          >
            {/* Left: title + count + filtrer */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium tracking-tight" style={{ color: "var(--color-text)" }}>
                  Dossiers récents
                </span>
                <span className="text-[12px] tabular-nums" style={{ color: "var(--color-text-tertiary)" }}>247</span>
              </div>
              <div className="w-px h-3.5" style={{ background: "var(--color-border-strong)" }} />
              <button
                className="flex items-center gap-1.5 text-[13px] transition-colors duration-75"
                style={{ color: "var(--color-text-secondary)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
              >
                <FilterList width={13} height={13} strokeWidth={1.5} style={{ color: "inherit" }} />
                Filtrer
              </button>
            </div>

            {/* Right: voir tout */}
            <button
              className="flex items-center gap-1 text-[13px] transition-colors duration-75"
              style={{ color: "var(--color-text-secondary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
            >
              Voir tout
              <ArrowUpRight width={12} height={12} strokeWidth={1.75} style={{ color: "inherit" }} />
            </button>
          </div>

          {/* Column headers */}
          <div
            className="grid items-center px-5 py-2 border-b shrink-0"
            style={{ gridTemplateColumns: COLS, borderColor: "var(--color-border)" }}
          >
            {["Référence", "Importateur", "Statut", "Flags", ""].map((col) => (
              <span key={col} className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>{col}</span>
            ))}
          </div>

          {/* Rows */}
          <div className="flex-1">
            {dossiers.map((d, i) => {
              const badge = statutConfig[d.statut];
              const isHovered = hoveredRow === d.ref;
              return (
                <div
                  key={d.ref}
                  className="grid items-center px-5 transition-colors duration-75 cursor-pointer"
                  style={{
                    gridTemplateColumns: COLS,
                    height: "40px",
                    background: isHovered ? "rgba(13,15,20,0.02)" : "transparent",
                    borderBottom: i < dossiers.length - 1 ? "1px solid var(--color-border)" : "none",
                  }}
                  onMouseEnter={() => setHoveredRow(d.ref)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => setSelectedDossier(d)}
                >
                  <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                    {d.ref}
                  </span>

                  <span className="text-[13.5px] truncate pr-4" style={{ color: "var(--color-text)" }}>
                    {d.importateur}
                  </span>

                  {/* Status badge — flex so it stays vertically centered */}
                  <div className="flex items-center">
                    <span
                      className="inline-flex items-center text-[12px] px-2 py-0.5 rounded-md"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {d.statut}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {d.flags.length === 0 ? (
                      <span style={{ color: "var(--color-text-tertiary)", fontSize: "13px" }}>—</span>
                    ) : (
                      d.flags.map((flag) => (
                        <span
                          key={flag}
                          className="text-[11.5px] px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(13,15,20,0.05)", color: "var(--color-text-secondary)" }}
                        >
                          {flag}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Row affordance */}
                  <div className="flex items-center justify-end">
                    <NavArrowRight
                      width={12}
                      height={12}
                      strokeWidth={1.75}
                      style={{
                        color: "var(--color-text-tertiary)",
                        opacity: isHovered ? 1 : 0,
                        transition: "opacity 75ms ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <Link
            href="/dossiers"
            className="flex items-center justify-center gap-1.5 py-3 border-t text-[13px] transition-colors duration-75"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-tertiary)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-tertiary)"; }}
          >
            Voir tout
            <ArrowUpRight width={12} height={12} strokeWidth={1.75} style={{ color: "inherit" }} />
          </Link>

        </div>
      </div>

      <DossierDrawer
        dossier={selectedDossier}
        open={selectedDossier !== null}
        onOpenChange={(open) => { if (!open) setSelectedDossier(null); }}
      />
    </>
  );
}
