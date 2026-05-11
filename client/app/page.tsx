import { Folder, WarningTriangle, Mail, ArrowUp } from "iconoir-react";
import DossiersTable from "@/components/DossiersTable";
import UploadCard from "@/components/UploadCard";
import AlertesCard from "@/components/AlertesCard";

const labelStyle = {
  fontSize: "13px",
  fontWeight: 400,
  color: "var(--color-text-secondary)",
} as const;

const numberStyle = {
  fontSize: "36px",
  fontWeight: 600,
  lineHeight: 1,
  letterSpacing: "-0.03em",
  color: "var(--color-text)",
} as const;

const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid var(--color-border)",
} as const;

const dividerStyle = {
  borderColor: "var(--color-border)",
} as const;

export default function TableauDeBord() {
  return (
    <div className="p-6 min-h-full" style={{ background: "var(--color-surface-0)" }}>
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-text)" }}>
          Bonjour, Julius
        </h1>
        <p className="text-[14px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
          Vendredi 10 mai 2026
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr)" }}
      >
        {/* Card 1 — Total Dossiers */}
        <div className="rounded-xl p-5 flex flex-col justify-between gap-4" style={cardStyle}>
          <div>
            <div className="flex items-center gap-2">
              <Folder width={14} height={14} strokeWidth={1.5} style={{ color: "var(--color-text-tertiary)" }} />
              <span style={labelStyle}>Total Dossiers</span>
            </div>
            <div className="flex items-end gap-3 mt-3">
              <span style={numberStyle}>247</span>
              <div className="flex items-center gap-1 pb-0.5">
                <ArrowUp width={11} height={11} strokeWidth={2.5} style={{ color: "var(--color-primary)" }} />
                <span className="text-[12.5px]" style={{ color: "var(--color-primary)" }}>
                  +18 vs la semaine passée
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t" style={dividerStyle}>
            <div className="flex items-center gap-1.5">
              <span className="text-[14.5px] tabular-nums font-semibold" style={{ color: "#b45309" }}>23</span>
              <span style={labelStyle}>à valider</span>
            </div>
            <span style={labelStyle}>SLA 94%</span>
          </div>
        </div>

        {/* Card 2 — CBAM Flaggés */}
        <div className="rounded-xl p-5 flex flex-col justify-between gap-4" style={cardStyle}>
          <div>
            <div className="flex items-center gap-2">
              <WarningTriangle width={14} height={14} strokeWidth={1.5} style={{ color: "var(--color-text-tertiary)" }} />
              <span style={labelStyle}>CBAM Flaggés</span>
            </div>
            <span className="mt-3 block" style={numberStyle}>7</span>
          </div>
          <div className="flex items-center gap-2 pt-3 border-t" style={dividerStyle}>
            <span className="text-[12.5px]" style={{ color: "var(--color-text-secondary)" }}>
              <span style={{ color: "var(--color-text)" }}>3</span> Acier
            </span>
            <span className="text-[11px]" style={{ color: "var(--color-border-strong)" }}>·</span>
            <span className="text-[12.5px]" style={{ color: "var(--color-text-secondary)" }}>
              <span style={{ color: "var(--color-text)" }}>2</span> Aluminium
            </span>
            <span className="text-[11px]" style={{ color: "var(--color-border-strong)" }}>·</span>
            <span className="text-[12.5px]" style={{ color: "var(--color-text-secondary)" }}>
              <span style={{ color: "var(--color-text)" }}>2</span> Ciment
            </span>
          </div>
        </div>

        {/* Card 3 — Conflits Email */}
        <div className="rounded-xl p-5 flex flex-col justify-between gap-4" style={cardStyle}>
          <div>
            <div className="flex items-center gap-2">
              <Mail width={14} height={14} strokeWidth={1.5} style={{ color: "var(--color-text-tertiary)" }} />
              <span style={labelStyle}>Conflits Email</span>
            </div>
            <span className="mt-3 block" style={numberStyle}>4</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t" style={dividerStyle}>
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 rounded-full shrink-0" style={{ background: "#f59e0b" }} />
              <span className="text-[12.5px]" style={{ color: "var(--color-text-secondary)" }}>+2 aujourd'hui</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dossiers récents + right column ── */}
      <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <DossiersTable />
        <div className="flex flex-col gap-3">
          <UploadCard />
          <AlertesCard />
        </div>
      </div>
    </div>
  );
}
