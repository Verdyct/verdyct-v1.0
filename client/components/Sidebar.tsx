"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeSimple,
  Folder,
  Barcode,
  Group,
  Settings,
  CloudUpload,
} from "iconoir-react";

const navItems = [
  { href: "/", label: "Tableau de Bord", icon: HomeSimple },
  { href: "/dossiers", label: "Dossiers", icon: Folder },
  { href: "/classificateur", label: "Classificateur SH", icon: Barcode },
  { href: "/importateurs", label: "Importateurs", icon: Group },
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
        background: active ? "#EBEBEB" : "transparent",
        fontWeight: active ? 500 : 400,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "#F2F2F2";
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
            active={pathname === href}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="flex flex-col gap-2 px-3 pb-4">
        {/* Upload card */}
        <div
          className="rounded-2xl p-2"
          style={{
            background: "var(--color-surface-0)",
            border: "1px solid var(--color-border-strong)",
          }}
        >
          <div
            className="rounded-lg flex flex-col items-center justify-center gap-2 py-5 px-3 cursor-pointer transition-colors duration-75"
            style={{
              border: "1.5px dashed var(--color-primary)",
              background: "rgba(255, 112, 181, 0.04)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(255, 112, 181, 0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(255, 112, 181, 0.04)";
            }}
          >
            <CloudUpload
              width={20}
              height={20}
              strokeWidth={1.5}
              style={{ color: "var(--color-primary)" }}
            />
            <div className="flex flex-col items-center gap-0.5 text-center">
              <span
                className="text-xs font-medium leading-tight"
                style={{ color: "var(--color-primary)" }}
              >
                Déposer un dossier
              </span>
              <span
                className="text-[10px] leading-snug"
                style={{ color: "rgba(255, 112, 181, 0.85)" }}
              >
                PDF, Excel, email
              </span>
            </div>
          </div>
        </div>

        {/* Paramètres */}
        <NavLink
          href="/parametres"
          label="Paramètres"
          icon={Settings}
          active={pathname === "/parametres"}
        />
      </div>
    </aside>
  );
}
