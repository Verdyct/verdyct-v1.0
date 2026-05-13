"use client";

import { useState } from "react";
import { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, NavArrowDown, NavArrowLeft, NavArrowRight, MoreHoriz, Search, Xmark, ArrowUp } from "iconoir-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { IMPORTATEURS, type Importateur, type CbamType } from "@/lib/importateurs-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#7C6AF7", "#4A90D9", "#E67E22", "#27AE60", "#8E44AD",
  "#E74C3C", "#16A085", "#D35400", "#2980B9", "#1ABC9C",
  "#C0392B", "#F39C12",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const stopWords = /^(de|du|la|le|les|et|en|au|aux|sur|sous|par|des)$/i;
  const words = name.split(" ").filter(w => w.length > 1 && !stopWords.test(w));
  return words.slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

function formatValeur(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M€`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K€`;
  return `${v}€`;
}

const CBAM_LABEL: Record<CbamType, string> = {
  acier: "acier", alu: "alu", ciment: "ciment", engrais: "engrais",
};

const SORT_OPTIONS = [
  { value: "nom",      label: "Par nom" },
  { value: "volume",   label: "Par volume" },
  { value: "dossiers", label: "Par dossiers récents" },
  { value: "cbam",     label: "Par exposition CBAM" },
  { value: "conflits", label: "Par conflits" },
];

