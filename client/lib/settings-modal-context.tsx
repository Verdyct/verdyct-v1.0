"use client";

import { createContext, useContext, useState } from "react";

interface SettingsModalContextType {
  open: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const SettingsModalContext = createContext<SettingsModalContextType | null>(null);

export function SettingsModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SettingsModalContext.Provider value={{
      open,
      openSettings: () => setOpen(true),
      closeSettings: () => setOpen(false),
    }}>
      {children}
    </SettingsModalContext.Provider>
  );
}

export function useSettingsModal() {
  const ctx = useContext(SettingsModalContext);
  if (!ctx) throw new Error("useSettingsModal must be used within SettingsModalProvider");
  return ctx;
}
