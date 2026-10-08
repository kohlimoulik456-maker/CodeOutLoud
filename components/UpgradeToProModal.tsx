"use client";

import { LockKeyhole, Sparkles, X } from "lucide-react";

type UpgradeToProModalProps = {
  open: boolean;
  onClose: () => void;
};

const proFeatures = [
  {
    name: "AI interviewer voice packs",
    description: "Choose from different interviewer voices and personas.",
  },
  {
    name: "Master Interview",
    description: "Full-length, multi-round interview simulations.",
  },
  {
    name: "System Design practice",
    description: "Architecture prompts with structured AI feedback.",
  },
  {
    name: "CS theory interview pack",
    description: "Practice OS, networking, and object-oriented design.",
  },
  {
    name: "Unlimited mock interviews",
    description: "Practice as often as you need, without session limits.",
  },
  {
    name: "Advanced performance insights",
    description: "Deeper communication analytics and interview history.",
  },
];

export default function UpgradeToProModal({
  open,
  onClose,
}: UpgradeToProModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#d7c49a] bg-[#faf9f6] p-7 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close upgrade dialog"
          className="absolute right-5 top-5 grid size-8 place-items-center rounded-full text-stone-500 transition hover:bg-stone-200/70"
        >
          <X size={16} />
        </button>
        <span className="grid size-11 place-items-center rounded-2xl bg-[#1d1d19] text-[#dfc27d]">
          <Sparkles size={19} />
        </span>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#92713a]">
          CodeOutLoud Pro
        </p>
        <h2
          id="upgrade-title"
          className="mt-2 text-2xl font-semibold tracking-tight"
        >
          More practice. More clarity.
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          Unlock these premium tools when you upgrade. Your current voice-first
          DSA practice stays free.
        </p>
        <ul aria-label="Locked Pro features" className="mt-5 grid gap-2 sm:grid-cols-2">
          {proFeatures.map((feature) => (
            <li
              key={feature.name}
              aria-label={`${feature.name}, locked until Pro is available`}
              className="rounded-xl border border-stone-200 bg-white/80 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-stone-800">
                  {feature.name}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#eee9dc] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#725a2f]">
                  <LockKeyhole size={10} aria-hidden />
                  Locked
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-stone-500">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-7 rounded-xl border border-dashed border-[#c8a45c]/60 bg-[#f5f0e4] px-4 py-3 text-center text-xs text-[#725a2f]">
          Pro features remain locked. Pricing and upgrades will be announced soon.
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-[#1d1d19] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#33322d]"
        >
          Got it
        </button>
      </section>
    </div>
  );
}
