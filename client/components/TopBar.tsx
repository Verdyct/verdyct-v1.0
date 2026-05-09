"use client";

import { useState } from "react";
import { Search, Bell, HelpCircle, OpenBook, KeyBack, Megaphone, ChatBubbleQuestion, ArrowRight } from "iconoir-react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Command as CommandPrimitive } from "cmdk";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const notifications = [
  {
    id: 1,
    title: "Dossier #2024-078 mis à jour",
    body: "Global Trade SAS — Déclaration en attente de validation",
    time: "Il y a 3 min",
    unread: true,
  },
  {
    id: 2,
    title: "Nouvelle référence SH assignée",
    body: "8471.30 — Machines automatiques de traitement",
    time: "Il y a 1 h",
    unread: true,
  },
  {
    id: 3,
    title: "Importateur ACME Import vérifié",
    body: "Statut mis à jour · Dossier #2024-001",
    time: "Hier",
    unread: false,
  },
];

const helpLinks = [
  { icon: OpenBook, label: "Documentation", shortcut: null },
  { icon: KeyBack, label: "Raccourcis clavier", shortcut: "⌘/" },
  { icon: Megaphone, label: "Nouveautés", shortcut: null },
  { icon: ChatBubbleQuestion, label: "Contacter le support", shortcut: null },
];

