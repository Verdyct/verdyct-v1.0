"use client";

import { useState } from "react";
import { Copy, Check } from "iconoir-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  size?: number;
  className?: string;
}

export function CopyButton({ text, size = 13, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center justify-center size-6 rounded-md transition-colors duration-75",
        className
      )}
      style={{ color: copied ? "#16a34a" : "var(--color-text-tertiary)" }}
      onMouseEnter={(e) => {
        if (!copied) (e.currentTarget as HTMLElement).style.background = "rgba(13,15,20,0.05)";
      }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      aria-label="Copier"
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
            ? <Check width={size} height={size} strokeWidth={2.25} style={{ color: "inherit" }} />
            : <Copy width={size} height={size} strokeWidth={1.75} style={{ color: "inherit" }} />
          }
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
