"use client";

import { use, useState } from "react";
import Link from "next/link";
import { NavArrowRight, EditPencil, Mail, Phone, Shield, WarningTriangle } from "iconoir-react";
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
  acier: "Acier", alu: "Aluminium", ciment: "Ciment", engrais: "Engrais",
};

const statutConfig = {
  "Validé":     { bg: "rgba(22,163,74,0.08)",  color: "#15803d" },
  "En attente": { bg: "rgba(217,119,6,0.09)",  color: "#b45309" },
  "CBAM":       { bg: "rgba(234,88,12,0.08)",  color: "#c2410c" },
  "Conflit":    { bg: "rgba(220,38,38,0.08)",  color: "#dc2626" },
} as const;

const auditTypeConfig = {
  email:    { label: "Email", bg: "rgba(59,130,246,0.08)",  color: "#2563eb" },
  document: { label: "Document", bg: "rgba(22,163,74,0.08)", color: "#15803d" },
  conflit:  { label: "Conflit",  bg: "rgba(220,38,38,0.08)", color: "#dc2626" },
  code:     { label: "Code HS",  bg: "rgba(13,15,20,0.06)",  color: "var(--color-text-secondary)" },
  relance:  { label: "Relance",  bg: "rgba(234,88,12,0.08)", color: "#c2410c" },
} as const;

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ nom, size = 48 }: { nom: string; size?: number }) {
  const color = getAvatarColor(nom);
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: color }}
    >
      <span style={{ fontSize: size * 0.35, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em" }}>
        {getInitials(nom)}
      </span>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--color-text)" }}>{title}</h2>
        {subtitle && <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditModal({ imp, open, onClose }: { imp: Importateur; open: boolean; onClose: () => void }) {
  const contact = imp.contacts[0];
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[480px] p-0 overflow-hidden gap-0"
        style={{ background: "#FFFFFF", border: "1px solid var(--color-border)", boxShadow: "0 8px 40px rgba(13,15,20,0.09)" }}
      >
        <DialogTitle className="sr-only">Modifier l'importateur</DialogTitle>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-[14px] font-medium tracking-tight" style={{ color: "var(--color-text)" }}>
            Modifier l'importateur
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
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Nom de la société", defaultValue: imp.nom },
              { label: "Ville", defaultValue: imp.ville },
              { label: "SIREN", defaultValue: imp.siren },
              { label: "EORI", defaultValue: imp.eori },
            ].map(({ label, defaultValue }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <label className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>{label}</label>
                <Input
                  defaultValue={defaultValue}
                  className="h-9 text-[13px] focus-visible:ring-0 focus-visible:shadow-none"
                  style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text)", background: "transparent" }}
                />
              </div>
            ))}
          </div>
          {contact && (
            <div className="pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
              <p className="text-[11px] mb-3" style={{ color: "var(--color-text-tertiary)" }}>Contact principal</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Nom", defaultValue: contact.nom },
                  { label: "Role", defaultValue: contact.role },
                  { label: "Email", defaultValue: contact.email },
                  { label: "Téléphone", defaultValue: contact.telephone },
                ].map(({ label, defaultValue }) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <label className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>{label}</label>
                    <Input
                      defaultValue={defaultValue}
                      className="h-9 text-[13px] focus-visible:ring-0 focus-visible:shadow-none"
                      style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text)", background: "transparent" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={onClose}
              className="flex-1 h-9 rounded-lg text-[13px] transition-colors duration-75"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.04)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              Annuler
            </button>
            <button
              onClick={onClose}
              className="flex-1 h-9 rounded-lg text-[13px] font-medium transition-opacity duration-75"
              style={{ background: "var(--color-text)", color: "#FFFFFF" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              Enregistrer
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "produits" | "dossiers" | "contacts" | "bti" | "cbam" | "audit";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ImportateurFiche({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const imp = IMPORTATEURS.find(i => i.id === id);
  const [activeTab, setActiveTab] = useState<Tab>("produits");
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  if (!imp) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-full" style={{ background: "var(--color-surface-0)" }}>
        <p className="text-[15px] font-medium" style={{ color: "var(--color-text)" }}>Importateur introuvable</p>
        <Link href="/dashboard/importateurs" className="mt-2 text-[13px]" style={{ color: "var(--color-primary)" }}>
          Retour a la liste
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "produits", label: "Produits récurrents" },
    { key: "dossiers", label: "Historique" },
    { key: "contacts", label: "Contacts" },
    { key: "bti", label: `BTI${imp.btis.length > 0 ? ` (${imp.btis.length})` : ""}` },
    ...(imp.cbamTypes.length > 0 ? [{ key: "cbam" as Tab, label: "CBAM" }] : []),
    { key: "audit", label: "Audit" },
  ];

  return (
    <div className="min-h-full" style={{ background: "var(--color-surface-0)" }}>
      <div className="px-6 pt-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 mb-5">
          <Link
            href="/dashboard/importateurs"
            className="text-[13px] transition-colors duration-75"
            style={{ color: "var(--color-text-tertiary)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-tertiary)"; }}
          >
            Importateurs
          </Link>
          <NavArrowRight width={11} height={11} strokeWidth={1.75} style={{ color: "var(--color-text-tertiary)" }} />
          <span className="text-[13px]" style={{ color: "var(--color-text)" }}>{imp.nom}</span>
        </nav>

        {/* Hero header */}
        <div className="rounded-xl p-6 mb-5" style={{ background: "#FFFFFF", border: "1px solid var(--color-border)" }}>
          <div className="flex items-start gap-4">
            <Avatar nom={imp.nom} size={52} />
            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-semibold tracking-tight leading-tight" style={{ color: "var(--color-text)" }}>
                {imp.nom}
              </h1>
              <p className="text-[13.5px] mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                {imp.ville} · SIREN {imp.siren} · EORI {imp.eori}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {imp.cbamTypes.map(t => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "rgba(255,112,181,0.1)", color: "var(--color-primary)" }}>
                    CBAM {CBAM_LABEL[t]}
                  </span>
                ))}
                {imp.conflitsOuverts > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
                    {imp.conflitsOuverts} conflit{imp.conflitsOuverts > 1 ? "s" : ""} ouvert{imp.conflitsOuverts > 1 ? "s" : ""}
                  </span>
                )}
                {imp.origines.map(o => (
                  <span key={o} className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "rgba(13,15,20,0.05)", color: "var(--color-text-secondary)" }}>
                    {o}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 h-8 px-3 rounded-lg text-[13px] transition-colors duration-75 shrink-0"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.04)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
            >
              <EditPencil width={12} height={12} strokeWidth={1.5} />
              Modifier
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-px mt-6 rounded-lg overflow-hidden" style={{ background: "var(--color-border)" }}>
            {[
              { label: "Dossiers total", value: imp.dossiersTotal.toLocaleString("fr") },
              { label: "Taux d'acceptation", value: `${imp.tauxAcceptance}%` },
              { label: "Valeur cette année", value: formatValeur(imp.valeurAnnee) },
              { label: "Exposition CBAM", value: imp.cbamTypes.length > 0 ? imp.cbamTypes.map(t => CBAM_LABEL[t]).join(", ") : "Aucune" },
            ].map(({ label, value }, i) => (
              <div key={label} className="flex flex-col gap-1 px-5 py-4" style={{ background: "#FFFFFF" }}>
                <span className="text-[11.5px]" style={{ color: "var(--color-text-tertiary)" }}>{label}</span>
                <span
                  className="text-[18px] font-semibold leading-tight"
                  style={{
                    letterSpacing: "-0.02em",
                    color: i === 3 && imp.cbamTypes.length > 0 ? "var(--color-primary)" : "var(--color-text)",
                    fontSize: i === 3 && imp.cbamTypes.length > 0 ? "13px" : "18px",
                    fontWeight: i === 3 && imp.cbamTypes.length > 0 ? 500 : 600,
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky tab nav */}
      <div
        className="sticky top-0 z-10 px-6 border-b"
        style={{ background: "var(--color-surface-0)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-3 py-3 text-[13px] transition-colors duration-75 relative whitespace-nowrap"
              style={{
                color: activeTab === tab.key ? "var(--color-text)" : "var(--color-text-tertiary)",
                fontWeight: activeTab === tab.key ? 500 : 400,
              }}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "var(--color-text)" }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-6 py-6">

        {/* ── Produits récurrents ── */}
        {activeTab === "produits" && (
          <Section
            title="Produits récurrents"
            subtitle={`${imp.produitsRecurrents.length} produits importés régulièrement - données issues de l'historique des dossiers.`}
          >
            <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--color-border)" }}>
              <div
                className="grid items-center px-5 py-2.5 border-b"
                style={{ gridTemplateColumns: "1fr 100px 100px 130px 120px 80px", borderColor: "var(--color-border)" }}
              >
                {["Description", "Code HS", "Utilisations", "Derniere utilisation", "Taux acceptance", ""].map(col => (
                  <span key={col} className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>{col}</span>
                ))}
              </div>
              {imp.produitsRecurrents.map((p, i, arr) => (
                <div
                  key={p.codeHS}
                  onMouseEnter={() => setHoveredRow(`prod-${i}`)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className="grid items-center px-5 transition-colors duration-75"
                  style={{
                    gridTemplateColumns: "1fr 100px 100px 130px 120px 80px",
                    height: 44,
                    background: hoveredRow === `prod-${i}` ? "rgba(13,15,20,0.02)" : "transparent",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none",
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    <span className="text-[13px] truncate" style={{ color: "var(--color-text)" }}>{p.description}</span>
                    {p.btiRef && (
                      <span className="text-[10.5px] px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(59,130,246,0.08)", color: "#2563eb" }}>
                        BTI
                      </span>
                    )}
                  </div>
                  <span className="text-[12.5px]" style={{ color: "var(--color-text-secondary)" }}>{p.codeHS}</span>
                  <span className="text-[13px] tabular-nums" style={{ color: "var(--color-text)" }}>{p.utilisations}x</span>
                  <span className="text-[12.5px]" style={{ color: "var(--color-text-tertiary)" }}>
                    {new Date(p.derniereUtilisation).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(13,15,20,0.06)", maxWidth: 60 }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${p.tauxAcceptance}%`,
                          background: p.tauxAcceptance >= 95 ? "#16a34a" : p.tauxAcceptance >= 85 ? "#d97706" : "#dc2626",
                        }}
                      />
                    </div>
                    <span className="text-[12.5px] tabular-nums" style={{ color: "var(--color-text-secondary)" }}>{p.tauxAcceptance}%</span>
                  </div>
                  <div>
                    {p.btiRef && (
                      <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>{p.btiRef}</span>
                    )}
                  </div>
                </div>
              ))}
              {imp.produitsRecurrents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <p className="text-[14px] font-medium" style={{ color: "var(--color-text)" }}>Aucun produit enregistré</p>
                  <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>Les produits apparaissent après traitement des premiers dossiers.</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ── Historique dossiers ── */}
        {activeTab === "dossiers" && (
          <Section title="Historique des dossiers" subtitle={`Derniers ${imp.dossiersHistorique.length} dossiers traités pour cet importateur.`}>
            <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--color-border)" }}>
              <div
                className="grid items-center px-5 py-2.5 border-b"
                style={{ gridTemplateColumns: "130px 110px 120px 110px 80px 1fr", borderColor: "var(--color-border)" }}
              >
                {["Référence", "Date", "Statut", "Valeur", "Origine", "Flags"].map(col => (
                  <span key={col} className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>{col}</span>
                ))}
              </div>
              {imp.dossiersHistorique.map((d, i, arr) => {
                const badge = statutConfig[d.statut];
                return (
                  <div
                    key={d.ref}
                    onMouseEnter={() => setHoveredRow(`dos-${i}`)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className="grid items-center px-5 cursor-pointer transition-colors duration-75"
                    style={{
                      gridTemplateColumns: "130px 110px 120px 110px 80px 1fr",
                      height: 44,
                      background: hoveredRow === `dos-${i}` ? "rgba(13,15,20,0.02)" : "transparent",
                      borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none",
                    }}
                  >
                    <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>{d.ref}</span>
                    <span className="text-[12.5px]" style={{ color: "var(--color-text-tertiary)" }}>
                      {new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <div>
                      <span className="inline-flex text-[12px] px-2 py-0.5 rounded-md" style={{ background: badge.bg, color: badge.color }}>
                        {d.statut}
                      </span>
                    </div>
                    <span className="text-[13px] tabular-nums" style={{ color: "var(--color-text)" }}>{formatValeur(d.valeur)}</span>
                    <span className="text-[12.5px]" style={{ color: "var(--color-text-secondary)" }}>{d.origine}</span>
                    <div className="flex items-center gap-1">
                      {d.flags.length === 0 ? (
                        <span style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>-</span>
                      ) : d.flags.map(flag => (
                        <span key={flag} className="text-[11.5px] px-1.5 py-0.5 rounded" style={{ background: "rgba(13,15,20,0.05)", color: "var(--color-text-secondary)" }}>
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── Contacts ── */}
        {activeTab === "contacts" && (
          <Section title="Contacts" subtitle="Personnes a contacter pour les informations manquantes et relances.">
            <div className="flex flex-col gap-3">
              {imp.contacts.map((c, i) => (
                <div
                  key={i}
                  className="rounded-xl p-5"
                  style={{ background: "#FFFFFF", border: "1px solid var(--color-border)" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div>
                        <p className="text-[14px] font-medium" style={{ color: "var(--color-text)" }}>{c.nom}</p>
                        <p className="text-[12.5px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>{c.role}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <Mail width={12} height={12} strokeWidth={1.5} style={{ color: "var(--color-text-tertiary)" }} />
                          <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>{c.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone width={12} height={12} strokeWidth={1.5} style={{ color: "var(--color-text-tertiary)" }} />
                          <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>{c.telephone}</span>
                        </div>
                      </div>
                    </div>
                    {c.derniereRelance && (
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className="text-[11.5px] px-2 py-0.5 rounded-md"
                          style={
                            c.statut === "repondu"
                              ? { background: "rgba(22,163,74,0.08)", color: "#15803d" }
                              : { background: "rgba(217,119,6,0.09)", color: "#b45309" }
                          }
                        >
                          {c.statut === "repondu" ? "Repondu" : "En attente"}
                        </span>
                        <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                          Relance le {new Date(c.derniereRelance).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {imp.contacts.length === 0 && (
                <div className="rounded-xl py-16 flex flex-col items-center gap-2" style={{ background: "#FFFFFF", border: "1px solid var(--color-border)" }}>
                  <p className="text-[14px] font-medium" style={{ color: "var(--color-text)" }}>Aucun contact enregistré</p>
                  <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>Ajoutez un contact pour activer les relances automatiques.</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ── BTI ── */}
        {activeTab === "bti" && (
          <Section
            title="Binding Tariff Information"
            subtitle="Engagements tarifaires contraignants. Ces codes doivent être utilisés et ne peuvent pas être remplacés."
          >
            {imp.btis.length === 0 ? (
              <div className="rounded-xl py-16 flex flex-col items-center gap-2" style={{ background: "#FFFFFF", border: "1px solid var(--color-border)" }}>
                <Shield width={20} height={20} strokeWidth={1.5} style={{ color: "var(--color-text-tertiary)" }} />
                <p className="text-[14px] font-medium" style={{ color: "var(--color-text)" }}>Aucun BTI enregistré</p>
                <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>Les BTI sont ajoutés automatiquement lors de leur détection dans les dossiers.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {imp.btis.map((bti, i) => {
                  const expiry = new Date(bti.validiteFin);
                  const daysLeft = Math.ceil((expiry.getTime() - new Date("2026-05-13").getTime()) / (1000 * 60 * 60 * 24));
                  const isExpiringSoon = daysLeft < 180;
                  return (
                    <div
                      key={i}
                      className="rounded-xl p-5"
                      style={{ background: "#FFFFFF", border: "1px solid var(--color-border)" }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>{bti.reference}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "rgba(59,130,246,0.08)", color: "#2563eb" }}>BTI</span>
                          </div>
                          <p className="text-[13.5px]" style={{ color: "var(--color-text-secondary)" }}>{bti.description}</p>
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="text-[11px] block mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>Code HS</span>
                              <span className="text-[13px]" style={{ color: "var(--color-text)" }}>{bti.codeHS}</span>
                            </div>
                            <div>
                              <span className="text-[11px] block mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>Source</span>
                              <span className="text-[13px]" style={{ color: "var(--color-text)" }}>{bti.source}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span
                            className="text-[11.5px] px-2 py-0.5 rounded-md"
                            style={isExpiringSoon
                              ? { background: "rgba(217,119,6,0.09)", color: "#b45309" }
                              : { background: "rgba(22,163,74,0.08)", color: "#15803d" }
                            }
                          >
                            {isExpiringSoon ? `Expire dans ${daysLeft}j` : "Valide"}
                          </span>
                          <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                            Jusqu'au {expiry.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        )}

        {/* ── CBAM ── */}
        {activeTab === "cbam" && imp.cbamTypes.length > 0 && (
          <Section title="Exposition CBAM" subtitle="Suivi des obligations de déclaration carbone aux frontières.">
            <div className="flex flex-col gap-3">
              {/* Deadline alert */}
              <div
                className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)" }}
              >
                <WarningTriangle width={16} height={16} strokeWidth={1.5} style={{ color: "#c2410c", flexShrink: 0 }} />
                <div>
                  <p className="text-[13.5px] font-medium" style={{ color: "#c2410c" }}>Prochaine échéance CBAM - 31 mai 2026</p>
                  <p className="text-[12.5px] mt-0.5" style={{ color: "rgba(194,65,12,0.8)" }}>
                    Declaration T1 2026 a soumettre dans 18 jours. {imp.dossiersHistorique.filter(d => d.flags.includes("CBAM")).length} dossier{imp.dossiersHistorique.filter(d => d.flags.includes("CBAM")).length > 1 ? "s" : ""} concerné{imp.dossiersHistorique.filter(d => d.flags.includes("CBAM")).length > 1 ? "s" : ""}.
                  </p>
                </div>
              </div>

              {/* Materials table */}
              <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--color-border)" }}>
                <div
                  className="grid items-center px-5 py-2.5 border-b"
                  style={{ gridTemplateColumns: "1fr 120px 140px 100px", borderColor: "var(--color-border)" }}
                >
                  {["Matière", "Dossiers concernés", "Masse CO2 déclarée", "Statut"].map(col => (
                    <span key={col} className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>{col}</span>
                  ))}
                </div>
                {imp.cbamTypes.map((t, i, arr) => (
                  <div
                    key={t}
                    className="grid items-center px-5"
                    style={{
                      gridTemplateColumns: "1fr 120px 140px 100px",
                      height: 44,
                      borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "rgba(255,112,181,0.1)", color: "var(--color-primary)" }}>
                        CBAM
                      </span>
                      <span className="text-[13px]" style={{ color: "var(--color-text)" }}>{CBAM_LABEL[t]}</span>
                    </div>
                    <span className="text-[13px] tabular-nums" style={{ color: "var(--color-text)" }}>
                      {imp.dossiersHistorique.filter(d => d.flags.includes("CBAM")).length}
                    </span>
                    <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>En cours</span>
                    <span className="text-[11.5px] px-2 py-0.5 rounded-md w-fit" style={{ background: "rgba(217,119,6,0.09)", color: "#b45309" }}>
                      A déclarer
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* ── Audit trail ── */}
        {activeTab === "audit" && (
          <Section title="Audit trail" subtitle="Toutes les interactions Verdyct avec cet importateur. Exportable pour controle douanier.">
            <div className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--color-border)" }}>
              {imp.auditTrail.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <p className="text-[14px] font-medium" style={{ color: "var(--color-text)" }}>Aucune entrée</p>
                  <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>Les interactions seront enregistrées automatiquement.</p>
                </div>
              ) : imp.auditTrail.map((entry, i, arr) => {
                const config = auditTypeConfig[entry.type];
                return (
                  <div
                    key={i}
                    className="flex items-start gap-4 px-5 py-3.5"
                    style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none" }}
                  >
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-md shrink-0 mt-0.5"
                      style={{ background: config.bg, color: config.color }}
                    >
                      {config.label}
                    </span>
                    <span className="text-[13px] flex-1" style={{ color: "var(--color-text)" }}>{entry.description}</span>
                    <span className="text-[12px] shrink-0 tabular-nums" style={{ color: "var(--color-text-tertiary)" }}>
                      {new Date(entry.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                );
              })}
            </div>
            {imp.auditTrail.length > 0 && (
              <button
                className="h-8 px-4 rounded-lg text-[13px] transition-colors duration-75 w-fit"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.04)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
              >
                Exporter en PDF
              </button>
            )}
          </Section>
        )}

      </div>

      <EditModal imp={imp} open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
