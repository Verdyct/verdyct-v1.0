"use client";

import { useRef, useState } from "react";
import { CloudUpload, Mail, EditPencil, NavArrowRight, Copy, Check } from "iconoir-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUploadModal } from "@/lib/upload-modal-context";
import { copyText } from "@/lib/utils";

const EMAIL = "dossiers+broker123@in.verdyct.io";

export default function UploadCard() {
  const { openModal } = useUploadModal();
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: File[]) {
    if (files.length > 0) openModal("upload", files);
  }

  function copyEmail(e?: React.MouseEvent) {
    e?.stopPropagation();
    copyText(EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{ background: "#FFFFFF", border: "1px solid var(--color-border)" }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.xlsx,.xls,.jpeg,.jpg,.png,.eml"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            handleFiles(Array.from(e.target.files));
            e.target.value = "";
          }
        }}
      />

      {/* Drop zone */}
      <div
        className="m-4 rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors duration-100"
        style={{
          minHeight: "156px",
          border: `1.5px dashed ${isDragging ? "var(--color-primary)" : "rgba(255,112,181,0.35)"}`,
          background: isDragging ? "rgba(255,112,181,0.07)" : "rgba(255,112,181,0.03)",
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length) handleFiles(files);
        }}
      >
        <CloudUpload
          width={20}
          height={20}
          strokeWidth={1.5}
          style={{ color: "var(--color-primary)", opacity: isDragging ? 1 : 0.7 }}
        />
        <div className="flex flex-col items-center gap-1 text-center px-6">
          <p className="text-[14px] font-medium leading-snug" style={{ color: "var(--color-primary)" }}>
            Déposez vos documents douaniers
          </p>
          <p className="text-[13px]" style={{ color: "rgba(255,112,181,0.65)" }}>
            ou cliquez pour parcourir
          </p>
        </div>
        <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
          PDF · Excel · JPEG · PNG · EML
        </p>
      </div>

      {/* Email forward — full row is clickable */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-t cursor-pointer transition-colors duration-75"
        style={{ borderColor: "var(--color-border)" }}
        onClick={() => copyEmail()}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.02)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <Mail width={13} height={13} strokeWidth={1.5} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
        <span className="text-[12px] flex-1 min-w-0 truncate" style={{ color: "var(--color-text-secondary)" }}>
          {EMAIL}
        </span>
        <button
          onClick={copyEmail}
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
        </button>
      </div>

      {/* Manual entry */}
      <button
        className="flex items-center gap-3 px-4 py-3 text-left w-full border-t transition-colors duration-75"
        style={{ borderColor: "var(--color-border)" }}
        onClick={() => openModal("manual")}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.02)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <EditPencil width={13} height={13} strokeWidth={1.5} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
        <span className="text-[13px] flex-1" style={{ color: "var(--color-text-secondary)" }}>
          Saisir manuellement
        </span>
        <NavArrowRight width={11} height={11} strokeWidth={1.75} style={{ color: "var(--color-text-tertiary)" }} />
      </button>
    </div>
  );
}
