"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, NavArrowRight, NavArrowDown, NavArrowLeft, Xmark, Plus } from "iconoir-react";
import { ALL_DOSSIERS, Dossier, Statut, statutConfig, DossierDrawer } from "@/components/DossiersTable";
import { useUploadModal } from "@/lib/upload-modal-context";
import { Input } from "@/components/ui/input";

// ─── Filter data ──────────────────────────────────────────────────────────────

const STATUT_COUNTS: { label: Statut; count: number }[] = [
  { label: "Validé",     count: 89 },
  { label: "En attente", count: 32 },
  { label: "CBAM",       count: 14 },
  { label: "Conflit",    count:  7 },
];

const IMPORTATEURS = [
  { name: "Dupont Métaux SARL",       count: 18 },
  { name: "Acier Normandie SAS",      count: 12 },
  { name: "Import Express Lyon",      count: 11 },
  { name: "Plastiques Réunis SARL",   count:  9 },
  { name: "Métal Service Rhône",      count:  8 },
];

const REGIMES = [
  "40 — Mise en libre pratique",
  "42 — Transit communautaire",
  "07 — Entrepôt douanier",
];

const INCOTERMS = ["DAP", "CIF", "FOB", "EXW", "DDP"];

const FENETRES = ["7 jours", "30 jours", "Ce trimestre", "Cette année", "Tout afficher"];

const TABS = ["Tous", "Mes dossiers", "Équipe", "Brouillon"] as const;
type Tab = typeof TABS[number];

const COLS = "24px 150px 1fr 130px 100px 24px";

// ─── Filter dropdown ──────────────────────────────────────────────────────────

function FilterDropdown({
  id,
  label,
  count,
  openId,
  setOpenId,
  children,
}: {
  id: string;
  label: string;
  count: number;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  children: React.ReactNode;
}) {
  const isOpen = openId === id;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (isOpen) setOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, setOpenId]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpenId(isOpen ? null : id)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] transition-colors duration-75"
        style={{
          border: `1px solid ${isOpen || count > 0 ? "var(--color-border-strong)" : "var(--color-border)"}`,
          background: isOpen ? "rgba(13,15,20,0.04)" : count > 0 ? "rgba(13,15,20,0.03)" : "transparent",
          color: count > 0 ? "var(--color-text)" : "var(--color-text-secondary)",
          fontWeight: count > 0 ? 500 : 400,
        }}
      >
        {label}
        {count > 0 && (
          <span
            className="size-4 rounded-full text-[11px] font-semibold flex items-center justify-center"
            style={{ background: "var(--color-text)", color: "#FFFFFF" }}
          >
            {count}
          </span>
        )}
        <NavArrowDown
          width={11}
          height={11}
          strokeWidth={1.75}
          style={{
            color: "var(--color-text-tertiary)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 120ms ease",
          }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1.5 rounded-xl py-1.5 z-20 min-w-[200px]"
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--color-border)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownCheckRow({
  label,
  count,
  checked,
  onChange,
  dot,
  dotColor,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
  dot?: boolean;
  dotColor?: string;
}) {
  return (
    <label
      className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer transition-colors duration-75"
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.03)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <div
        className="size-3.5 rounded flex items-center justify-center shrink-0 transition-colors duration-75"
        style={{
          border: checked ? "none" : "1px solid var(--color-border-strong)",
          background: checked ? "var(--color-text)" : "transparent",
        }}
        onClick={onChange}
      >
        {checked && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {dot && dotColor && (
        <span className="size-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
      )}
      <span className="text-[13px] flex-1 truncate" style={{ color: "var(--color-text)" }}>
        {label}
      </span>
      {count !== undefined && (
        <span className="text-[12px] tabular-nums" style={{ color: "var(--color-text-tertiary)" }}>
          {count}
        </span>
      )}
    </label>
  );
}

function DropdownDivider() {
  return <div className="my-1 mx-3 h-px" style={{ background: "var(--color-border)" }} />;
}

// ─── Main page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 11;
const TABLE_MAX_HEIGHT = PAGE_SIZE * 40 + 37; // 11 rows × 40px + col-header ~37px

