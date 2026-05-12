"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_DOSSIERS } from "@/components/DossiersTable";
import { DossierDrawer } from "@/components/DossiersTable";

const alerts = [
  {
    id: "cbam-q3",
    type: "CBAM",
    typeColor: "#c2410c",
    title: "Déclaration trimestrielle",
    ref: "#2026-0182",
    description: "7 dossiers acier/aluminium à inclure avant la fenêtre de dépôt du 31 juillet",
    meta: "Échéance dans 84 jours",
    cta: "Préparer le rapport",
    action: "cbam",
  },
  {
    id: "conflit-email",
    type: "Conflit",
    typeColor: "#dc2626",
    title: "Email vs Facture",
    ref: "#2026-0181",
    description: "Incohérence détectée entre l'email importateur et la facture jointe",
    meta: "Détecté il y a 1h",
    cta: "Réconcilier",
    action: "reconcile",
  },
] as const;

export default function AlertesCard() {
  const router = useRouter();
  const [reconcileOpen, setReconcileOpen] = useState(false);

  const conflictDossier = ALL_DOSSIERS.find((d) => d.ref === "#2026-0181") ?? null;

  function handleCta(action: string) {
    if (action === "cbam") {
      router.push("/dashboard/dossiers?statut=CBAM");
    } else if (action === "reconcile") {
      setReconcileOpen(true);
    }
  }

  return (
    <>
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#FFFFFF", border: "1px solid var(--color-border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-5 py-3.5 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span
            className="text-[14px] font-medium tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Alertes Actives
          </span>
          <span
            className="text-[12px] tabular-nums"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            2
          </span>
        </div>

        {/* Alert items */}
        {alerts.map((alert, i) => (
          <div
            key={alert.id}
            className="px-5 py-4"
            style={{
              borderBottom: i < alerts.length - 1 ? "1px solid var(--color-border)" : "none",
            }}
          >
            {/* Type row */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="size-1.5 rounded-full shrink-0"
                style={{ background: alert.typeColor }}
              />
              <span className="text-[12px] font-medium" style={{ color: alert.typeColor }}>
                {alert.type} · {alert.title}
              </span>
              <span
                className="ml-auto text-[12px]"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {alert.ref}
              </span>
            </div>

            {/* Description */}
            <p
              className="text-[13px] leading-snug"
              style={{ color: "var(--color-text)" }}
            >
              {alert.description}
            </p>

            {/* Meta + CTA */}
            <div className="flex flex-col gap-1.5 mt-2.5">
              <span className="text-[12.5px]" style={{ color: "var(--color-text-tertiary)" }}>
                {alert.meta}
              </span>
              <button
                className="text-[13px] font-medium text-left transition-opacity duration-75"
                style={{ color: "var(--color-primary)", width: "fit-content" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                onClick={() => handleCta(alert.action)}
              >
                {alert.cta} →
              </button>
            </div>
          </div>
        ))}
      </div>

      <DossierDrawer
        dossier={conflictDossier}
        open={reconcileOpen}
        onOpenChange={setReconcileOpen}
        scrollToConflict
      />
    </>
  );
}
