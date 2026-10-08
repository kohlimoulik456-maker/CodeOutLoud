"use client";

import { Check, Sparkles, X } from "lucide-react";

type UpgradeToProModalProps = {
  open: boolean;
  onClose: () => void;
};

const benefits = [
  "Unlimited mock interviews",
  "System design and theory practice",
  "Deeper communication insights",
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
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#d7c49a] bg-[#faf9f6] p-7 shadow-2xl"
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
          Pro features are being prepared. Your current voice-first DSA practice
          stays free.
        </p>
        <ul className="mt-5 space-y-3">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2.5 text-sm">
              <span className="grid size-5 place-items-center rounded-full bg-[#e8dfcb] text-[#725a2f]">
                <Check size={12} />
              </span>
              {benefit}
            </li>
          ))}
        </ul>
        <div className="mt-7 rounded-xl border border-dashed border-[#c8a45c]/60 bg-[#f5f0e4] px-4 py-3 text-center text-xs text-[#725a2f]">
          Early access pricing will be announced soon.
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-[#1d1d19] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#33322d]"
        >
          Sounds good
        </button>
      </section>
    </div>
  );
}