export default function DossiersPage() {
  const { openModal } = useUploadModal();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Tous");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  const [openDossier, setOpenDossier] = useState<Dossier | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  // Filter state
  const [statutChecked, setStatutChecked] = useState<Set<Statut>>(new Set());

  // On mount: read ?statut= from URL and pre-apply
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("statut") as Statut | null;
    const valid: Statut[] = ["Validé", "En attente", "CBAM", "Conflit"];
    if (s && valid.includes(s)) setStatutChecked(new Set([s]));
  }, []);

  // Sync statut filter back to URL (skip first mount to avoid overwriting initial URL)
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    if (statutChecked.size === 1) {
      const s = [...statutChecked][0];
      window.history.replaceState(null, "", `/dashboard/dossiers?statut=${encodeURIComponent(s)}`);
    } else {
      window.history.replaceState(null, "", "/dashboard/dossiers");
    }
  }, [statutChecked]);
  const [importateurChecked, setImportateurChecked] = useState<Set<string>>(new Set());
  const [regimeChecked, setRegimeChecked] = useState<Set<string>>(new Set());
  const [incotermChecked, setIncotermChecked] = useState<Set<string>>(new Set());
  const [fenetre, setFenetre] = useState("Ce trimestre");

  function toggleRef(ref: string) {
    setSelectedRefs((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  }

  function toggleAll() {
    if (selectedRefs.size === ALL_DOSSIERS.length) {
      setSelectedRefs(new Set());
    } else {
      setSelectedRefs(new Set(ALL_DOSSIERS.map((d) => d.ref)));
    }
  }

  const allChecked = selectedRefs.size === ALL_DOSSIERS.length;
  const someChecked = selectedRefs.size > 0 && !allChecked;

  const resetPage = useCallback(() => setPage(1), []);

  const filteredDossiers = ALL_DOSSIERS.filter((d) => {
    const q = search.toLowerCase();
    if (q && !d.ref.toLowerCase().includes(q) && !d.importateur.toLowerCase().includes(q) && !d.statut.toLowerCase().includes(q)) return false;
    if (statutChecked.size > 0 && !statutChecked.has(d.statut)) return false;
    if (importateurChecked.size > 0 && !importateurChecked.has(d.importateur)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDossiers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedDossiers = filteredDossiers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeFilterCount = statutChecked.size + importateurChecked.size + regimeChecked.size + incotermChecked.size;

  return (
    <div className="p-6 min-h-full" style={{ background: "var(--color-surface-0)" }}>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-text)" }}>
            Dossiers
          </h1>
          <p className="text-[14px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
            142 dossiers actifs · 38 importateurs
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors duration-75"
          style={{
            background: "var(--color-primary)",
            color: "#FFFFFF",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        >
          <Plus width={14} height={14} strokeWidth={2.25} style={{ color: "inherit" }} />
          Nouveau dossier
        </button>
      </div>

      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{ background: "#FFFFFF", border: "1px solid var(--color-border)" }}
      >

        {/* ── Tab bar ── */}
        <div className="flex items-center gap-1 px-6 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-3 text-[13px] transition-colors duration-75 relative"
              style={{
                color: activeTab === tab ? "var(--color-text)" : "var(--color-text-tertiary)",
                fontWeight: activeTab === tab ? 500 : 400,
              }}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "var(--color-text)" }} />
              )}
            </button>
          ))}
        </div>

        {/* ── Search + filter bar ── */}
        <div className="flex items-center gap-3 px-6 py-3 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search
              width={13} height={13} strokeWidth={1.5}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--color-text-tertiary)" }}
            />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              className="pl-8 pr-8 text-[13px] h-8 focus-visible:ring-1"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); resetPage(); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                <Xmark width={12} height={12} strokeWidth={1.75} />
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="h-4 w-px" style={{ background: "var(--color-border-strong)" }} />

          {/* Filter dropdowns */}
          <div className="flex items-center gap-2">
            {/* Statut */}
            <FilterDropdown
              id="statut"
              label="Statut"
              count={statutChecked.size}
              openId={openFilter}
              setOpenId={setOpenFilter}
            >
              {STATUT_COUNTS.map(({ label, count }) => (
                <DropdownCheckRow
                  key={label}
                  label={label}
                  count={count}
                  checked={statutChecked.has(label)}
                  onChange={() => {
                    setStatutChecked((prev) => {
                      const next = new Set(prev);
                      if (next.has(label)) next.delete(label); else next.add(label);
                      return next;
                    });
                  }}
                  dot
                  dotColor={statutConfig[label].color}
                />
              ))}
            </FilterDropdown>

            {/* Importateur */}
            <FilterDropdown
              id="importateur"
              label="Importateur"
              count={importateurChecked.size}
              openId={openFilter}
              setOpenId={setOpenFilter}
            >
              {IMPORTATEURS.map(({ name, count }) => (
                <DropdownCheckRow
                  key={name}
                  label={name}
                  count={count}
                  checked={importateurChecked.has(name)}
                  onChange={() => {
                    setImportateurChecked((prev) => {
                      const next = new Set(prev);
                      if (next.has(name)) next.delete(name); else next.add(name);
                      return next;
                    });
                  }}
                />
              ))}
              <DropdownDivider />
              <button className="px-3 py-1.5 text-[12.5px] w-full text-left" style={{ color: "var(--color-text-tertiary)" }}>
                + 33 autres
              </button>
            </FilterDropdown>

            {/* Régime & Incoterm */}
            <FilterDropdown
              id="regime"
              label="Régime & Incoterm"
              count={regimeChecked.size + incotermChecked.size}
              openId={openFilter}
              setOpenId={setOpenFilter}
            >
              <p className="px-3 pt-1 pb-1 text-[11.5px] font-semibold tracking-tight" style={{ color: "var(--color-text-tertiary)" }}>
                Régime
              </p>
              {REGIMES.map((r) => (
                <DropdownCheckRow
                  key={r}
                  label={r}
                  checked={regimeChecked.has(r)}
                  onChange={() => {
                    setRegimeChecked((prev) => {
                      const next = new Set(prev);
                      if (next.has(r)) next.delete(r); else next.add(r);
                      return next;
                    });
                  }}
                />
              ))}
              <DropdownDivider />
              <p className="px-3 pt-1 pb-1 text-[11.5px] font-semibold tracking-tight" style={{ color: "var(--color-text-tertiary)" }}>
                Incoterm
              </p>
              {INCOTERMS.map((t) => (
                <DropdownCheckRow
                  key={t}
                  label={t}
                  checked={incotermChecked.has(t)}
                  onChange={() => {
                    setIncotermChecked((prev) => {
                      const next = new Set(prev);
                      if (next.has(t)) next.delete(t); else next.add(t);
                      return next;
                    });
                  }}
                />
              ))}
            </FilterDropdown>

            {/* Fenêtre */}
            <FilterDropdown
              id="fenetre"
              label={fenetre}
              count={0}
              openId={openFilter}
              setOpenId={setOpenFilter}
            >
              {FENETRES.map((f) => (
                <label
                  key={f}
                  className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer transition-colors duration-75"
                  onClick={() => { setFenetre(f); setOpenFilter(null); }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.03)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div
                    className="size-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-75"
                    style={{
                      border: fenetre === f ? "none" : "1px solid var(--color-border-strong)",
                      background: fenetre === f ? "var(--color-text)" : "transparent",
                    }}
                  >
                    {fenetre === f && <span className="size-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-[13px]" style={{ color: "var(--color-text)" }}>{f}</span>
                </label>
              ))}
            </FilterDropdown>

            {/* Clear all filters */}
            {activeFilterCount > 0 && (
              <button
                className="h-8 px-2.5 text-[12.5px] rounded-lg transition-colors duration-75"
                style={{ color: "var(--color-text-tertiary)" }}
                onClick={() => {
                  setStatutChecked(new Set());
                  setImportateurChecked(new Set());
                  setRegimeChecked(new Set());
                  setIncotermChecked(new Set());
                  resetPage();
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-tertiary)"; }}
              >
                Effacer
              </button>
            )}
          </div>
        </div>

        {/* ── Selection action bar ── */}
        {selectedRefs.size > 0 && (
          <div
            className="flex items-center gap-3 px-6 py-2.5 border-b shrink-0"
            style={{ borderColor: "var(--color-border)", background: "rgba(13,15,20,0.02)" }}
          >
            <span className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>
              {selectedRefs.size} dossier{selectedRefs.size > 1 ? "s" : ""} sélectionné{selectedRefs.size > 1 ? "s" : ""}
            </span>
            <div className="w-px h-4 mx-1" style={{ background: "var(--color-border-strong)" }} />
            {["Assigner", "Marquer validé", "Exporter DAU", "Archiver"].map((label) => (
              <button
                key={label}
                className="h-7 px-3 rounded-lg text-[12.5px] font-medium transition-colors duration-75"
                style={{ background: "rgba(13,15,20,0.06)", color: "var(--color-text-secondary)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.1)";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.06)";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
                }}
              >
                {label}
              </button>
            ))}
            <button
              className="ml-auto flex items-center justify-center size-6 rounded transition-colors duration-75"
              style={{ color: "var(--color-text-tertiary)" }}
              onClick={() => setSelectedRefs(new Set())}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-tertiary)"; }}
            >
              <Xmark width={13} height={13} strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* ── Table ── */}
        <div style={{ maxHeight: TABLE_MAX_HEIGHT, overflowY: "auto" }}>
          {/* Column headers */}
          <div
            className="grid items-center px-6 py-2 border-b sticky top-0"
            style={{ gridTemplateColumns: COLS, borderColor: "var(--color-border)", background: "#FFFFFF" }}
          >
            <div
              className="size-3.5 rounded flex items-center justify-center cursor-pointer shrink-0 transition-colors duration-75"
              style={{
                border: allChecked || someChecked ? "none" : "1px solid var(--color-border-strong)",
                background: allChecked ? "var(--color-text)" : someChecked ? "rgba(13,15,20,0.15)" : "transparent",
              }}
              onClick={toggleAll}
            >
              {allChecked && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {someChecked && !allChecked && (
                <span className="block w-2 h-px" style={{ background: "var(--color-text)" }} />
              )}
            </div>
            {["Référence", "Importateur", "Statut", "Flags", ""].map((col) => (
              <span key={col} className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                {col}
              </span>
            ))}
          </div>

          {/* Rows */}
          {pagedDossiers.map((d, i, arr) => {
            const badge = statutConfig[d.statut];
            const isChecked = selectedRefs.has(d.ref);
            const isHovered = hoveredRow === d.ref;
            return (
              <div
                key={d.ref}
                className="grid items-center px-6 transition-colors duration-75"
                style={{
                  gridTemplateColumns: COLS,
                  height: "40px",
                  background: isChecked ? "rgba(255,112,181,0.04)" : isHovered ? "rgba(13,15,20,0.02)" : "transparent",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none",
                  borderLeft: isChecked ? "2px solid var(--color-primary)" : "2px solid transparent",
                }}
                onMouseEnter={() => setHoveredRow(d.ref)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Checkbox */}
                <div
                  className="size-3.5 rounded flex items-center justify-center cursor-pointer shrink-0 transition-all duration-75"
                  style={{
                    border: isChecked ? "none" : "1px solid var(--color-border-strong)",
                    background: isChecked ? "var(--color-text)" : "transparent",
                    opacity: isChecked || isHovered ? 1 : 0,
                  }}
                  onClick={() => toggleRef(d.ref)}
                >
                  {isChecked && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                <span className="text-[13px] cursor-pointer" style={{ color: "var(--color-text-secondary)" }} onClick={() => setOpenDossier(d)}>
                  {d.ref}
                </span>
                <span className="text-[13.5px] truncate pr-4 cursor-pointer" style={{ color: "var(--color-text)" }} onClick={() => setOpenDossier(d)}>
                  {d.importateur}
                </span>
                <div className="flex items-center cursor-pointer" onClick={() => setOpenDossier(d)}>
                  <span
                    className="inline-flex items-center text-[12px] px-2 py-0.5 rounded-md"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {d.statut}
                  </span>
                </div>
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => setOpenDossier(d)}>
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
                <div className="flex items-center justify-end cursor-pointer" onClick={() => setOpenDossier(d)}>
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

          {/* Empty state */}
          {filteredDossiers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <p className="text-[14px] font-medium" style={{ color: "var(--color-text)" }}>Aucun dossier trouvé</p>
              <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>Affinez vos filtres ou modifiez la recherche.</p>
            </div>
          )}
        </div>

        {/* ── Pagination footer ── */}
        <div
          className="flex items-center justify-between px-6 py-3 border-t shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          {/* Count */}
          <span className="text-[12.5px] tabular-nums" style={{ color: "var(--color-text-tertiary)" }}>
            {filteredDossiers.length === 0
              ? "0 dossier"
              : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredDossiers.length)} de ${filteredDossiers.length} dossiers`}
          </span>

          {/* Page controls */}
          <div className="flex items-center gap-1">
            <button
              disabled={safePage === 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center justify-center size-7 rounded-lg transition-colors duration-75"
              style={{
                border: "1px solid var(--color-border)",
                color: safePage === 1 ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
                opacity: safePage === 1 ? 0.4 : 1,
                cursor: safePage === 1 ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => { if (safePage > 1) (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.04)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <NavArrowLeft width={12} height={12} strokeWidth={1.75} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center justify-center size-7 rounded-lg transition-colors duration-75"
              style={{
                border: "1px solid var(--color-border)",
                color: safePage === totalPages ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
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
      </div>

      <DossierDrawer
        dossier={openDossier}
        open={openDossier !== null}
        onOpenChange={(open) => { if (!open) setOpenDossier(null); }}
      />
    </div>
  );
}