const PAGE_SIZE = 9;

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ nom, size = 32 }: { nom: string; size?: number }) {
  const color = getAvatarColor(nom);
  return (
    <div
      className="rounded-lg flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: color }}
    >
      <span style={{ fontSize: size * 0.36, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em" }}>
        {getInitials(nom)}
      </span>
    </div>
  );
}

function MiniBarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end justify-center" style={{ height: 28, gap: 2 }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            width: 8,
            flexShrink: 0,
            height: `${Math.max(Math.round((v / max) * 100), 8)}%`,
            background: "#FF70B5",
            opacity: i === data.length - 1 ? 0.9 : 0.25,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

function ImportateurCard({ importateur, onNavigate }: { importateur: Importateur; onNavigate: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const cbamCount = importateur.dossiersHistorique.filter(d => d.flags.includes("CBAM")).length;
  const showCbam = importateur.cbamTypes.length > 0;

  return (
    <div
      onClick={onNavigate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-colors duration-100"
      style={{
        background: hovered ? "rgba(13,15,20,0.02)" : "#FFFFFF",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar nom={importateur.nom} size={30} />
          <span className="text-[13.5px] font-medium leading-tight truncate" style={{ color: "var(--color-text)" }}>
            {importateur.nom}
          </span>
        </div>
        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(m => !m); }}
            className="flex items-center justify-center size-6 rounded-md transition-colors duration-75"
            style={{
              opacity: hovered || menuOpen ? 1 : 0,
              color: "var(--color-text-tertiary)",
              background: menuOpen ? "rgba(13,15,20,0.06)" : "transparent",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.06)"; }}
            onMouseLeave={(e) => { if (!menuOpen) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <MoreHoriz width={14} height={14} strokeWidth={1.5} />
          </button>
          {menuOpen && (
            <div
              className="absolute top-full right-0 mt-1 rounded-xl py-1.5 z-20 min-w-[160px]"
              style={{ background: "#FFFFFF", border: "1px solid var(--color-border)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
            >
              {[
                { label: "Voir la fiche", action: () => onNavigate() },
                { label: "Modifier", action: () => onNavigate() },
                { label: "Archiver", action: () => {} },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); action(); }}
                  className="w-full text-left px-3 py-1.5 text-[13px] transition-colors duration-75"
                  style={{ color: label === "Archiver" ? "#dc2626" : "var(--color-text)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.03)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meta */}
      <p className="text-[12px] -mt-1" style={{ color: "var(--color-text-tertiary)" }}>
        FR · {importateur.ville} · {importateur.siren}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {showCbam && (
          <span className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "rgba(255,112,181,0.1)", color: "var(--color-primary)" }}>
            CBAM {importateur.cbamTypes.map(t => CBAM_LABEL[t]).join(" · ")}
          </span>
        )}
        {importateur.conflitsOuverts > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
            {importateur.conflitsOuverts} conflit{importateur.conflitsOuverts > 1 ? "s" : ""}
          </span>
        )}
        {importateur.origines.length > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "rgba(13,15,20,0.05)", color: "var(--color-text-secondary)" }}>
            {importateur.origines.join(", ")}
          </span>
        )}
      </div>

      {/* Bar chart */}
      <MiniBarChart data={importateur.volumeMensuel} />

      {/* Bottom stats */}
      <div className="flex items-stretch border-t pt-3 -mx-4 px-4 gap-px" style={{ borderColor: "var(--color-border)" }}>
        {[
          { label: "DOSSIERS 30J", value: String(importateur.dossiers30j) },
          { label: "VALEUR", value: formatValeur(importateur.valeur30j) },
          { label: showCbam ? "CBAM" : "CONFLITS", value: showCbam ? String(cbamCount) : String(importateur.conflitsOuverts) },
        ].map(({ label, value }, i) => (
          <div
            key={label}
            className="flex-1 flex flex-col gap-0.5"
            style={{ paddingLeft: i > 0 ? 12 : 0, borderLeft: i > 0 ? "1px solid var(--color-border)" : "none" }}
          >
            <span className="text-[10px] tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>{label}</span>
            <span className="text-[13.5px] font-semibold tabular-nums" style={{ color: "var(--color-text)" }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableView({ importateurs, onNavigate }: { importateurs: Importateur[]; onNavigate: (id: string) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const COLS = "minmax(200px,1fr) 100px 120px 80px 100px 60px 60px 100px";

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--color-border)" }}>
      <div className="grid items-center px-5 py-2.5 border-b" style={{ gridTemplateColumns: COLS, borderColor: "var(--color-border)" }}>
        {["Importateur", "Ville", "SIREN", "Dossiers 30j", "Valeur cumulée", "CBAM", "Conflits", "Dernière activité"].map(col => (
          <span key={col} className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>{col}</span>
        ))}
      </div>
      {importateurs.map((imp, i, arr) => (
        <div
          key={imp.id}
          onClick={() => onNavigate(imp.id)}
          onMouseEnter={() => setHovered(imp.id)}
          onMouseLeave={() => setHovered(null)}
          className="grid items-center px-5 cursor-pointer transition-colors duration-75"
          style={{
            gridTemplateColumns: COLS,
            height: 44,
            background: hovered === imp.id ? "rgba(13,15,20,0.02)" : "transparent",
            borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none",
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar nom={imp.nom} size={24} />
            <span className="text-[13px] truncate" style={{ color: "var(--color-text)" }}>{imp.nom}</span>
          </div>
          <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>{imp.ville}</span>
          <span className="text-[12.5px]" style={{ color: "var(--color-text-tertiary)" }}>{imp.siren}</span>
          <span className="text-[13px] tabular-nums" style={{ color: "var(--color-text)" }}>{imp.dossiers30j}</span>
          <span className="text-[13px] tabular-nums" style={{ color: "var(--color-text)" }}>{formatValeur(imp.valeur30j)}</span>
          <div>
            {imp.cbamTypes.length > 0
              ? <span className="text-[11.5px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,112,181,0.1)", color: "var(--color-primary)" }}>{imp.cbamTypes.length}</span>
              : <span style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>-</span>}
          </div>
          <div>
            {imp.conflitsOuverts > 0
              ? <span className="text-[11.5px] px-1.5 py-0.5 rounded" style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>{imp.conflitsOuverts}</span>
              : <span style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>-</span>}
          </div>
          <span className="text-[12.5px]" style={{ color: "var(--color-text-tertiary)" }}>{imp.derniereActivite}</span>
        </div>
      ))}
    </div>
  );
}

function SortDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const current = SORT_OPTIONS.find(o => o.value === value)?.label ?? "Par nom";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] transition-colors duration-75"
        style={{
          border: "1px solid var(--color-border)",
          color: "var(--color-text-secondary)",
          background: open ? "rgba(13,15,20,0.04)" : "transparent",
        }}
      >
        {current}
        <NavArrowDown
          width={11} height={11} strokeWidth={1.75}
          style={{ color: "var(--color-text-tertiary)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 120ms ease" }}
        />
      </button>
      {open && (
        <div
          className="absolute top-full right-0 mt-1.5 rounded-xl py-1.5 z-20 min-w-[200px]"
          style={{ background: "#FFFFFF", border: "1px solid var(--color-border)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
        >
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2 transition-colors duration-75"
              style={{ color: "var(--color-text)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.03)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span
                className="size-3.5 rounded-full shrink-0 flex items-center justify-center"
                style={{
                  border: value === opt.value ? "none" : "1px solid var(--color-border-strong)",
                  background: value === opt.value ? "var(--color-text)" : "transparent",
                }}
              >
                {value === opt.value && <span className="size-1.5 rounded-full bg-white" />}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[440px] p-0 overflow-hidden gap-0"
        style={{ background: "#FFFFFF", border: "1px solid var(--color-border)", boxShadow: "0 8px 40px rgba(13,15,20,0.09)" }}
      >
        <DialogTitle className="sr-only">Ajouter un importateur</DialogTitle>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-[14px] font-medium tracking-tight" style={{ color: "var(--color-text)" }}>
            Ajouter un importateur
          </span>
          <button
            onClick={onClose}
            className="flex items-center justify-center size-7 rounded-lg transition-colors duration-75"
            style={{ border: "1px solid var(--color-border-strong)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.04)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <span className="text-[12px] leading-none" style={{ color: "var(--color-text-tertiary)" }}>✕</span>
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {[
            { label: "SIREN", placeholder: "ex: 423 891 012", required: true },
            { label: "Nom de la société", placeholder: "ex: Dupont Métaux SARL", required: true },
            { label: "Contact - Nom", placeholder: "ex: Jean Dupont", required: false },
            { label: "Contact - Email", placeholder: "ex: j.dupont@societe.fr", required: false },
          ].map(({ label, placeholder, required }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <label className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                {label} {required && <span style={{ opacity: 0.5 }}>*</span>}
              </label>
              <Input
                placeholder={placeholder}
                className="h-9 text-[13px] focus-visible:ring-0 focus-visible:shadow-none"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text)", background: "transparent" }}
              />
            </div>
          ))}
          <button
            className="w-full h-9 rounded-lg text-[13px] font-medium transition-opacity duration-75 mt-1"
            style={{ background: "var(--color-primary)", color: "#FFFFFF" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            Ajouter l'importateur
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const cardStyle = { background: "#FFFFFF", border: "1px solid var(--color-border)" } as const;
const dividerStyle = { borderColor: "var(--color-border)" } as const;
const labelStyle = { fontSize: "13px", fontWeight: 400, color: "var(--color-text-secondary)" } as const;

export default function ImportateursPage() {
  const router = useRouter();
  const [view, setView] = useState<"cards" | "table">("cards");
  const [sort, setSort] = useState("nom");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = IMPORTATEURS.filter(i => {
    if (!search) return true;
    const q = search.toLowerCase();
    return i.nom.toLowerCase().includes(q) || i.ville.toLowerCase().includes(q) || i.siren.includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "volume":   return b.valeur30j - a.valeur30j;
      case "dossiers": return b.dossiers30j - a.dossiers30j;
      case "cbam":     return (b.cbamTypes.length - a.cbamTypes.length) || a.nom.localeCompare(b.nom, "fr");
      case "conflits": return (b.conflitsOuverts - a.conflitsOuverts) || a.nom.localeCompare(b.nom, "fr");
      default:         return a.nom.localeCompare(b.nom, "fr");
    }
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalVolume30j = IMPORTATEURS.reduce((s, i) => s + i.valeur30j, 0);
  const avecCBAM = IMPORTATEURS.filter(i => i.cbamTypes.length > 0).length;
  const conflitsTotal = IMPORTATEURS.reduce((s, i) => s + i.conflitsOuverts, 0);

  function navigate(id: string) {
    router.push(`/dashboard/importateurs/${id}`);
  }

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleSort(v: string) { setSort(v); setPage(1); }

  return (
    <div className="p-6 min-h-full" style={{ background: "var(--color-surface-0)" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-text)" }}>
            Importateurs
          </h1>
          <p className="text-[14px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
            38 importateurs actifs - vue par exposition CBAM et taux de conflit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 h-8 px-3 rounded-lg text-[13px] transition-colors duration-75"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.04)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
          >
            <Download width={13} height={13} strokeWidth={1.5} />
            Exporter
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-opacity duration-75"
            style={{ background: "var(--color-primary)", color: "#FFFFFF" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            <Plus width={13} height={13} strokeWidth={2.25} />
            Ajouter un importateur
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="flex flex-col justify-between gap-3 rounded-xl p-5" style={cardStyle}>
          <div>
            <span style={labelStyle}>Importateurs actifs</span>
            <div className="mt-3">
              <span className="text-[32px] font-semibold leading-none" style={{ letterSpacing: "-0.03em", color: "var(--color-text)" }}>38</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 border-t pt-3" style={dividerStyle}>
            <span className="text-[12.5px]" style={{ color: "var(--color-text-secondary)" }}>
              <span style={{ color: "var(--color-text)", fontWeight: 500 }}>+5</span> ce trimestre
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-xl p-5" style={cardStyle}>
          <div>
            <span style={labelStyle}>Volume cumulé 30j</span>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-[32px] font-semibold leading-none" style={{ letterSpacing: "-0.03em", color: "var(--color-text)" }}>
                {formatValeur(totalVolume30j)}
              </span>
              <div className="flex items-center gap-1 pb-1">
                <ArrowUp width={11} height={11} strokeWidth={2.5} style={{ color: "var(--color-primary)" }} />
                <span className="text-[12.5px]" style={{ color: "var(--color-primary)" }}>
                  +12% vs mois précédent
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 border-t pt-3" style={dividerStyle}>
            <span className="text-[12.5px]" style={{ color: "var(--color-text-secondary)" }}>
              Valeur cumulée sur les 30 derniers jours
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-xl p-5" style={cardStyle}>
          <div>
            <span style={labelStyle}>Avec exposition CBAM</span>
            <div className="mt-3">
              <span className="text-[32px] font-semibold leading-none" style={{ letterSpacing: "-0.03em", color: "var(--color-primary)" }}>
                {avecCBAM}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 border-t pt-3" style={dividerStyle}>
            <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
              acier · alu · ciment · engrais
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-xl p-5" style={cardStyle}>
          <div>
            <span style={labelStyle}>Conflits ouverts</span>
            <div className="mt-3">
              <span className="text-[32px] font-semibold leading-none" style={{ letterSpacing: "-0.03em", color: conflitsTotal > 0 ? "#dc2626" : "var(--color-text)" }}>
                {conflitsTotal}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 border-t pt-3" style={dividerStyle}>
            <span className="text-[12.5px]" style={{ color: "var(--color-text-secondary)" }}>
              SLA moyen <span style={{ color: "var(--color-text)", fontWeight: 500 }}>3.2j</span>
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        {/* View toggle */}
        <div
          className="flex items-center p-0.5 rounded-lg shrink-0"
          style={{ background: "rgba(13,15,20,0.05)", border: "1px solid var(--color-border)" }}
        >
          {([["cards", "Vue cartes"], ["table", "Vue tableau"]] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 h-7 rounded-md text-[13px] transition-all duration-100"
              style={{
                background: view === v ? "#FFFFFF" : "transparent",
                color: view === v ? "var(--color-text)" : "var(--color-text-tertiary)",
                fontWeight: view === v ? 500 : 400,
                boxShadow: view === v ? "0 1px 3px rgba(13,15,20,0.08)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-72">
          <Search
            width={13} height={13} strokeWidth={1.5}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-text-tertiary)" }}
          />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 pr-8 text-[13px] h-8 focus-visible:ring-1"
          />
          {search && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              <Xmark width={12} height={12} strokeWidth={1.75} />
            </button>
          )}
        </div>

        <div className="flex-1" />
        <SortDropdown value={sort} onChange={handleSort} />
      </div>

      {/* Content */}
      {view === "cards" ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {paged.map(imp => (
            <ImportateurCard key={imp.id} importateur={imp} onNavigate={() => navigate(imp.id)} />
          ))}
          {paged.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-2">
              <p className="text-[14px] font-medium" style={{ color: "var(--color-text)" }}>Aucun importateur trouvé</p>
              <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>Modifiez votre recherche.</p>
            </div>
          )}
        </div>
      ) : (
        <TableView importateurs={paged} onNavigate={navigate} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-[12.5px] tabular-nums" style={{ color: "var(--color-text-tertiary)" }}>
            {sorted.length === 0 ? "0 importateur" : `${(safePage - 1) * PAGE_SIZE + 1}-${Math.min(safePage * PAGE_SIZE, sorted.length)} de ${sorted.length} importateurs`}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={safePage === 1}
              onClick={() => setPage(p => p - 1)}
              className="flex items-center justify-center size-7 rounded-lg transition-colors duration-75"
              style={{
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
                opacity: safePage === 1 ? 0.4 : 1,
                cursor: safePage === 1 ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => { if (safePage > 1) (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.04)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <NavArrowLeft width={12} height={12} strokeWidth={1.75} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="flex items-center justify-center size-7 rounded-lg text-[12.5px] tabular-nums transition-colors duration-75"
                style={{
                  fontWeight: p === safePage ? 500 : 400,
                  background: p === safePage ? "rgba(13,15,20,0.06)" : "transparent",
                  color: p === safePage ? "var(--color-text)" : "var(--color-text-secondary)",
                  border: p === safePage ? "1px solid var(--color-border-strong)" : "1px solid transparent",
                }}
                onMouseEnter={(e) => { if (p !== safePage) (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.03)"; }}
                onMouseLeave={(e) => { if (p !== safePage) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {p}
              </button>
            ))}
            <button
              disabled={safePage === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="flex items-center justify-center size-7 rounded-lg transition-colors duration-75"
              style={{
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
                opacity: safePage === totalPages ? 0.4 : 1,
                cursor: safePage === totalPages ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => { if (safePage < totalPages) (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.04)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <NavArrowRight width={12} height={12} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}

      <AddModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
