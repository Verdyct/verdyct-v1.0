"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { HomeSimple, Folder, Barcode, Group, Settings, Plus, BookStack, Journal } from "iconoir-react";
import { useUploadModal } from "@/lib/upload-modal-context";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

const espaceItems = [
  { href: "/dashboard", label: "Tableau de Bord", icon: HomeSimple },
  { href: "/dashboard/dossiers", label: "Dossiers", icon: Folder },
  { href: "/dashboard/classificateur", label: "Classificateur SH", icon: Barcode },
  { href: "/dashboard/importateurs", label: "Importateurs", icon: Group },
];

const outilsItems = [
  { href: "/dashboard/nomenclatures", label: "Nomenclatures", icon: BookStack, soon: false },
  { href: "/dashboard/journal", label: "Journal d'activité", icon: Journal, soon: true },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  soon = false,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  soon?: boolean;
}) {
  if (soon) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-default select-none"
        style={{ color: "var(--color-text-tertiary)", opacity: 0.5 }}
      >
        <Icon width={16} height={16} strokeWidth={1.5} style={{ color: "inherit", flexShrink: 0 }} />
        <span className="tracking-tight flex-1">{label}</span>
        <span
          className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-full tracking-wide"
          style={{
            background: "rgba(13,15,20,0.07)",
            color: "var(--color-text-tertiary)",
            letterSpacing: "0.03em",
          }}
        >
          Bientôt
        </span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-75"
      style={{
        color: active ? "var(--color-text)" : "var(--color-text-tertiary)",
        background: active ? "rgba(13,15,20,0.04)" : "transparent",
        fontWeight: active ? 500 : 400,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.06)";
          (e.currentTarget as HTMLElement).style.color = "var(--color-text)";
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
        width={16}
        height={16}
        strokeWidth={active ? 1.75 : 1.5}
        style={{ color: "inherit", flexShrink: 0 }}
      />
      <span className="tracking-tight">{label}</span>
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <span
      className="px-3 pt-3 pb-1 text-[10.5px] font-medium tracking-wider uppercase block"
      style={{ color: "var(--color-text-tertiary)", opacity: 0.6 }}
    >
      {label}
    </span>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { openModal } = useUploadModal();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        openModal();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openModal]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className="flex flex-col w-60 h-screen shrink-0 border-r"
      style={{
        background: "var(--color-surface-0)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Logo */}
      <div className="px-3 pt-5 pb-6">
        <Image
          src="/assets/images/brand/verdyct-logo.svg"
          alt="Verdyct"
          width={40}
          height={40}
          priority
        />
      </div>

      {/* Nav */}
      <nav className="flex flex-col px-3 flex-1">
        <SectionLabel label="Espace" />
        <div className="flex flex-col gap-0.5">
          {espaceItems.map(({ href, label, icon }) => (
            <NavLink
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={isActive(href)}
            />
          ))}
        </div>

        <div className="mt-3">
          <SectionLabel label="Outils" />
        </div>
        <div className="flex flex-col gap-0.5">
          {outilsItems.map(({ href, label, icon, soon }) => (
            <NavLink
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={isActive(href)}
              soon={soon}
            />
          ))}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="flex flex-col gap-2 px-3 pb-4">
        {/* Nouveau Dossier CTA */}
        <button
          onClick={() => openModal()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-75"
          style={{
            border: "1.5px dashed rgba(255,112,181,0.4)",
            background: "rgba(255,112,181,0.05)",
            color: "var(--color-primary)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,112,181,0.10)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,112,181,0.05)"; }}
        >
          <Plus width={14} height={14} strokeWidth={2.25} style={{ color: "inherit" }} />
          <span className="flex-1 text-left">Nouveau Dossier</span>
          <KbdGroup className="gap-0.5 opacity-60">
            <Kbd className="text-[10px] px-1 py-px rounded-[4px] border-0 shadow-none leading-none" style={{ background: "rgba(255,112,181,0.2)", color: "var(--color-primary)" }}>⌘</Kbd>
            <Kbd className="text-[10px] px-1 py-px rounded-[4px] border-0 shadow-none leading-none" style={{ background: "rgba(255,112,181,0.2)", color: "var(--color-primary)" }}>N</Kbd>
          </KbdGroup>
        </button>

        {/* Paramètres */}
        <NavLink
          href="/dashboard/parametres"
          label="Paramètres"
          icon={Settings}
          active={isActive("/dashboard/parametres")}
        />
      </div>
    </aside>
  );
}
