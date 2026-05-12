"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  CloudUpload,
  Xmark,
  Star,
  Clock,
  Plus,
  WarningTriangle,
  NavArrowRight,
  Barcode,
} from "iconoir-react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { CopyButton } from "@/components/ui/copy-button";
import { useUploadModal } from "@/lib/upload-modal-context";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Duties {
  tec: string;
  antidumping: string;
  tva: string;
  cbam: string;
}

interface Badge {
  type: "cbam" | "antidumping" | "surveillance" | "origine";
  label: string;
}

interface ResultData {
  code: string;
  confidence: number;
  breadcrumb: string[];
  description: string;
  duties: Duties;
  badges: Badge[];
  reasoning: string;
  warning?: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_RESULTS: ResultData[] = [
  {
    code: "7318.15.59",
    confidence: 94,
    breadcrumb: ["Section XV", "Chap. 73", "7318", "7318.15"],
    description:
      "Vis, boulons, écrous et articles similaires, en fonte, fer ou acier — autres, filetés, non spécifiés ailleurs",
    duties: { tec: "3,7 %", antidumping: "28,5 %", tva: "20 %", cbam: "N/A" },
    badges: [
      { type: "antidumping", label: "Antidumping · Chine +28,5 %" },
      { type: "surveillance", label: "Surveillance UE" },
      { type: "origine", label: "Préférentiel non applicable" },
    ],
    reasoning:
      "Le produit décrit — boulons en acier inoxydable grade A2, M8×40 mm — correspond à la position 7318 couvrant les visseries et boulonneries en fer ou acier. La sous-position 7318.15 est retenue pour les vis à filetage extérieur. L'origine Chine déclenche automatiquement la mesure antidumping (règlement UE 2022/191). Le grade inox A2 n'entre pas dans le champ CBAM (acier non transformé énergétiquement).",
    warning:
      "Attention : la mesure antidumping s'applique uniquement si le produit n'est pas couvert par un engagement de prix accepté par la Commission. Vérifier le statut du fournisseur avant validation.",
  },
  {
    code: "7318.15.90",
    confidence: 71,
    breadcrumb: ["Section XV", "Chap. 73", "7318", "7318.15"],
    description:
      "Vis, boulons, écrous — autres vis et boulons, en acier inoxydable, autres",
    duties: { tec: "3,7 %", antidumping: "—", tva: "20 %", cbam: "N/A" },
    badges: [{ type: "surveillance", label: "Surveillance UE" }],
    reasoning:
      "Classement alternatif si le produit est d'origine non-chinoise ou bénéficie d'un engagement de prix accepté. La description reste conforme à 7318.15, mais la mesure antidumping ne s'applique pas. À retenir si le certificat d'origine exclut la Chine.",
  },
  {
    code: "7318.16.91",
    confidence: 34,
    breadcrumb: ["Section XV", "Chap. 73", "7318", "7318.16"],
    description: "Écrous — autres, en acier inoxydable, de section ronde",
    duties: { tec: "3,7 %", antidumping: "—", tva: "20 %", cbam: "N/A" },
    badges: [],
    reasoning:
      "Classement à écarter sauf si le produit principal est un écrou isolé et non un boulon. La description 'boulons M8×40' oriente clairement vers 7318.15, non 7318.16. Ce code n'est listé qu'à titre de précaution pour les lots mixtes.",
  },
];

const RECENT_ITEMS = [
  { code: "8471.30.00", description: "Machines portables de traitement de l'information", date: "Aujourd'hui, 14:32" },
  { code: "7208.51.30", description: "Produits laminés plats, en fer ou acier",           date: "Hier, 09:15" },
  { code: "3926.90.97", description: "Autres ouvrages en matières plastiques",             date: "10 mai 2026" },
];

const FAVORIS_ITEMS = [
  { code: "7318.15.59", description: "Vis et boulons en acier inoxydable · 94 %", savedAt: "12 mai 2026" },
  { code: "8482.10.10", description: "Roulements à billes, d = ≤ 30 mm · 88 %",   savedAt: "9 mai 2026" },
];

// ── Badge config ──────────────────────────────────────────────────────────────

const badgeCfg = {
  cbam:        { bg: "rgba(245,158,11,0.08)",  color: "#92400E", border: "rgba(245,158,11,0.22)" },
  antidumping: { bg: "rgba(239,68,68,0.07)",   color: "#991B1B", border: "rgba(239,68,68,0.18)" },
  surveillance:{ bg: "rgba(99,102,241,0.07)",  color: "#3730A3", border: "rgba(99,102,241,0.18)" },
  origine:     { bg: "rgba(13,15,20,0.04)",    color: "rgba(13,15,20,0.5)", border: "rgba(13,15,20,0.1)" },
} as const;

// ── InputField — defined outside component to prevent remount bug ──────────

function InputField({
  label,
  value,
  onChange,
  placeholder,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
        {label}
      </label>
      <div
        className="flex items-center h-8 rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--color-border-strong)", background: "rgba(13,15,20,0.02)" }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 text-[13px] bg-transparent outline-none placeholder:opacity-55 h-full"
          style={{ color: "var(--color-text)" }}
          onFocus={(e) => {
            (e.currentTarget.parentElement as HTMLElement).style.borderColor = "var(--color-primary)";
          }}
          onBlur={(e) => {
            (e.currentTarget.parentElement as HTMLElement).style.borderColor = "var(--color-border-strong)";
          }}
        />
        {suffix && (
          <span
            className="shrink-0 px-2.5 text-[12px] self-stretch flex items-center"
            style={{ color: "var(--color-text-tertiary)", borderLeft: "1px solid var(--color-border)" }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function RegulatoryBadge({ type, label }: Badge) {
  const c = badgeCfg[type];
  return (
    <span
      className="inline-flex text-[11px] font-medium px-2 py-0.5 rounded"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      {label}
    </span>
  );
}

function DutyTable({ duties }: { duties: Duties }) {
  const cells = [
    { label: "Droit TEC",   value: duties.tec },
    { label: "Antidumping", value: duties.antidumping },
    { label: "TVA",         value: duties.tva },
    { label: "CBAM",        value: duties.cbam },
  ];
  return (
    <div className="grid grid-cols-4 rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className="flex flex-col gap-1 px-3 py-2.5"
          style={{
            borderRight: i < 3 ? "1px solid var(--color-border)" : "none",
            background: "rgba(13,15,20,0.015)",
          }}
        >
          <span className="text-[10.5px] uppercase tracking-wider font-medium" style={{ color: "var(--color-text-tertiary)" }}>
            {cell.label}
          </span>
          <span
            className="text-[13.5px] font-semibold tabular-nums"
            style={{ color: cell.value === "—" || cell.value === "N/A" ? "var(--color-text-tertiary)" : "var(--color-text)" }}
          >
            {cell.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function ResultCard({
  result,
  isTop,
  saved,
  onSave,
  onCreateDossier,
  index,
}: {
  result: ResultData;
  isTop: boolean;
  saved: boolean;
  onSave: () => void;
  onCreateDossier?: () => void;
  index: number;
}) {
  return (
    <div
      className="rounded-xl flex flex-col gap-4 relative"
      style={{
        padding: "20px",
        background: "#FFFFFF",
        border: isTop ? "1px solid rgba(255,112,181,0.35)" : "1px solid var(--color-border)",
        opacity: index === 2 ? 0.8 : 1,
      }}
    >
      {/* Confidence */}
      <span
        className="absolute top-5 right-5 tabular-nums leading-none"
        style={{
          fontSize: isTop ? "17px" : "13px",
          fontWeight: 700,
          color: isTop ? "var(--color-primary)" : "var(--color-text-tertiary)",
          letterSpacing: "-0.02em",
        }}
      >
        {result.confidence}%
      </span>

      {/* Code + breadcrumb */}
      <div className="flex flex-col gap-1.5 pr-14">
        <div className="flex items-center gap-2">
          <span
            className="font-semibold tracking-tight leading-none"
            style={{ fontSize: isTop ? "24px" : "18px", color: "var(--color-text)", letterSpacing: "-0.02em" }}
          >
            {result.code}
          </span>
          <CopyButton text={result.code} size={12} />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {result.breadcrumb.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-1">
              <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>{crumb}</span>
              {i < result.breadcrumb.length - 1 && (
                <NavArrowRight width={8} height={8} strokeWidth={1.75} style={{ color: "rgba(13,15,20,0.2)" }} />
              )}
            </span>
          ))}
        </div>
      </div>

      {/* TARIC description */}
      <p className="text-[13px] font-medium leading-snug" style={{ color: "var(--color-text)" }}>
        {result.description}
      </p>

      {/* Regulatory badges */}
      {result.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.badges.map((b) => <RegulatoryBadge key={b.label} {...b} />)}
        </div>
      )}

      {/* Duty table */}
      <DutyTable duties={result.duties} />

      {/* Pourquoi ce code? */}
      <div
        className="flex flex-col gap-2 pt-4"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <span className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
          Pourquoi ce code ?
        </span>
        <p className="text-[12.5px] leading-[1.65]" style={{ color: "var(--color-text-secondary)" }}>
          {result.reasoning}
        </p>
        {result.warning && (
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg mt-1"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}
          >
            <WarningTriangle width={13} height={13} strokeWidth={1.75} style={{ color: "#92400E", flexShrink: 0 }} />
            <p className="text-[12px] font-medium leading-snug" style={{ color: "#92400E" }}>
              {result.warning}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-0.5">
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[12.5px] transition-colors duration-75"
          style={{
            border: "1px solid var(--color-border-strong)",
            background: saved ? "rgba(255,112,181,0.07)" : "transparent",
            color: saved ? "var(--color-primary)" : "var(--color-text-secondary)",
          }}
          onMouseEnter={(e) => {
            if (!saved) {
              (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.04)";
              (e.currentTarget as HTMLElement).style.color = "var(--color-text)";
            }
          }}
          onMouseLeave={(e) => {
            if (!saved) {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
            }
          }}
        >
          <Star
            width={12}
            height={12}
            strokeWidth={saved ? 0 : 1.75}
            fill={saved ? "currentColor" : "none"}
            style={{ color: "inherit" }}
          />
          {saved ? "Sauvegardé" : "Sauvegarder"}
        </button>

        {isTop && onCreateDossier && (
          <button
            onClick={onCreateDossier}
            className="ml-auto flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[12.5px] font-medium transition-colors duration-75"
            style={{
              border: "1px solid rgba(255,112,181,0.3)",
              background: "rgba(255,112,181,0.06)",
              color: "var(--color-primary)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,112,181,0.12)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,112,181,0.06)"; }}
          >
            <Plus width={12} height={12} strokeWidth={2.25} style={{ color: "inherit" }} />
            Créer un dossier
          </button>
        )}
      </div>
    </div>
  );
}

function FileCard({ file, onRemove }: { file: File; onRemove: () => void }) {
  const size = file.size < 1_048_576
    ? `${Math.round(file.size / 1024)} Ko`
    : `${(file.size / 1_048_576).toFixed(1)} Mo`;
  const ext = file.name.split(".").pop()?.toUpperCase() ?? "—";

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
      style={{ border: "1px solid var(--color-border)", background: "rgba(13,15,20,0.01)" }}
    >
      <span className="text-[12.5px] flex-1 min-w-0 truncate" style={{ color: "var(--color-text)" }}>
        {file.name}
      </span>
      <span className="text-[11px] tabular-nums shrink-0" style={{ color: "var(--color-text-tertiary)" }}>
        {size}
      </span>
      <span
        className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
        style={{ background: "rgba(13,15,20,0.05)", color: "var(--color-text-tertiary)" }}
      >
        {ext}
      </span>
      <button
        onClick={onRemove}
        className="shrink-0 size-5 flex items-center justify-center rounded transition-colors duration-75"
        style={{ color: "var(--color-text-tertiary)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-tertiary)"; }}
        aria-label={`Supprimer ${file.name}`}
      >
        <Xmark width={11} height={11} strokeWidth={1.75} />
      </button>
    </div>
  );
}

function PanelEmpty({ message }: { message: string }) {
  return (
    <p className="text-[13px] py-8 text-center" style={{ color: "var(--color-text-tertiary)" }}>
      {message}
    </p>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ClassificateurPage() {
  const { openModal } = useUploadModal();
  const [description, setDescription] = useState("");
  const [taricManuel, setTaricManuel]  = useState("");
  const [origine, setOrigine]          = useState("");
  const [paysExpedition, setPays]      = useState("");
  const [poidsNet, setPoidsNet]        = useState("");
  const [valeurFacture, setValeur]     = useState("");
  const [files, setFiles]              = useState<File[]>([]);
  const [isDragging, setIsDragging]    = useState(false);
  const [hasResults, setHasResults]    = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [activeView, setActiveView]    = useState<"recents" | "favoris" | null>(null);
  const [savedCodes, setSavedCodes]    = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canClassify = description.trim().length > 0 || files.length > 0 || taricManuel.trim().length > 0;

  const handleClassify = useCallback(() => {
    if (!canClassify || isClassifying) return;
    setActiveView(null);
    setIsClassifying(true);
    setTimeout(() => {
      setIsClassifying(false);
      setHasResults(true);
    }, 1500);
  }, [canClassify, isClassifying]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleClassify();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleClassify]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
  }, []);

  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    e.target.value = "";
  };

  const toggleView = (view: "recents" | "favoris") =>
    setActiveView((prev) => (prev === view ? null : view));

  const toggleSave = (code: string) =>
    setSavedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });

  // ── Right panel ─────────────────────────────────────────────────────────────

  function RightPanel() {
    if (activeView === "recents") {
      return (
        <div className="p-6 flex flex-col gap-3">
          <p className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>
            Classifications récentes
          </p>
          {RECENT_ITEMS.length === 0 ? (
            <PanelEmpty message="Aucune classification récente." />
          ) : (
            <div className="flex flex-col gap-0.5">
              {RECENT_ITEMS.map((item) => (
                <button
                  key={item.code}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-75"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.03)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span className="shrink-0 text-[13px] font-medium tabular-nums" style={{ color: "var(--color-text)", minWidth: "84px" }}>
                    {item.code}
                  </span>
                  <span className="flex-1 text-[12.5px] truncate" style={{ color: "var(--color-text-secondary)" }}>
                    {item.description}
                  </span>
                  <span className="shrink-0 text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                    {item.date}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeView === "favoris") {
      return (
        <div className="p-6 flex flex-col gap-3">
          <p className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>
            Mes favoris
          </p>
          {FAVORIS_ITEMS.length === 0 ? (
            <PanelEmpty message="Aucun code sauvegardé." />
          ) : (
            <div className="flex flex-col gap-0.5">
              {FAVORIS_ITEMS.map((item) => (
                <button
                  key={item.code}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-75"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.03)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Star width={11} height={11} strokeWidth={0} fill="currentColor" style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                  <span className="shrink-0 text-[13px] font-medium tabular-nums" style={{ color: "var(--color-text)", minWidth: "84px" }}>
                    {item.code}
                  </span>
                  <span className="flex-1 text-[12.5px] truncate" style={{ color: "var(--color-text-secondary)" }}>
                    {item.description}
                  </span>
                  <span className="shrink-0 text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                    {item.savedAt}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (isClassifying) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 p-12 text-center">
          <div
            className="size-5 rounded-full border-[1.5px] animate-spin"
            style={{ borderColor: "var(--color-border-strong)", borderTopColor: "var(--color-primary)" }}
          />
          <p className="text-[13.5px] font-medium" style={{ color: "var(--color-text)" }}>
            Analyse en cours…
          </p>
          <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
            verdyct-cls/1.02 · TARIC · CBAM · DGDDI
          </p>
        </div>
      );
    }

    if (!hasResults) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 p-12 text-center">
          <div
            className="flex items-center justify-center size-11 rounded-xl"
            style={{ background: "rgba(13,15,20,0.04)", border: "1px solid var(--color-border)" }}
          >
            <Barcode width={20} height={20} strokeWidth={1.5} style={{ color: "var(--color-text-tertiary)" }} />
          </div>
          <p className="text-[14px] font-medium" style={{ color: "var(--color-text)" }}>
            Aucune classification active
          </p>
          <p className="text-[12.5px] max-w-[240px] leading-relaxed" style={{ color: "var(--color-text-tertiary)" }}>
            Décrivez le produit et lancez la classification pour voir les candidats TARIC avec leur raisonnement.
          </p>
        </div>
      );
    }

    return (
      <div className="p-6 flex flex-col gap-5">
        {/* Results header */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>
              3 candidats identifiés en 1,3 s · modèle verdyct-cls/1.02
            </p>
            <button
              className="text-[11.5px] shrink-0 transition-colors duration-75"
              style={{ color: "var(--color-text-tertiary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-tertiary)"; }}
              onClick={() => setHasResults(false)}
            >
              Réinitialiser
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {["TARIC · 12 mai 2026", "CBAM update · janv. 2026", "Jurisprudence DGDDI"].map((src) => (
              <span
                key={src}
                className="text-[11px] px-2 py-0.5 rounded"
                style={{ background: "rgba(13,15,20,0.04)", color: "var(--color-text-tertiary)", border: "1px solid var(--color-border)" }}
              >
                {src}
              </span>
            ))}
          </div>
        </div>

        {/* Result cards */}
        {MOCK_RESULTS.map((result, i) => (
          <ResultCard
            key={result.code}
            result={result}
            isTop={i === 0}
            saved={savedCodes.has(result.code)}
            onSave={() => toggleSave(result.code)}
            onCreateDossier={i === 0 ? () => openModal("manual", [], { hsCode: result.code, description }) : undefined}
            index={i}
          />
        ))}
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="p-6 flex flex-col"
      style={{ background: "var(--color-surface-0)", minHeight: "100%", height: "100%" }}
    >
      {/* Page header */}
      <div className="flex items-start justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-text)" }}>
            Classificateur SH
          </h1>
          <p className="text-[14px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
            Classification TARIC avec raisonnement · sources DGDDI
          </p>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-1.5">
          {(["recents", "favoris"] as const).map((view) => {
            const active = activeView === view;
            const Icon   = view === "recents" ? Clock : Star;
            const label  = view === "recents" ? "Récents" : "Mes favoris";
            return (
              <button
                key={view}
                onClick={() => toggleView(view)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] transition-colors duration-75"
                style={{
                  border: `1px solid ${active ? "var(--color-border-strong)" : "var(--color-border)"}`,
                  background: active ? "rgba(13,15,20,0.05)" : "transparent",
                  color: active ? "var(--color-text)" : "var(--color-text-tertiary)",
                  fontWeight: active ? 500 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.03)";
                    (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--color-text-tertiary)";
                  }
                }}
              >
                <Icon
                  width={13}
                  height={13}
                  strokeWidth={active && view === "favoris" ? 0 : 1.75}
                  fill={active && view === "favoris" ? "currentColor" : "none"}
                  style={{ color: "inherit" }}
                />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2-panel card */}
      <div
        className="flex-1 min-h-0 rounded-xl overflow-hidden grid"
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--color-border)",
          gridTemplateColumns: "400px 1fr",
        }}
      >
        {/* ─── Left: Input ─── */}
        <div
          className="flex flex-col overflow-y-auto border-r"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="p-6 flex flex-col gap-6">

            {/* Section 1 — Description */}
            <div className="flex flex-col gap-4">
              <p className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>
                Description du produit
              </p>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez le produit en français — matière, usage, composition, dimensions, procédé de fabrication… Plus c'est précis, plus la classification est fiable."
                rows={5}
                className="w-full resize-none rounded-lg px-3.5 py-3 text-[13px] leading-[1.6] outline-none placeholder:opacity-55 transition-colors duration-75"
                style={{
                  border: "1px solid var(--color-border-strong)",
                  background: "rgba(13,15,20,0.015)",
                  color: "var(--color-text)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; }}
              />

              <div className="grid grid-cols-2 gap-3">
                <InputField label="Origine" value={origine} onChange={setOrigine} placeholder="ex. Chine" />
                <InputField label="Pays d'expédition" value={paysExpedition} onChange={setPays} placeholder="ex. Hong Kong" />
                <InputField label="Poids net" value={poidsNet} onChange={setPoidsNet} placeholder="0,000" suffix="kg" />
                <InputField label="Valeur facture" value={valeurFacture} onChange={setValeur} placeholder="0,00" suffix="€" />
              </div>

              <InputField
                label="Code TARIC connu (optionnel)"
                value={taricManuel}
                onChange={setTaricManuel}
                placeholder="ex. 7318.15.59 — pour vérification ou validation"
              />
            </div>

            {/* Section 2 — Documents */}
            <div className="flex flex-col gap-3">
              <p className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>
                Documents
              </p>

              <div
                className="rounded-lg flex flex-col items-center justify-center gap-2 py-7 cursor-pointer transition-colors duration-100"
                style={{
                  border: `1.5px dashed ${isDragging ? "var(--color-primary)" : "var(--color-border-strong)"}`,
                  background: isDragging ? "rgba(255,112,181,0.04)" : "rgba(13,15,20,0.015)",
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <CloudUpload
                  width={20}
                  height={20}
                  strokeWidth={1.5}
                  style={{ color: isDragging ? "var(--color-primary)" : "var(--color-text-tertiary)" }}
                />
                <p className="text-[12.5px]" style={{ color: "var(--color-text-secondary)" }}>
                  Déposez vos fichiers ici
                </p>
                <p className="text-[11.5px]" style={{ color: "var(--color-text-tertiary)" }}>
                  Factures · packing lists · certificats — PDF, Excel, images
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInput}
                accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.eml"
              />

              {files.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {files.map((file, idx) => (
                    <FileCard
                      key={`${file.name}-${idx}`}
                      file={file}
                      onRemove={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleClassify}
                disabled={!canClassify || isClassifying}
                className="flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-[13px] font-medium transition-colors duration-75 flex-1"
                style={{
                  background: "var(--color-text)",
                  color: "#FFFFFF",
                  opacity: !canClassify ? 0.38 : 1,
                  cursor: !canClassify ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (canClassify) (e.currentTarget as HTMLElement).style.background = "#1C1E26";
                }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-text)"; }}
              >
                {isClassifying ? "En cours…" : "Classer le produit"}
              </button>

              <KbdGroup className="shrink-0 gap-0.5">
                <Kbd className="bg-[rgba(13,15,20,0.05)] border-0 shadow-none rounded-[5px] text-[10.5px]">⌘</Kbd>
                <Kbd className="bg-[rgba(13,15,20,0.05)] border-0 shadow-none rounded-[5px] text-[10.5px]">↵</Kbd>
              </KbdGroup>
            </div>

          </div>
        </div>

        {/* ─── Right: Results ─── */}
        <div className="flex flex-col overflow-y-auto" style={{ background: "rgba(13,15,20,0.008)" }}>
          <RightPanel />
        </div>
      </div>
    </div>
  );
}
