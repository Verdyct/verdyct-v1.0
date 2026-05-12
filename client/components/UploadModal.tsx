"use client";

import { useEffect, useRef, useState } from "react";
import { CloudUpload, Mail, EditPencil, NavArrowRight, NavArrowLeft, Copy, Check, Xmark } from "iconoir-react";

function VerdyctIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M89.6264 61.4399L108.84 94.3768L88.803 128.686L51.2 64.4592L53.1213 61.4399H89.6264Z" fill="white"/>
      <path d="M166.479 61.4399L147.266 94.3768L167.303 128.686L204.906 64.4592L202.984 61.4399H166.479Z" fill="white"/>
      <path d="M96.2138 141.861L128.053 87.2406L159.617 141.861L128.053 194.56L96.2138 141.861Z" fill="white"/>
    </svg>
  );
}
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUploadModal } from "@/lib/upload-modal-context";
import { copyText } from "@/lib/utils";

const FORMATS = ["PDF", "Excel", "JPEG", "PNG", "EML"];
const EMAIL = "dossiers+broker123@in.verdyct.io";

type View = "select" | "manual";

function OuDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
      <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>ou</span>
      <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
    </div>
  );
}

function CopyIcon({ copied }: { copied: boolean }) {
  return (
    <div
      className="shrink-0 flex items-center justify-center size-6"
      style={{ color: copied ? "#16a34a" : "var(--color-text-tertiary)" }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? "check" : "copy"}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          style={{ display: "inline-flex" }}
        >
          {copied
            ? <Check width={13} height={13} strokeWidth={2.25} />
            : <Copy width={13} height={13} strokeWidth={1.5} />
          }
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export default function UploadModal() {
  const { open, mode, files: initialFiles, prefill, closeModal } = useUploadModal();
  const [view, setView] = useState<View>("select");
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [hsCode, setHsCode] = useState("");
  const [contextValue, setContextValue] = useState("");
  const emailCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function copyEmail() {
    copyText(EMAIL);
    setEmailCopied(true);
    if (emailCopyTimer.current) clearTimeout(emailCopyTimer.current);
    emailCopyTimer.current = setTimeout(() => setEmailCopied(false), 2000);
  }
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);
  const importateurRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setLocalFiles(initialFiles);
      setHsCode(prefill?.hsCode ?? "");
      setContextValue(prefill?.description ?? "");
      setView(prefill || mode === "manual" ? "manual" : "select");
    }
  }, [open, mode, initialFiles, prefill]);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setLocalFiles([]), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (view === "manual") {
      const t = setTimeout(() => importateurRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [view]);

  function handleNewFiles(files: FileList | null) {
    if (!files?.length) return;
    setLocalFiles((prev) => [...prev, ...Array.from(files)]);
  }

  function removeFile(index: number) {
    setLocalFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const showFilesView = view === "select" && localFiles.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) closeModal(); }}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[500px] p-0 overflow-hidden gap-0"
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--color-border)",
          boxShadow: "0 8px 40px rgba(13,15,20,0.09)",
        }}
      >
        <DialogTitle className="sr-only">Création de dossier</DialogTitle>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2.5">
            {(view === "manual" || showFilesView) && (
              <button
                onClick={() => { setView("select"); setLocalFiles([]); }}
                className="flex items-center justify-center size-6 rounded-md transition-colors duration-75 -ml-0.5"
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.05)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <NavArrowLeft width={13} height={13} strokeWidth={1.75} style={{ color: "var(--color-text-tertiary)" }} />
              </button>
            )}
            <span className="text-[14px] font-medium tracking-tight" style={{ color: "var(--color-text)" }}>
              {view === "manual" ? "Sans document" : "Création de dossier"}
            </span>
          </div>
          <button
            onClick={closeModal}
            className="flex items-center justify-center size-7 rounded-lg transition-colors duration-75"
            style={{ border: "1px solid var(--color-border-strong)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.04)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <span className="text-[12px] leading-none" style={{ color: "var(--color-text-tertiary)" }}>✕</span>
          </button>
        </div>

        {/* ── Files ready view ──────────────────────────────────────────────── */}
        {showFilesView && (
          <div className="p-5 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 120px)" }}>
            <input
              ref={addMoreRef}
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.jpeg,.jpg,.png,.eml"
              className="hidden"
              onChange={(e) => { handleNewFiles(e.target.files); e.target.value = ""; }}
            />

            {/* File list */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                {localFiles.length} fichier{localFiles.length > 1 ? "s" : ""} sélectionné{localFiles.length > 1 ? "s" : ""}
              </span>
              {localFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
                  style={{ border: "1px solid var(--color-border)", background: "rgba(13,15,20,0.01)" }}
                >
                  <span className="text-[12px] flex-1 min-w-0 truncate" style={{ color: "var(--color-text)" }}>
                    {file.name}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                    style={{ background: "rgba(13,15,20,0.05)", color: "var(--color-text-tertiary)" }}
                  >
                    {file.name.split(".").pop()?.toUpperCase()}
                  </span>
                  <button
                    onClick={() => removeFile(i)}
                    className="shrink-0 flex items-center justify-center size-5 rounded transition-colors duration-75"
                    style={{ color: "var(--color-text-tertiary)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-tertiary)"; }}
                  >
                    <Xmark width={11} height={11} strokeWidth={2} />
                  </button>
                </div>
              ))}
              <button
                className="flex items-center gap-2 mt-1 text-[12px] transition-colors duration-75 w-fit"
                style={{ color: "var(--color-text-tertiary)" }}
                onClick={() => addMoreRef.current?.click()}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-tertiary)"; }}
              >
                <span className="text-[14px] leading-none">+</span>
                Ajouter d'autres fichiers
              </button>
            </div>

            {/* Contexte */}
            <div className="flex flex-col gap-1.5 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
              <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                Contexte <span style={{ opacity: 0.6 }}>(Optionnel)</span>
              </span>
              <Textarea
                data-upload-context
                placeholder="ex: client utilise toujours DAP, acier grade S355, origine Allemagne"
                className="min-h-[56px] max-h-[100px] text-[12px] resize-y focus-visible:ring-0 focus-visible:shadow-none"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text)", background: "transparent" }}
              />
            </div>

            {/* Submit */}
            <button
              className="w-full h-9 rounded-lg text-[13px] font-medium transition-opacity duration-75 flex items-center justify-center gap-1.5"
              style={{ background: "var(--color-primary)", color: "#FFFFFF" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              Créer le dossier
              <VerdyctIcon size={20} />
            </button>
          </div>
        )}

        {/* ── Select view ───────────────────────────────────────────────────── */}
        {view === "select" && !showFilesView && (
          <div className="p-5 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 120px)" }}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.jpeg,.jpg,.png,.eml"
              className="hidden"
              onChange={(e) => { handleNewFiles(e.target.files); e.target.value = ""; }}
            />

            {/* Drop zone */}
            <div
              className="rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors duration-100"
              style={{
                minHeight: "152px",
                border: `1.5px dashed ${isDragging ? "var(--color-primary)" : "rgba(255,112,181,0.35)"}`,
                background: isDragging ? "rgba(255,112,181,0.07)" : "rgba(255,112,181,0.03)",
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleNewFiles(e.dataTransfer.files);
              }}
            >
              <CloudUpload
                width={20}
                height={20}
                strokeWidth={1.5}
                style={{ color: "var(--color-primary)", opacity: isDragging ? 1 : 0.7 }}
              />
              <div className="flex flex-col items-center gap-0.5 text-center px-6">
                <p className="text-[13px] font-medium" style={{ color: "var(--color-primary)" }}>
                  Déposez vos documents douaniers
                </p>
                <p className="text-[12px]" style={{ color: "rgba(255,112,181,0.65)" }}>
                  ou cliquez pour parcourir
                </p>
              </div>
              <p className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                {FORMATS.join(" · ")}
              </p>
            </div>

            <OuDivider />

            {/* Email forward */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium" style={{ color: "var(--color-text)" }}>
                Transférer par email
              </span>
              <div
                className="flex items-center gap-3 cursor-pointer transition-colors duration-75 rounded-lg px-3 py-2.5"
                onClick={copyEmail}
                style={{ border: "1px solid var(--color-border)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.02)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Mail width={13} height={13} strokeWidth={1.5} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
                <span className="text-[12px] flex-1 min-w-0 truncate" style={{ color: "var(--color-text-secondary)" }}>
                  {EMAIL}
                </span>
                <CopyIcon copied={emailCopied} />
              </div>
              <p className="text-[11px] px-1" style={{ color: "var(--color-text-tertiary)" }}>
                Importez directement depuis votre messagerie
              </p>
            </div>

            <OuDivider />

            {/* Manual entry */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium" style={{ color: "var(--color-text)" }}>
                Sans document
              </span>
              <div
                className="flex items-center gap-3 cursor-pointer transition-colors duration-75 rounded-lg px-3 py-2.5"
                onClick={() => setView("manual")}
                style={{ border: "1px solid var(--color-border)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.02)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <EditPencil width={13} height={13} strokeWidth={1.5} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
                <span className="text-[12px] flex-1 min-w-0" style={{ color: "var(--color-text-secondary)" }}>
                  Importateur, contexte, code TARIC
                </span>
                <NavArrowRight width={12} height={12} strokeWidth={1.75} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
              </div>
              <p className="text-[11px] px-1" style={{ color: "var(--color-text-tertiary)" }}>
                Renseignez l'importateur et le contexte. Verdyct fait le reste.
              </p>
            </div>
          </div>
        )}

        {/* ── Manual view ───────────────────────────────────────────────────── */}
        {view === "manual" && (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                Importateur <span style={{ opacity: 0.5 }}>*</span>
              </label>
              <Input
                ref={importateurRef}
                placeholder="ex: Dupont Métaux SARL"
                className="h-9 text-[13px] focus-visible:ring-0 focus-visible:shadow-none"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text)", background: "transparent" }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                Référence <span style={{ opacity: 0.6 }}>(Optionnel)</span>
              </label>
              <Input
                placeholder="ex: #2026-0185"
                className="h-9 text-[13px] focus-visible:ring-0 focus-visible:shadow-none"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text)", background: "transparent" }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                Code TARIC <span style={{ opacity: 0.6 }}>(Optionnel)</span>
              </label>
              <Input
                value={hsCode}
                onChange={(e) => setHsCode(e.target.value)}
                placeholder="ex: 7318.15.59"
                className="h-9 text-[13px] focus-visible:ring-0 focus-visible:shadow-none"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text)", background: "transparent" }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                Contexte <span style={{ opacity: 0.6 }}>(Optionnel)</span>
              </label>
              <Textarea
                data-upload-context
                value={contextValue}
                onChange={(e) => setContextValue(e.target.value)}
                placeholder="ex: client utilise toujours DAP, acier grade S355, origine Allemagne"
                className="min-h-[72px] max-h-[120px] text-[12px] resize-y focus-visible:ring-0 focus-visible:shadow-none"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text)", background: "transparent" }}
              />
            </div>

            <button
              className="w-full h-9 rounded-lg text-[13px] font-medium transition-opacity duration-75 mt-1 flex items-center justify-center gap-1.5"
              style={{ background: "var(--color-primary)", color: "#FFFFFF" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              Créer le dossier
              <VerdyctIcon size={20} />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
