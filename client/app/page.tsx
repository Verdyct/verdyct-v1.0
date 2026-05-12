import Image from "next/image";
import { NotifyForm } from "@/components/NotifyForm";

export default function ComingSoonPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16"
      style={{
        background:
          "radial-gradient(circle at top, rgba(255,112,181,0.10), transparent 32%), linear-gradient(180deg, #fbfbfc 0%, #f4f5f8 100%)",
      }}
    >
      <section className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-14 text-center">
        <div className="flex flex-col items-center gap-5">
          <Image
            src="/assets/images/brand/verdyct-logo.svg"
            alt="Verdyct"
            width={80}
            height={80}
            priority
            className="h-20 w-20"
          />

          <div className="max-w-sm space-y-3 sm:max-w-md">
            <h1
              className="text-2xl font-medium tracking-[-0.04em] text-balance sm:text-3xl"
              style={{ color: "var(--color-text)" }}
            >
              Traitez vos dossiers de douane en{" "}
              <span style={{ color: "var(--color-primary)" }}>90 secondes</span>
              , pas 45 minutes.
            </h1>
            <p
              className="text-[0.9375rem] leading-6 tracking-[-0.01em] sm:text-base"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Automatisez l&apos;extraction documentaire, la classification TARIC et la
              conformite CBAM. Concu pour les commissionnaires en douane independants.
            </p>
          </div>
        </div>

        <NotifyForm />
      </section>
    </main>
  );
}
