"use client";

import { useState } from "react";
import { User, Building, CreditCard, Bell, Camera, ArrowRight, Check } from "iconoir-react";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Section = "compte" | "cabinet" | "facturation" | "notifications";

// ─── Nav items ─────────────────────────────────────────────────────────────────

const NAV: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: "compte",        label: "Mon compte",    icon: User },
  { key: "cabinet",       label: "Mon cabinet",   icon: Building },
  { key: "facturation",   label: "Facturation",   icon: CreditCard },
  { key: "notifications", label: "Notifications", icon: Bell },
];

// ─── Primitives ────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
      {children}
    </label>
  );
}

function SectionDivider() {
  return <div className="h-px my-6" style={{ background: "var(--color-border)" }} />;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-wider uppercase mb-4" style={{ color: "var(--color-text-tertiary)" }}>
      {children}
    </p>
  );
}

function SaveButton({ onClick }: { onClick?: () => void }) {
  const [saved, setSaved] = useState(false);
  function handle() {
    setSaved(true);
    onClick?.();
    setTimeout(() => setSaved(false), 2000);
  }
  return (
    <button
      onClick={handle}
      className="flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-medium transition-opacity duration-75"
      style={{ background: "var(--color-primary)", color: "#fff" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
    >
      {saved ? <Check width={13} height={13} strokeWidth={2.25} /> : null}
      {saved ? "Enregistré" : "Enregistrer"}
    </button>
  );
}

// ─── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 rounded-full transition-colors duration-150"
      style={{
        width: 36,
        height: 20,
        background: checked ? "var(--color-primary)" : "rgba(13,15,20,0.12)",
      }}
    >
      <span
        className="absolute top-0.5 rounded-full transition-transform duration-150"
        style={{
          left: 2,
          width: 16,
          height: 16,
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          transform: checked ? "translateX(16px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

// ─── Sections ──────────────────────────────────────────────────────────────────

function MonCompte() {
  const [name, setName] = useState("Julius Peschard");
  const [email, setEmail] = useState("julius@verdyct.io");

  return (
    <div className="max-w-xl">
      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="size-16 rounded-full flex items-center justify-center text-[18px] font-semibold shrink-0"
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
          <p className="text-[11.5px] mt-1" style={{ color: "var(--color-text-tertiary)" }}>
            JPG ou PNG, max 2 Mo
          </p>
        </div>
      </div>

      <SectionDivider />
      <SectionHeading>Identite</SectionHeading>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <FieldLabel>Prenom</FieldLabel>
          <Input
            value={name.split(" ")[0]}
            onChange={(e) => setName(`${e.target.value} ${name.split(" ").slice(1).join(" ")}`)}
            className="h-9 text-[13px]"
          />
        </div>
        <div>
          <FieldLabel>Nom</FieldLabel>
          <Input
            value={name.split(" ").slice(1).join(" ")}
            onChange={(e) => setName(`${name.split(" ")[0]} ${e.target.value}`)}
            className="h-9 text-[13px]"
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel>Adresse e-mail</FieldLabel>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-[13px]" />
      </div>

      <SectionDivider />
      <SectionHeading>Mot de passe</SectionHeading>

      <div className="flex flex-col gap-3 mb-6">
        <div>
          <FieldLabel>Mot de passe actuel</FieldLabel>
          <Input type="password" placeholder="••••••••" className="h-9 text-[13px]" />
        </div>
        <div>
          <FieldLabel>Nouveau mot de passe</FieldLabel>
          <Input type="password" placeholder="••••••••" className="h-9 text-[13px]" />
        </div>
        <div>
          <FieldLabel>Confirmer le nouveau mot de passe</FieldLabel>
          <Input type="password" placeholder="••••••••" className="h-9 text-[13px]" />
        </div>
      </div>

      <SaveButton />
    </div>
  );
}

function MonCabinet() {
  const FORWARDING_ADDRESS = "dossiers+cab123@in.verdyct.io";

  return (
    <div className="max-w-xl">
      <SectionHeading>Informations du cabinet</SectionHeading>

      <div className="flex flex-col gap-3 mb-6">
        <div>
          <FieldLabel>Raison sociale</FieldLabel>
          <Input defaultValue="Cabinet Peschard Douane" className="h-9 text-[13px]" />
        </div>
        <div>
          <FieldLabel>SIREN</FieldLabel>
          <Input defaultValue="123 456 789" placeholder="9 chiffres" className="h-9 text-[13px]" />
        </div>
        <div>
          <FieldLabel>Adresse</FieldLabel>
          <Input defaultValue="12 rue des Entrepreneurs" className="h-9 text-[13px]" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <FieldLabel>Code postal</FieldLabel>
            <Input defaultValue="14000" className="h-9 text-[13px]" />
          </div>
          <div className="col-span-2">
            <FieldLabel>Ville</FieldLabel>
            <Input defaultValue="Caen" className="h-9 text-[13px]" />
          </div>
        </div>
      </div>

      <SectionDivider />
      <SectionHeading>Logo du cabinet</SectionHeading>

      <div
        className="flex flex-col items-center justify-center rounded-xl p-6 mb-6 cursor-pointer transition-colors duration-75"
        style={{ border: "1.5px dashed var(--color-border-strong)", background: "rgba(13,15,20,0.02)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.04)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.02)"; }}
      >
        <p className="text-[13px] font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
          Deposer votre logo ici
        </p>
        <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
          SVG, PNG ou JPG, max 1 Mo - utilise dans le portail client
        </p>
      </div>

      <SectionDivider />
      <SectionHeading>Transfert e-mail</SectionHeading>

      <p className="text-[13px] mb-3" style={{ color: "var(--color-text-secondary)" }}>
        Transférez vos e-mails de dossiers vers cette adresse. Verdyct crée automatiquement un dossier et attache les pièces jointes.
      </p>

      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
        style={{ background: "rgba(13,15,20,0.03)", border: "1px solid var(--color-border)" }}
      >
        <span className="flex-1 text-[13px] font-medium" style={{ color: "var(--color-text)" }}>
          {FORWARDING_ADDRESS}
        </span>
        <CopyButton text={FORWARDING_ADDRESS} />
      </div>

      <div className="mt-6">
        <SaveButton />
      </div>
    </div>
  );
}

function Facturation() {
  const plans = [
    { key: "starter", label: "Starter",   price: "149",  users: "1 utilisateur",  popular: false },
    { key: "pro",     label: "Pro",        price: "249",  users: "3 utilisateurs", popular: true  },
    { key: "team",    label: "Team",       price: "499",  users: "10 utilisateurs",popular: false },
  ];
  const currentPlan = "pro";

  return (
    <div className="max-w-xl">
      <SectionHeading>Abonnement actuel</SectionHeading>

      <div className="flex flex-col gap-2 mb-6">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          return (
            <div
              key={plan.key}
              className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors duration-75"
              style={{
                border: isCurrent
                  ? "1.5px solid var(--color-primary)"
                  : "1px solid var(--color-border)",
                background: isCurrent ? "rgba(255,112,181,0.04)" : "transparent",
              }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>
                    {plan.label}
                  </span>
                  {plan.popular && (
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(255,112,181,0.1)", color: "var(--color-primary)" }}
                    >
                      Populaire
                    </span>
                  )}
                  {isCurrent && (
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(255,112,181,0.12)", color: "var(--color-primary)" }}
                    >
                      Actuel
                    </span>
                  )}
                </div>
                <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                  {plan.users}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[15px] font-semibold" style={{ color: "var(--color-text)" }}>
                  {plan.price} €
                </span>
                <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>/mois</span>
              </div>
            </div>
          );
        })}
      </div>

      <SectionDivider />
      <SectionHeading>Informations de paiement</SectionHeading>

      <div
        className="rounded-xl overflow-hidden mb-6"
        style={{ border: "1px solid var(--color-border)" }}
      >
        {[
          { label: "Prochain renouvellement", value: "1 juin 2026" },
          { label: "Moyen de paiement",        value: "Visa se terminant par 4242" },
          { label: "Titulaire",                value: "Julius Peschard" },
        ].map((row, i, arr) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none" }}
          >
            <span className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>{row.label}</span>
            <span className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>{row.value}</span>
          </div>
        ))}
      </div>

      <button
        className="flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-medium transition-colors duration-75"
        style={{ border: "1px solid var(--color-border-strong)", color: "var(--color-text-secondary)", background: "transparent" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.04)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
      >
        Gerer mon abonnement
        <ArrowRight width={12} height={12} strokeWidth={1.75} />
      </button>
    </div>
  );
}

function Notifications() {
  const [prefs, setPrefs] = useState({
    cbam:    true,
    conflits: true,
    attente:  true,
    resume:   false,
  });

  const items: { key: keyof typeof prefs; label: string; desc: string }[] = [
    {
      key:   "cbam",
      label: "Alertes CBAM",
      desc:  "Notification lorsqu'un dossier est soumis au mecanisme CBAM.",
    },
    {
      key:   "conflits",
      label: "Conflits detectes",
      desc:  "Notification lorsqu'une incohérence est détectée dans un dossier.",
    },
    {
      key:   "attente",
      label: "Dossiers en attente depuis +48 h",
      desc:  "Rappel quotidien pour les dossiers sans activite depuis 48 heures.",
    },
    {
      key:   "resume",
      label: "Résumé hebdomadaire par e-mail",
      desc:  "Un récapitulatif de votre activite envoyé chaque lundi matin.",
    },
  ];

  return (
    <div className="max-w-xl">
      <SectionHeading>Préférences de notification</SectionHeading>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
        {items.map((item, i) => (
          <div
            key={item.key}
            className="flex items-center gap-4 px-4 py-4"
            style={{ borderBottom: i < items.length - 1 ? "1px solid var(--color-border)" : "none" }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium leading-snug" style={{ color: "var(--color-text)" }}>
                {item.label}
              </p>
              <p className="text-[12px] mt-0.5 leading-snug" style={{ color: "var(--color-text-tertiary)" }}>
                {item.desc}
              </p>
            </div>
            <Toggle
              checked={prefs[item.key]}
              onChange={(v) => setPrefs(p => ({ ...p, [item.key]: v }))}
            />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <SaveButton />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const SECTION_COMPONENTS: Record<Section, React.ComponentType> = {
  compte:        MonCompte,
  cabinet:       MonCabinet,
  facturation:   Facturation,
  notifications: Notifications,
};

export default function ParametresPage() {
  const [section, setSection] = useState<Section>("compte");
  const ActiveSection = SECTION_COMPONENTS[section];

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--color-surface-0)" }}>

      {/* Left nav */}
      <aside
        className="flex flex-col w-52 shrink-0 border-r px-2 py-4 gap-0.5"
        style={{ borderColor: "var(--color-border)", background: "#FFFFFF" }}
      >
        <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-text-tertiary)", opacity: 0.6 }}>
          Paramètres
        </p>
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
      <main className="flex-1 overflow-y-auto">
        <div className="px-10 py-8">
          <h2 className="text-[18px] font-semibold tracking-tight mb-1" style={{ color: "var(--color-text)" }}>
            {NAV.find(n => n.key === section)?.label}
          </h2>
          <p className="text-[13px] mb-8" style={{ color: "var(--color-text-tertiary)" }}>
            {section === "compte"        && "Gérez vos informations personnelles et votre mot de passe."}
            {section === "cabinet"       && "Informations de votre cabinet et configuration du portail client."}
            {section === "facturation"   && "Abonnement, paiement et historique de facturation."}
            {section === "notifications" && "Choisissez les alertes que vous recevez de Verdyct."}
          </p>
          <ActiveSection />
        </div>
      </main>
    </div>
  );
}
