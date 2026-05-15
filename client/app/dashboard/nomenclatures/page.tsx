"use client";

import { useState, useMemo } from "react";
import { Search, Xmark, NavArrowRight, NavArrowDown, Star, ArrowRight } from "iconoir-react";
import { Input } from "@/components/ui/input";
import {
  TARIC_TREE,
  CODE_DETAILS,
  DEFAULT_CODE,
  type TaricNode,
  type Flag,
} from "@/lib/nomenclatures-data";

// ─── Constants ─────────────────────────────────────────────────────────────────

const DATA_DATE = "1 mai 2026";

const TABS = ["TARIC", "Tarif FR", "CN8", "Notes"] as const;
type Tab = typeof TABS[number];

const FILTER_PILLS: { key: Flag; label: string }[] = [
  { key: "CBAM",   label: "CBAM" },
  { key: "AD_CN",  label: "Antidumping" },
  { key: "Surv",   label: "Surveillance" },
  { key: "BTI",    label: "BTI disponible" },
];

const FLAG_CONFIG: Record<Flag, { label: string; bg: string; color: string }> = {
  CBAM:  { label: "CBAM",  bg: "rgba(255,112,181,0.12)", color: "var(--color-primary)" },
  AD_CN: { label: "AD CN", bg: "rgba(220,38,38,0.08)",  color: "#dc2626" },
  AD_IN: { label: "AD IN", bg: "rgba(220,38,38,0.08)",  color: "#dc2626" },
  AD_EU: { label: "AD EU", bg: "rgba(220,38,38,0.08)",  color: "#dc2626" },
  Surv:  { label: "Surv.", bg: "rgba(217,119,6,0.09)",  color: "#b45309" },
  BTI:   { label: "BTI",  bg: "rgba(22,163,74,0.08)",  color: "#15803d" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function collectCodes(node: TaricNode): string[] {
  const codes = [node.code];
  if (node.children) node.children.forEach(c => codes.push(...collectCodes(c)));
  return codes;
}

const DEFAULT_SECTION =
  TARIC_TREE.find(s => collectCodes(s).includes(DEFAULT_CODE))?.code
  ?? TARIC_TREE[0].code;

function nodeMatchesSearch(node: TaricNode, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  if (node.code.toLowerCase().includes(lower) || node.description.toLowerCase().includes(lower)) return true;
  if (node.children) return node.children.some(c => nodeMatchesSearch(c, lower));
  return false;
}

function nodeMatchesFilter(node: TaricNode, filters: Set<Flag>): boolean {
  if (filters.size === 0) return true;
  for (const f of filters) {
    if (node.flags.includes(f)) return true;
  }
  if (node.children) return node.children.some(c => nodeMatchesFilter(c, filters));
  return false;
}

function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "rgba(255,112,181,0.25)", color: "inherit", borderRadius: 2 }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

// ─── ProprietaireBadge ─────────────────────────────────────────────────────────

function ProprietaireBadge() {
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
      style={{ background: "rgba(255,112,181,0.1)", color: "var(--color-primary)" }}
    >
      Verdyct
    </span>
  );
}

// ─── FlagBadge ─────────────────────────────────────────────────────────────────

function FlagBadge({ flag }: { flag: Flag }) {
  const cfg = FLAG_CONFIG[flag];
  return (
    <span
      className="text-[10px] px-1 py-px rounded shrink-0"
      style={{ background: cfg.bg, color: cfg.color, fontWeight: 500 }}
    >
      {cfg.label}
    </span>
  );
}

// ─── TreeNode ──────────────────────────────────────────────────────────────────

