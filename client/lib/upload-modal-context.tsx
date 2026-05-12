"use client";

import { createContext, useContext, useState } from "react";

export type ModalMode = "upload" | "manual";

export interface ModalPrefill {
  hsCode?: string;
  description?: string;
}

interface UploadModalContextType {
  open: boolean;
  mode: ModalMode;
  files: File[];
  prefill: ModalPrefill | null;
  openModal: (mode?: ModalMode, files?: File[], prefill?: ModalPrefill) => void;
  closeModal: () => void;
}

const UploadModalContext = createContext<UploadModalContextType | null>(null);

export function UploadModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [prefill, setPrefill] = useState<ModalPrefill | null>(null);

  return (
    <UploadModalContext.Provider value={{
      open,
      mode,
      files,
      prefill,
      openModal: (m: ModalMode = "upload", f: File[] = [], p?: ModalPrefill) => {
        setMode(m);
        setFiles(f);
        setPrefill(p ?? null);
        setOpen(true);
      },
      closeModal: () => { setOpen(false); setPrefill(null); },
    }}>
      {children}
    </UploadModalContext.Provider>
  );
}

export function useUploadModal() {
  const ctx = useContext(UploadModalContext);
  if (!ctx) throw new Error("useUploadModal must be used within UploadModalProvider");
  return ctx;
}
