import { ArrowUpRight, BookOpenCheck, LockKeyhole } from "lucide-react";

export default function TheoryCard() {
  return (
    <article
      aria-label="Computer science theory practice, coming soon"
      className="flex min-h-[128px] flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 opacity-75"
    >
      <div className="flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-xl bg-stone-100 text-stone-500">
          <BookOpenCheck size={17} />
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-stone-500">
          <LockKeyhole size={10} />
          Coming soon
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">CS fundamentals</p>
          <p className="mt-0.5 text-[11px] text-stone-500">OS · Networks · OOP</p>
        </div>
        <ArrowUpRight size={16} className="text-stone-300" />
      </div>
    </article>
  );
}
