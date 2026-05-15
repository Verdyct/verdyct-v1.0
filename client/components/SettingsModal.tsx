"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  User, Building, CreditCard, Bell, Camera, Xmark, Check, ArrowRight, OpenNewWindow,
} from "iconoir-react";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";
import { useSettingsModal } from "@/lib/settings-modal-context";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Section = "compte" | "cabinet" | "facturation" | "notifications";

// ─── Nav ───────────────────────────────────────────────────────────────────────

const NAV: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: "compte",        label: "Mon compte",    icon: User },
  { key: "cabinet",       label: "Mon cabinet",   icon: Building },
  { key: "facturation",   label: "Facturation",   icon: CreditCard },
  { key: "notifications", label: "Notifications", icon: Bell },
];

// ─── Shared primitives ─────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
      {children}
    </label>
  );
}

function Divider() {
  return <div className="h-px my-6" style={{ background: "var(--color-border)" }} />;
}

function BlockHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-wider uppercase mb-4" style={{ color: "var(--color-text-tertiary)" }}>
      {children}
    </p>
  );
}

function SaveButton() {
  const [saved, setSaved] = useState(false);
  function handle() { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  return (
    <button
      onClick={handle}
      className="flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-medium transition-opacity duration-75"
      style={{ background: "var(--color-primary)", color: "#fff" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
    >
      {saved && <Check width={13} height={13} strokeWidth={2.25} />}
      {saved ? "Enregistré" : "Enregistrer"}
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 rounded-full transition-colors duration-150"
      style={{ width: 36, height: 20, background: checked ? "var(--color-primary)" : "rgba(13,15,20,0.12)" }}
    >
      <span
        className="absolute top-0.5 rounded-full transition-transform duration-150"
        style={{
          left: 2, width: 16, height: 16, background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          transform: checked ? "translateX(16px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

// ─── Upgrade modal ─────────────────────────────────────────────────────────────

const PLANS = [
  {
    key: "starter",
    label: "Starter",
    price: "149",
    tagline: "Pour les commissionnaires solo",
    popular: false,
    features: [
      "Dossiers illimités",
      "Traitement IA multi-format (PDF, Excel, email, images)",
      "Classification SH avec raisonnement sourced",
      "Vérification de cohérence",
      "Détection de conflits email",
      "Conformité CBAM automatique",
      "Nomenclatures TARIC complètes",
      "Adresse email de transfert dédiée",
      "1 utilisateur",
    ],
  },
  {
    key: "pro",
    label: "Pro",
    price: "249",
    tagline: "Pour les cabinets en croissance",
    popular: true,
    features: [
      "Tout le Starter",
      "Portail client (liens lecture seule pour vos importateurs)",
      "Réconciliation de factures",
      "Classificateur SH avancé avec favoris",
      "Journal d'activité complet",
      "Jusqu'à 3 utilisateurs",
    ],
  },
  {
    key: "team",
    label: "Team",
    price: "499",
    tagline: "Pour les cabinets multi-déclarants",
    popular: false,
    features: [
      "Tout le Pro",
      "Agent email IA (lecture et traitement automatique de la boîte)",
      "Branding personnalisé sur le portail client",
      "Support prioritaire",
      "Jusqu'à 10 utilisateurs",
    ],
  },
];

function UpgradeModal({
  open,
  onClose,
  currentPlan,
}: {
  open: boolean;
  onClose: () => void;
  currentPlan: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[80] bg-black/40"
          style={{ backdropFilter: "blur(4px)" }}
        />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[81] flex flex-col outline-none"
          style={{ background: "#FFFFFF" }}
          aria-describedby={undefined}
        >
          <div className="flex flex-col h-full">
            {/* Close — top-right corner only */}
            <div className="flex justify-end px-6 pt-5 pb-0 shrink-0">
              <button
                onClick={onClose}
                className="flex items-center justify-center size-7 rounded-lg transition-colors duration-75"
                style={{ color: "var(--color-text-tertiary)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Xmark width={15} height={15} strokeWidth={1.75} />
              </button>
            </div>

            {/* Plans — centred in remaining space */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-8 gap-8">
              {/* Title above cards */}
              <div className="text-center">
                <DialogPrimitive.Title className="text-[22px] font-semibold tracking-tight" style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}>
                  Choisissez votre plan
                </DialogPrimitive.Title>
              </div>

              <div className="grid grid-cols-3 w-full divide-x" style={{ maxWidth: 960, border: "1px solid var(--color-border)", borderRadius: 16, overflow: "hidden" }}>
              {PLANS.map((plan) => {
                const isCurrent = plan.key === currentPlan;
                const isPop = plan.popular;
                return (
                  <div
                    key={plan.key}
                    className="flex flex-col p-8"
                    style={{ background: isPop ? "rgba(255,112,181,0.025)" : "transparent" }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[15px] font-semibold" style={{ color: "var(--color-text)" }}>
                        {plan.label}
                      </span>
                      {isPop && (
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(255,112,181,0.12)", color: "var(--color-primary)" }}
                        >
                          Plus populaire
                        </span>
                      )}
                    </div>
                    <div className="mb-0.5">
                      <span className="text-[32px] font-semibold tracking-tight" style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}>
                        {plan.price} €
                      </span>
                      <span className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>/mois</span>
                    </div>
                    <p className="text-[12px] mb-6" style={{ color: "var(--color-text-tertiary)" }}>
                      {plan.tagline}
                    </p>
                    <ul className="flex flex-col gap-2.5 flex-1 mb-7">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5">
                          <Check
                            width={12} height={12} strokeWidth={2.5}
                            className="shrink-0"
                            style={{ color: isPop ? "var(--color-primary)" : "var(--color-text-tertiary)" }}
                          />
                          <span
                            className="text-[12.5px]"
                            style={{ color: isPop ? "var(--color-primary)" : "var(--color-text-secondary)" }}
                          >
                            {f}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <button
                      className="w-full h-9 rounded-lg text-[13px] font-medium transition-opacity duration-75"
                      disabled={isCurrent}
                      style={{
                        background: isCurrent && isPop
                          ? "rgba(255,112,181,0.12)"
                          : isCurrent
                            ? "rgba(13,15,20,0.06)"
                            : isPop
                              ? "var(--color-primary)"
                              : "rgba(13,15,20,0.08)",
                        color: isCurrent && isPop
                          ? "var(--color-primary)"
                          : isCurrent
                            ? "var(--color-text-tertiary)"
                            : isPop
                              ? "#fff"
                              : "var(--color-text)",
                        cursor: isCurrent ? "default" : "pointer",
                      }}
                      onMouseEnter={(e) => { if (!isCurrent) (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                    >
                      {isCurrent ? "Votre plan actuel" : "Choisir ce plan"}
                    </button>
                  </div>
                );
              })}
              </div>

              <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                Tous les plans incluent un essai de 14 jours. Annulation a tout moment.
              </p>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── Section: Mon compte ───────────────────────────────────────────────────────

function MonCompte() {
  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <div
          className="size-14 rounded-full flex items-center justify-center text-[16px] font-semibold shrink-0"
          style={{ background: "rgba(255,112,181,0.1)", color: "var(--color-primary)" }}
        >
          JP
        </div>
        <div>
          <button
            className="flex items-center gap-1.5 text-[13px] transition-colors duration-75"
            style={{ color: "var(--color-text-secondary)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
          >
            <Camera width={13} height={13} strokeWidth={1.75} />
            Changer la photo
          </button>
          <p className="text-[11.5px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>JPG ou PNG, max 2 Mo</p>
        </div>
      </div>

      <Divider />
      <BlockHeading>Identite</BlockHeading>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div><FieldLabel>Prenom</FieldLabel><Input defaultValue="Julius" className="h-9 text-[13px]" /></div>
        <div><FieldLabel>Nom</FieldLabel><Input defaultValue="Peschard" className="h-9 text-[13px]" /></div>
      </div>
      <div className="mb-6">
        <FieldLabel>Adresse e-mail</FieldLabel>
        <Input defaultValue="julius@verdyct.io" className="h-9 text-[13px]" />
      </div>

      <Divider />
      <BlockHeading>Mot de passe</BlockHeading>

      <div className="flex flex-col gap-3 mb-6">
        <div><FieldLabel>Mot de passe actuel</FieldLabel><Input type="password" placeholder="••••••••" className="h-9 text-[13px]" /></div>
        <div><FieldLabel>Nouveau mot de passe</FieldLabel><Input type="password" placeholder="••••••••" className="h-9 text-[13px]" /></div>
        <div><FieldLabel>Confirmer le nouveau mot de passe</FieldLabel><Input type="password" placeholder="••••••••" className="h-9 text-[13px]" /></div>
      </div>

      <SaveButton />
    </div>
  );
}

// ─── Section: Mon cabinet ──────────────────────────────────────────────────────

function MonCabinet() {
  const FORWARDING = "dossiers+cab123@in.verdyct.io";
  return (
    <div className="max-w-lg">
      <BlockHeading>Informations du cabinet</BlockHeading>
      <div className="flex flex-col gap-3 mb-6">
        <div><FieldLabel>Raison sociale</FieldLabel><Input defaultValue="Cabinet Peschard Douane" className="h-9 text-[13px]" /></div>
        <div><FieldLabel>SIREN</FieldLabel><Input defaultValue="123 456 789" className="h-9 text-[13px]" /></div>
        <div><FieldLabel>Adresse</FieldLabel><Input defaultValue="12 rue des Entrepreneurs" className="h-9 text-[13px]" /></div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1"><FieldLabel>Code postal</FieldLabel><Input defaultValue="14000" className="h-9 text-[13px]" /></div>
          <div className="col-span-2"><FieldLabel>Ville</FieldLabel><Input defaultValue="Caen" className="h-9 text-[13px]" /></div>
        </div>
      </div>

      <Divider />
      <BlockHeading>Logo du cabinet</BlockHeading>
      <div
        className="flex flex-col items-center justify-center rounded-xl p-6 mb-6 cursor-pointer transition-colors duration-75"
        style={{ border: "1.5px dashed var(--color-border-strong)", background: "transparent" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.03)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <p className="text-[13px] font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Deposer votre logo ici</p>
        <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>SVG, PNG ou JPG, max 1 Mo - utilise dans le portail client</p>
      </div>

      <Divider />
      <BlockHeading>Transfert e-mail</BlockHeading>
      <p className="text-[13px] mb-3" style={{ color: "var(--color-text-secondary)" }}>
        Transférez vos e-mails de dossiers vers cette adresse. Verdyct crée automatiquement un dossier et attache les pièces jointes.
      </p>
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
        style={{ background: "transparent", border: "1px solid var(--color-border)" }}
      >
        <span className="flex-1 text-[13px] font-medium" style={{ color: "var(--color-text)" }}>{FORWARDING}</span>
        <CopyButton text={FORWARDING} />
      </div>

      <div className="mt-6"><SaveButton /></div>
    </div>
  );
}

// ─── Section: Facturation ──────────────────────────────────────────────────────

const INVOICES = [
  { date: "1 mai 2026",  amount: "249,00 €", status: "Payé"      },
  { date: "1 avr. 2026", amount: "249,00 €", status: "Payé"      },
  { date: "1 mars 2026", amount: "249,00 €", status: "Payé"      },
  { date: "1 fev. 2026", amount: "74,00 €",  status: "Payé"      },
];

function BillingInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[12.5px] w-28 shrink-0" style={{ color: "var(--color-text-tertiary)" }}>{label}</span>
      <span className="text-[12.5px]" style={{ color: "var(--color-text)" }}>{value}</span>
    </div>
  );
}

function Facturation() {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [editingBilling, setEditingBilling] = useState(false);
  const currentPlan = "pro";

  return (
    <div className="max-w-lg">

      {/* Current plan */}
      <BlockHeading>Abonnement actuel</BlockHeading>
      <div
        className="rounded-xl p-5 mb-6"
        style={{ border: "1px solid var(--color-border)", background: "transparent" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[15px] font-semibold" style={{ color: "var(--color-text)" }}>Plan Pro</span>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(255,112,181,0.1)", color: "var(--color-primary)" }}
              >
                Actuel
              </span>
            </div>
            <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
              249 €/mois - Renouvellement le 1 juin 2026
            </p>
          </div>
          <button
            onClick={() => setUpgradeOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium shrink-0 transition-colors duration-75"
            style={{ border: "1px solid var(--color-border-strong)", color: "var(--color-text-secondary)", background: "transparent" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.04)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
          >
            Gérer mon abonnement
            <ArrowRight width={11} height={11} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} currentPlan={currentPlan} />

      <Divider />

      {/* Billing history */}
      <BlockHeading>Historique de facturation</BlockHeading>
      <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid var(--color-border)" }}>
        <div
          className="grid px-4 py-2.5 border-b"
          style={{ gridTemplateColumns: "1fr 100px 80px 40px", borderColor: "var(--color-border)", background: "transparent" }}
        >
          {["Date", "Montant", "Statut", ""].map((h) => (
            <span key={h} className="text-[11.5px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>{h}</span>
          ))}
        </div>
        {INVOICES.map((inv, i) => (
          <div
            key={i}
            className="grid items-center px-4 py-3"
            style={{
              gridTemplateColumns: "1fr 100px 80px 40px",
              borderBottom: i < INVOICES.length - 1 ? "1px solid var(--color-border)" : "none",
            }}
          >
            <span className="text-[13px]" style={{ color: "var(--color-text)" }}>{inv.date}</span>
            <span className="text-[13px]" style={{ color: "var(--color-text)" }}>{inv.amount}</span>
            <span>
              <span
                className="text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  background: inv.status === "Payé" ? "rgba(22,163,74,0.08)" : "rgba(217,119,6,0.09)",
                  color:      inv.status === "Payé" ? "#15803d"               : "#b45309",
                }}
              >
                {inv.status}
              </span>
            </span>
            <button
              className="flex items-center gap-1 text-[12px] transition-colors duration-75"
              style={{ color: "var(--color-text-tertiary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-tertiary)"; }}
            >
              Voir
              <OpenNewWindow width={10} height={10} strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </div>

      <Divider />

      {/* Billing information */}
      <div className="flex items-center justify-between mb-4">
        <BlockHeading>Informations de facturation</BlockHeading>
        <button
          onClick={() => setEditingBilling(e => !e)}
          className="text-[12.5px] transition-colors duration-75 -mt-4"
          style={{ color: "var(--color-text-tertiary)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-tertiary)"; }}
        >
          {editingBilling ? "Annuler" : "Modifier"}
        </button>
      </div>

      {editingBilling ? (
        <div className="flex flex-col gap-3">
          <div><FieldLabel>Nom complet</FieldLabel><Input defaultValue="Julius Peschard" className="h-9 text-[13px]" /></div>
          <div><FieldLabel>Adresse</FieldLabel><Input defaultValue="12 rue des Entrepreneurs, 14000 Caen" className="h-9 text-[13px]" /></div>
          <div><FieldLabel>SIREN</FieldLabel><Input defaultValue="123 456 789" className="h-9 text-[13px]" /></div>
          <div><FieldLabel>Numero de TVA (optionnel)</FieldLabel><Input defaultValue="FR12 123456789" className="h-9 text-[13px]" /></div>
          <div className="pt-1">
            <SaveButton />
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl p-4 flex flex-col gap-2.5"
          style={{ background: "transparent", border: "1px solid var(--color-border)" }}
        >
          <BillingInfoRow label="Nom"     value="Julius Peschard" />
          <BillingInfoRow label="Adresse" value="12 rue des Entrepreneurs, 14000 Caen" />
          <BillingInfoRow label="SIREN"   value="123 456 789" />
          <BillingInfoRow label="TVA"     value="FR12 123456789" />
        </div>
      )}
    </div>
  );
}

// ─── Section: Notifications ────────────────────────────────────────────────────

function Notifications() {
  const [prefs, setPrefs] = useState({ cbam: true, conflits: true, attente: true, resume: false });
  const items: { key: keyof typeof prefs; label: string; desc: string }[] = [
    { key: "cbam",     label: "Alertes CBAM",                  desc: "Notification lorsqu'un dossier est soumis au mecanisme CBAM." },
    { key: "conflits", label: "Conflits detectes",              desc: "Notification lorsqu'une incohérence est détectée dans un dossier." },
    { key: "attente",  label: "Dossiers en attente depuis +48h",desc: "Rappel quotidien pour les dossiers sans activite depuis 48 heures." },
    { key: "resume",   label: "Résumé hebdomadaire par e-mail", desc: "Un récapitulatif de votre activite envoyé chaque lundi matin." },
  ];
  return (
    <div className="max-w-lg">
      <BlockHeading>Préférences de notification</BlockHeading>
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
        {items.map((item, i) => (
          <div
            key={item.key}
            className="flex items-center gap-4 px-4 py-4"
            style={{ borderBottom: i < items.length - 1 ? "1px solid var(--color-border)" : "none" }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>{item.label}</p>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>{item.desc}</p>
            </div>
            <Toggle checked={prefs[item.key]} onChange={(v) => setPrefs(p => ({ ...p, [item.key]: v }))} />
          </div>
        ))}
      </div>
      <div className="mt-6"><SaveButton /></div>
    </div>
  );
}

// ─── Section map ───────────────────────────────────────────────────────────────

const SECTION_SUBTITLES: Record<Section, string> = {
  compte:        "Informations personnelles et mot de passe.",
  cabinet:       "Informations de votre cabinet et configuration du portail client.",
  facturation:   "Abonnement, paiement et historique de facturation.",
  notifications: "Choisissez les alertes que vous recevez de Verdyct.",
};

const SECTION_COMPONENTS: Record<Section, React.ComponentType> = {
  compte:        MonCompte,
  cabinet:       MonCabinet,
  facturation:   Facturation,
  notifications: Notifications,
};

// ─── SettingsModal ─────────────────────────────────────────────────────────────

export default function SettingsModal() {
  const { open, closeSettings } = useSettingsModal();
  const [section, setSection] = useState<Section>("compte");
  const ActiveSection = SECTION_COMPONENTS[section];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => { if (!v) closeSettings(); }}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[70] bg-black/40"
          style={{ backdropFilter: "blur(4px)" }}
        />

        {/* Modal */}
        <DialogPrimitive.Content
          className="fixed inset-4 z-[71] flex flex-col rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.14),0_0_0_1px_rgba(13,15,20,0.06)] outline-none"
          style={{ background: "#FFFFFF", maxWidth: 920, maxHeight: "88vh", margin: "auto" }}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Paramètres</DialogPrimitive.Title>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left nav */}
            <aside
              className="flex flex-col w-52 shrink-0 border-r px-2 pt-3 pb-3 gap-0.5"
              style={{ borderColor: "var(--color-border)" }}
            >
              {NAV.map(({ key, label, icon: Icon }) => {
                const active = section === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSection(key)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-left transition-colors duration-75"
                    style={{
                      color: active ? "var(--color-text)" : "var(--color-text-tertiary)",
                      background: active ? "rgba(13,15,20,0.05)" : "transparent",
                      fontWeight: active ? 500 : 400,
                    }}
                    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.04)"; }}
                    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <Icon width={15} height={15} strokeWidth={active ? 1.75 : 1.5} style={{ color: "inherit", flexShrink: 0 }} />
                    {label}
                  </button>
                );
              })}
            </aside>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 relative">
              <button
                onClick={closeSettings}
                className="absolute top-4 right-4 flex items-center justify-center size-7 rounded-lg transition-colors duration-75"
                style={{ color: "var(--color-text-tertiary)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Xmark width={15} height={15} strokeWidth={1.75} />
              </button>
              <h2 className="text-[16px] font-semibold tracking-tight mb-0.5" style={{ color: "var(--color-text)" }}>
                {NAV.find(n => n.key === section)?.label}
              </h2>
              <p className="text-[12.5px] mb-6" style={{ color: "var(--color-text-tertiary)" }}>
                {SECTION_SUBTITLES[section]}
              </p>
              <ActiveSection />
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