function TreeNode({
  node,
  depth,
  selected,
  onSelect,
  search,
  filters,
  defaultOpen,
  controlledOpen,
  onControlledToggle,
}: {
  node: TaricNode;
  depth: number;
  selected: string;
  onSelect: (code: string) => void;
  search: string;
  filters: Set<Flag>;
  defaultOpen?: boolean;
  // For accordion at section level
  controlledOpen?: boolean;
  onControlledToggle?: () => void;
}) {
  const hasChildren = !!node.children?.length;
  const [localOpen, setLocalOpen] = useState(defaultOpen ?? (depth < 2));
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : localOpen;

  const visible = nodeMatchesSearch(node, search) && nodeMatchesFilter(node, filters);
  if (!visible) return null;

  const isSelected = node.code === selected;
  const isFaded = !node.flags.length && filters.size === 0 && !search;
  const isLeaf = node.level === "cn8" || !hasChildren;

  const indentPx = depth * 12 + 12;

  return (
    <div>
      <button
        onClick={() => {
          if (isLeaf) {
            onSelect(node.code);
          } else if (isControlled && onControlledToggle) {
            onControlledToggle();
          } else {
            setLocalOpen(o => !o);
          }
        }}
        className="w-full flex items-center gap-1.5 py-1.5 text-left transition-colors duration-75 group"
        style={{
          paddingLeft: indentPx,
          paddingRight: 12,
          background: isSelected ? "rgba(255,112,181,0.08)" : "transparent",
          borderLeft: isSelected ? "2px solid var(--color-primary)" : "2px solid transparent",
          opacity: isFaded ? 0.45 : 1,
        }}
        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.03)"; }}
        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        {/* Chevron or leaf dot */}
        {hasChildren && !isLeaf ? (
          <span style={{ color: "var(--color-text-tertiary)", flexShrink: 0, width: 12 }}>
            {open
              ? <NavArrowDown width={10} height={10} strokeWidth={1.75} />
              : <NavArrowRight width={10} height={10} strokeWidth={1.75} />}
          </span>
        ) : (
          <span className="shrink-0" style={{ width: 12 }} />
        )}

        {/* Code */}
        <span
          className="shrink-0 tabular-nums"
          style={{
            fontSize: node.level === "section" || node.level === "chapter" ? "12px" : "12px",
            fontWeight: node.level === "section" || node.level === "chapter" ? 600 : node.level === "heading" ? 500 : 400,
            color: isSelected ? "var(--color-primary)" : "var(--color-text)",
            minWidth: node.level === "cn8" ? 72 : node.level === "subheading" ? 60 : undefined,
          }}
        >
          {highlight(node.code.replace(/^S-/, ""), search)}
        </span>

        {/* Description */}
        <span
          className="flex-1 min-w-0 truncate"
          style={{
            fontSize: "12px",
            color: "var(--color-text-secondary)",
            fontWeight: node.level === "section" || node.level === "chapter" ? 500 : 400,
          }}
        >
          {highlight(node.description.replace(/^(Section \w+ — |Ch\. \d+ — )/, ""), search)}
        </span>

        {/* Flags (inline, only most important) */}
        <div className="flex items-center gap-0.5 shrink-0 ml-1">
          {node.flags.slice(0, 2).map(f => <FlagBadge key={f} flag={f} />)}
        </div>
      </button>

      {open && hasChildren && (
        <div>
          {node.children!.map(child => (
            <TreeNode
              key={child.code}
              node={child}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
              search={search}
              filters={filters}
              defaultOpen={search.length > 0 || filters.size > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ComingSoon ────────────────────────────────────────────────────────────────

function ComingSoon({ tab }: { tab: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 py-32">
      <p className="text-[14px] font-medium" style={{ color: "var(--color-text)" }}>{tab}</p>
      <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
        Disponible prochainement.
      </p>
    </div>
  );
}

// ─── DetailPanel ───────────────────────────────────────────────────────────────

function DetailPanel({ code, onUse }: { code: string; onUse: (code: string) => void }) {
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const detail = CODE_DETAILS[code];

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p className="text-[14px]" style={{ color: "var(--color-text-tertiary)" }}>
          Sélectionnez un code CN8 dans l'arbre.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-6 flex flex-col gap-5 flex-1">

        {/* Code + flags */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {detail.flags.map(f => <FlagBadge key={f} flag={f} />)}
            </div>
            <p
              className="text-[28px] font-semibold leading-none tracking-tight"
              style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}
            >
              {detail.code}
            </p>
            <p className="mt-2 text-[14px] font-medium leading-snug" style={{ color: "var(--color-text)" }}>
              {detail.description}
            </p>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center flex-wrap gap-1" style={{ color: "var(--color-text-tertiary)" }}>
          {detail.breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-[12px]">{crumb}</span>
              {i < detail.breadcrumb.length - 1 && (
                <NavArrowRight width={10} height={10} strokeWidth={1.75} />
              )}
            </span>
          ))}
        </div>

        {/* Technical meta */}
        <div className="flex items-center gap-4 text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
          <span>Unité stat. <span style={{ color: "var(--color-text-secondary)" }}>{detail.uniteStatistique}</span></span>
          <span className="h-3 w-px" style={{ background: "var(--color-border-strong)" }} />
          <span>Mise à jour <span style={{ color: "var(--color-text-secondary)" }}>{detail.derniereMaj}</span></span>
        </div>

        <div className="h-px" style={{ background: "var(--color-border)" }} />

        {/* Mesures */}
        <div>
          <p className="text-[11px] font-semibold tracking-wider uppercase mb-3" style={{ color: "var(--color-text-tertiary)" }}>
            Mesures applicables
          </p>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
            <div
              className="grid px-4 py-2.5 border-b"
              style={{ gridTemplateColumns: "1fr 140px", borderColor: "var(--color-border)", background: "rgba(13,15,20,0.02)" }}
            >
              <span className="text-[11.5px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>Mesure</span>
              <span className="text-[11.5px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>Taux</span>
            </div>
            {detail.mesures.map((m, i) => (
              <div
                key={i}
                className="grid px-4 py-3"
                style={{
                  gridTemplateColumns: "1fr 140px",
                  borderBottom: i < detail.mesures.length - 1 ? "1px solid var(--color-border)" : "none",
                  background: m.highlight ? "rgba(255,112,181,0.03)" : "transparent",
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px]" style={{ color: m.highlight ? "var(--color-primary)" : "var(--color-text)" }}>
                    {m.label}
                  </span>
                  {m.ref && m.ref !== "—" && (
                    <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>{m.ref}</span>
                  )}
                </div>
                <span
                  className="text-[13px] font-medium"
                  style={{ color: m.highlight ? "var(--color-primary)" : "var(--color-text-secondary)" }}
                >
                  {m.taux}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Alertes Verdyct */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-text-tertiary)" }}>
              Alertes Verdyct
            </p>
            <ProprietaireBadge />
          </div>
          <div
            className="rounded-xl p-4 flex flex-col gap-2.5"
            style={{ background: "rgba(255,112,181,0.04)", border: "1px solid rgba(255,112,181,0.15)" }}
          >
            {detail.alertes.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span
                  className="mt-1.5 size-1.5 rounded-full shrink-0"
                  style={{ background: "var(--color-primary)" }}
                />
                <p className="text-[13px] leading-snug" style={{ color: "var(--color-text)" }}>{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Notes explicatives */}
        <div>
          <p className="text-[11px] font-semibold tracking-wider uppercase mb-3" style={{ color: "var(--color-text-tertiary)" }}>
            Notes explicatives
          </p>
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(13,15,20,0.02)", border: "1px solid var(--color-border)" }}
          >
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {notesExpanded
                ? detail.notesExtrait
                : `${detail.notesExtrait.slice(0, 220)}…`}
            </p>
            <button
              onClick={() => setNotesExpanded(e => !e)}
              className="mt-2 flex items-center gap-1 text-[12.5px] transition-colors duration-75"
              style={{ color: "var(--color-text-tertiary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-tertiary)"; }}
            >
              {notesExpanded ? "Réduire" : "Voir la note complète"}
              <ArrowRight
                width={11} height={11} strokeWidth={1.75}
                style={{ transform: notesExpanded ? "rotate(90deg)" : "none", transition: "transform 120ms ease" }}
              />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 pb-2">
          <button
            onClick={() => onUse(detail.code)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-medium transition-opacity duration-75"
            style={{ background: "var(--color-primary)", color: "#FFFFFF" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            Utiliser ce code
          </button>
          <button
            onClick={() => setSaved(s => !s)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] transition-colors duration-75"
            style={{
              border: "1px solid var(--color-border-strong)",
              color: saved ? "var(--color-primary)" : "var(--color-text-secondary)",
              background: saved ? "rgba(255,112,181,0.06)" : "transparent",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = saved ? "rgba(255,112,181,0.1)" : "rgba(13,15,20,0.03)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = saved ? "rgba(255,112,181,0.06)" : "transparent"; }}
          >
            <Star
              width={13} height={13} strokeWidth={1.75}
              style={{ color: saved ? "var(--color-primary)" : "inherit" }}
            />
            {saved ? "Sauvegardé" : "Sauvegarder dans mes favoris"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function NomenclaturesPage() {
  const [tab, setTab] = useState<Tab>("TARIC");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Set<Flag>>(new Set());
  const [selected, setSelected] = useState(DEFAULT_CODE);
  const [expandedSection, setExpandedSection] = useState<string>(DEFAULT_SECTION);

  const isFiltering = search.length > 0 || filters.size > 0;

  function toggleSection(code: string) {
    setExpandedSection(prev => prev === code ? "" : code);
  }

  function toggleFilter(f: Flag) {
    setFilters(prev => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  }

  const treeKey = useMemo(() => `${search}-${[...filters].join(",")}`, [search, filters]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--color-surface-0)" }}>

      {/* Page header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface-0)" }}
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-text)" }}>
            Nomenclatures
          </h1>
          <p className="text-[13px] mt-0.5 leading-snug" style={{ color: "var(--color-text-tertiary)", maxWidth: 640 }}>
            TARIC européen {DATA_DATE} · Tarif national FR · Notes explicatives.{" "}
            Verdyct met en évidence les positions à risque CBAM, antidumping ou surveillance.
          </p>
        </div>

        {/* Tabs */}
        <div
          className="flex items-center p-0.5 rounded-lg shrink-0"
          style={{ background: "rgba(13,15,20,0.05)", border: "1px solid var(--color-border)" }}
        >
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 h-7 rounded-md text-[13px] transition-all duration-100"
              style={{
                background: tab === t ? "#FFFFFF" : "transparent",
                color: tab === t ? "var(--color-text)" : "var(--color-text-tertiary)",
                fontWeight: tab === t ? 500 : 400,
                boxShadow: tab === t ? "0 1px 3px rgba(13,15,20,0.08)" : "none",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {tab !== "TARIC" ? (
        <ComingSoon tab={tab} />
      ) : (
        <div className="flex flex-1 overflow-hidden">

          {/* Left panel — tree */}
          <aside
            className="flex flex-col w-80 shrink-0 border-r overflow-hidden"
            style={{ borderColor: "var(--color-border)", background: "#FFFFFF" }}
          >
            {/* Search */}
            <div className="px-3 pt-3 pb-2 shrink-0">
              <div className="relative">
                <Search
                  width={13} height={13} strokeWidth={1.5}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--color-text-tertiary)" }}
                />
                <Input
                  placeholder="Mot-clé, code, description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-8 text-[12.5px] h-8 focus-visible:ring-1"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    <Xmark width={12} height={12} strokeWidth={1.75} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 px-3 pb-2.5 flex-wrap shrink-0">
              {FILTER_PILLS.map(({ key, label }) => {
                const active = filters.has(key);
                const cfg = FLAG_CONFIG[key];
                return (
                  <button
                    key={key}
                    onClick={() => toggleFilter(key)}
                    className="text-[11.5px] px-2.5 py-1 rounded-full transition-colors duration-75"
                    style={{
                      background: active ? cfg.bg : "rgba(13,15,20,0.05)",
                      color: active ? cfg.color : "var(--color-text-secondary)",
                      fontWeight: active ? 500 : 400,
                      border: active ? `1px solid ${cfg.color}22` : "1px solid transparent",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="h-px shrink-0" style={{ background: "var(--color-border)" }} />

            {/* Tree */}
            <div key={treeKey} className="flex-1 overflow-y-auto py-1">
              {TARIC_TREE.map(section => (
                <TreeNode
                  key={section.code}
                  node={section}
                  depth={0}
                  selected={selected}
                  onSelect={setSelected}
                  search={search}
                  filters={filters}
                  controlledOpen={isFiltering ? true : expandedSection === section.code}
                  onControlledToggle={() => toggleSection(section.code)}
                />
              ))}
            </div>
          </aside>

          {/* Right panel — detail */}
          <main
            className="flex-1 overflow-hidden"
            style={{ background: "var(--color-surface-0)" }}
          >
            <DetailPanel code={selected} onUse={(c) => console.log("Utiliser", c)} />
          </main>
        </div>
      )}
    </div>
  );
}
