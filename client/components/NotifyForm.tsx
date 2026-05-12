"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type SubmitState = "idle" | "success" | "error";

export function NotifyForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) return;

    setIsSubmitting(true);
    setSubmitState("idle");
    setMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("waitlist").insert({
        email: normalizedEmail,
      });

      if (error) {
        if (error.code === "23505") {
          setSubmitState("success");
          setMessage("Cette adresse est deja sur la liste.");
          return;
        }

        throw error;
      }

      setSubmitState("success");
      setMessage("Vous etes sur la liste. On vous ecrit au lancement.");
      setEmail("");
    } catch {
      setSubmitState("error");
      setMessage("Impossible d'enregistrer votre adresse pour le moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-4 flex w-full max-w-sm flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
        <Input
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          placeholder="votre@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          aria-invalid={submitState === "error"}
          className="h-10 flex-1 rounded-md border-[var(--color-border)] bg-white/80 px-3 text-sm tracking-[-0.01em] placeholder:text-[color:var(--color-text-tertiary)] focus-visible:border-[var(--color-primary)] focus-visible:ring-[var(--color-primary)]/20 disabled:opacity-100"
        />
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="min-w-[152px] rounded-md px-4 text-sm tracking-[-0.01em] shadow-[0_12px_30px_rgba(255,112,181,0.18)]"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
          }}
        >
          {isSubmitting ? "Envoi..." : "Rejoindre la liste"}
          {!isSubmitting && <ArrowRight size={14} strokeWidth={2} />}
        </Button>
      </form>

      {message ? (
        <p
          className="text-sm tracking-[-0.01em]"
          style={{
            color:
              submitState === "error"
                ? "var(--color-destructive)"
                : "var(--color-text-secondary)",
          }}
        >
          {message}
        </p>
      ) : null}

      <p
        className="text-sm tracking-[-0.01em]"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        Lancement le 1er juin 2026
      </p>
    </div>
  );
}
