"use client";

import { createContext, useContext, useState } from "react";

export type ModalMode = "upload" | "manual";

interface UploadModalContextType {
  open: boolean;
  mode: ModalMode;
  files: File[];
  openModal: (mode?: ModalMode, files?: File[]) => void;
  closeModal: () => void;
}

const UploadModalContext = createContext<UploadModalContextType | null>(null);

export function UploadModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("upload");
  const [files, setFiles] = useState<File[]>([]);
  return (
    <UploadModalContext.Provider value={{
      open,
      mode,
      files,
      openModal: (m: ModalMode = "upload", f: File[] = []) => { setMode(m); setFiles(f); setOpen(true); },
      closeModal: () => setOpen(false),
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