export default function TopBar() {
  const [open, setOpen] = useState(false);
  const [allRead, setAllRead] = useState(false);

  return (
    <>
      <header
        className="flex items-center gap-4 px-5 h-13 shrink-0 border-b"
        style={{
          background: "var(--color-surface-0)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Search trigger */}
        <button
          className="flex items-center gap-2.5 flex-1 max-w-120 h-8 pl-3 pr-1.5 rounded-lg text-sm text-left transition-colors duration-75"
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--color-border-strong)",
            color: "var(--color-text-tertiary)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#F5F5F5";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#FFFFFF";
          }}
          onClick={() => setOpen(true)}
          aria-label="Rechercher"
        >
          <Search
            width={13}
            height={13}
            strokeWidth={1.75}
            style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }}
          />
          <span className="flex-1 truncate text-[13px]">
            Rechercher un dossier, un importateur, une référence SH...
          </span>
          <KbdGroup className="ml-auto shrink-0 gap-0.5">
            <Kbd className="bg-[rgba(13,15,20,0.04)] border-0 shadow-none text-text-tertiary rounded-[5px]">⌘</Kbd>
            <Kbd className="bg-[rgba(13,15,20,0.04)] border-0 shadow-none text-text-tertiary rounded-[5px]">K</Kbd>
          </KbdGroup>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1">

          {/* Bell */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="relative flex items-center justify-center size-8 rounded-lg transition-colors duration-75"
                style={{
                  color: "var(--color-text-tertiary)",
                  border: "1px solid var(--color-border-strong)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#F5F5F5";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text-tertiary)";
                }}
                aria-label="Notifications"
              >
                <Bell width={16} height={16} strokeWidth={1.5} style={{ color: "inherit" }} />
                {!allRead && (
                  <span
                    className="absolute top-1 right-1 size-1.5 rounded-full ring-2 ring-white"
                    style={{ background: "var(--color-primary)" }}
                  />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={6}
              className="w-[320px] p-0 gap-0 rounded-xl border-0 shadow-[0_6px_24px_rgba(0,0,0,0.06),0_0_0_1px_rgba(13,15,20,0.04)]"
              style={{ background: "#FFFFFF" }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 pt-4 pb-3 border-b"
                style={{ borderColor: "var(--color-border)" }}
              >
                <span className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>
                  Notifications
                </span>
                <button
                  className="text-[11px] transition-colors duration-75"
                  style={{ color: "var(--color-text-tertiary)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-tertiary)"; }}
                  onClick={() => setAllRead(true)}
                >
                  Tout marquer lu
                </button>
              </div>

              {/* Items */}
              <div>
                {notifications.map((n, i) => {
                  const isUnread = !allRead && n.unread;
                  return (
                    <button
                      key={n.id}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-75"
                      style={{ borderBottom: i < notifications.length - 1 ? "1px solid rgba(13,15,20,0.05)" : "none" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <div
                        className="shrink-0 size-1.5 rounded-full"
                        style={{
                          background: isUnread ? "var(--color-primary)" : "transparent",
                          border: isUnread ? "none" : "1px solid rgba(13,15,20,0.2)",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium leading-snug truncate" style={{ color: "var(--color-text)" }}>
                          {n.title}
                        </p>
                        <p className="text-[11.5px] mt-0.5 leading-snug truncate" style={{ color: "var(--color-text-tertiary)" }}>
                          {n.body}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                        {n.time}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div
                className="border-t px-4 py-3"
                style={{ borderColor: "var(--color-border)" }}
              >
                <button
                  className="w-full flex items-center justify-between text-[12px] transition-colors duration-75"
                  style={{ color: "var(--color-text-tertiary)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-tertiary)"; }}
                >
                  <span>Voir toutes les notifications</span>
                  <ArrowRight width={12} height={12} strokeWidth={1.75} />
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Help */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center justify-center size-8 rounded-lg transition-colors duration-75"
                style={{
                  color: "var(--color-text-tertiary)",
                  border: "1px solid var(--color-border-strong)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#F5F5F5";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text-tertiary)";
                }}
                aria-label="Aide"
              >
                <HelpCircle width={16} height={16} strokeWidth={1.5} style={{ color: "inherit" }} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={6}
              className="w-55 p-1.5 rounded-xl border-0 shadow-[0_6px_24px_rgba(0,0,0,0.06),0_0_0_1px_rgba(13,15,20,0.04)]"
              style={{ background: "#FFFFFF" }}
            >
              {helpLinks.map((link, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors duration-75 text-left"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.05)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <link.icon width={14} height={14} strokeWidth={1.5} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
                  <span className="flex-1 text-[13px]" style={{ color: "var(--color-text)" }}>
                    {link.label}
                  </span>
                  {link.shortcut && (
                    <span className="text-[11px] font-mono" style={{ color: "var(--color-text-tertiary)" }}>
                      {link.shortcut}
                    </span>
                  )}
                </button>
              ))}
            </PopoverContent>
          </Popover>

        </div>
      </header>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        className="sm:max-w-135 p-0"
      >
        <Command
          className="rounded-xl"
          style={{
            background: "var(--color-surface-0)",
            color: "var(--color-text)",
          }}
        >
          <div
            className="flex items-center gap-2.5 border-b px-3.5"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Search
              width={14}
              height={14}
              strokeWidth={1.75}
              style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }}
            />
            <CommandPrimitive.Input
              placeholder="Rechercher un dossier, un importateur, une référence SH..."
              className="h-11 w-full bg-transparent text-[13px] outline-none"
              style={{
                color: "var(--color-text)",
                caretColor: "var(--color-primary)",
              }}
            />
          </div>
          <CommandList className="max-h-80 p-1.5">
            <CommandEmpty
              className="py-8 text-center text-sm"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Aucun résultat trouvé.
            </CommandEmpty>
            <CommandGroup
              heading="Dossiers récents"
              className="**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-wider"
            >
              <CommandItem className="px-2 py-2 text-[13px] rounded-md cursor-pointer data-[selected=true]:bg-[rgba(13,15,20,0.04)]" style={{ color: "var(--color-text)" }}>
                Dossier #2024-001 — ACME Import
              </CommandItem>
              <CommandItem className="px-2 py-2 text-[13px] rounded-md cursor-pointer data-[selected=true]:bg-[rgba(13,15,20,0.04)]" style={{ color: "var(--color-text)" }}>
                Dossier #2024-042 — Logistics Pro
              </CommandItem>
              <CommandItem className="px-2 py-2 text-[13px] rounded-md cursor-pointer data-[selected=true]:bg-[rgba(13,15,20,0.04)]" style={{ color: "var(--color-text)" }}>
                Dossier #2024-078 — Global Trade SAS
              </CommandItem>
            </CommandGroup>
            <CommandSeparator style={{ background: "var(--color-border)" }} />
            <CommandGroup
              heading="Navigation"
              className="**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-wider"
            >
              <CommandItem className="px-2 py-2 text-[13px] rounded-md cursor-pointer data-[selected=true]:bg-[rgba(13,15,20,0.04)]" style={{ color: "var(--color-text)" }}>
                Tableau de bord
              </CommandItem>
              <CommandItem className="px-2 py-2 text-[13px] rounded-md cursor-pointer data-[selected=true]:bg-[rgba(13,15,20,0.04)]" style={{ color: "var(--color-text)" }}>
                Nouveaux dossiers
              </CommandItem>
              <CommandItem className="px-2 py-2 text-[13px] rounded-md cursor-pointer data-[selected=true]:bg-[rgba(13,15,20,0.04)]" style={{ color: "var(--color-text)" }}>
                Paramètres
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
