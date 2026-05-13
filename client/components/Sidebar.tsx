"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeSimple, Folder, Barcode, Group, Settings, Plus } from "iconoir-react";
import { useUploadModal } from "@/lib/upload-modal-context";

const navItems = [
  { href: "/dashboard", label: "Tableau de Bord", icon: HomeSimple },
  { href: "/dashboard/dossiers", label: "Dossiers", icon: Folder },
  { href: "/dashboard/classificateur", label: "Classificateur SH", icon: Barcode },
  { href: "/dashboard/importateurs", label: "Importateurs", icon: Group },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
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

export default function Sidebar() {
  const pathname = usePathname();
  const { openModal } = useUploadModal();

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
      <nav className="flex flex-col gap-0.5 px-3 flex-1">
        {navItems.map(({ href, label, icon }) => (
          <NavLink
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={isActive(href)}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="flex flex-col gap-2 px-3 pb-4">
        {/* Nouveau Dossier CTA */}
        <button
          onClick={() => openModal()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-75"
          style={{
            border: "1.5px dashed rgba(255,112,181,0.4)",
            background: "rgba(255,112,181,0.05)",
            color: "var(--color-primary)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,112,181,0.10)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,112,181,0.05)"; }}
        >
          <Plus width={14} height={14} strokeWidth={2.25} style={{ color: "inherit" }} />
          Nouveau Dossier
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
