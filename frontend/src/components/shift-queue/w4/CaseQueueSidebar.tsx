// ─── W4 Case Queue Sidebar ───────────────────────────────────────
//
// Right-column panel visible during W4's normal task render. Lists
// today's 4 cases on the Reconciliation Associate's desk —
// Citizen-4488 marked PRIORITY (the case the student actually works
// on) plus 3 routine cases that establish the bureaucratic context.
//
// Static content for now. Could later wire to real per-class data if
// classes are assigned different background cases. Cream/Party
// register — this is the *Party's* case list, not the Unedited's
// surface. Visual contrast with [ ].edited is intentional.
//
// Hidden on screens < lg (Chromebook portrait + mobile) to preserve
// the main task's horizontal space. On lg+ it sits to the right of
// the task in a flex layout.

interface Case {
  designation: string;
  status: 'priority' | 'routine';
  note: string;
}

const CASES: Case[] = [
  {
    designation: 'Citizen-4488',
    status: 'priority',
    note: 'Daily Activity Report — full reconciliation required.',
  },
  {
    designation: 'Citizen-1102',
    status: 'routine',
    note: 'Standard weekly review — no flags.',
  },
  {
    designation: 'Citizen-7715',
    status: 'routine',
    note: 'Standard weekly review — no flags.',
  },
  {
    designation: 'Citizen-2840',
    status: 'routine',
    note: 'Standard weekly review — no flags.',
  },
];

export default function CaseQueueSidebar() {
  return (
    <aside className="hidden lg:block lg:w-64 shrink-0 self-start">
      <div className="bg-[#FAFAF7] border border-[#E8E4DC] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          <p className="font-ibm-mono text-[9px] text-[#8B8578] tracking-[0.3em] uppercase">
            Today's Queue
          </p>
        </div>

        <ul className="space-y-3">
          {CASES.map((c) => {
            const isPriority = c.status === 'priority';
            return (
              <li
                key={c.designation}
                className={`p-3 rounded-lg border ${
                  isPriority
                    ? 'border-sky-300 bg-white shadow-sm'
                    : 'border-transparent bg-transparent'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {isPriority && <span className="text-sky-500 text-xs">▸</span>}
                  <p className={`font-ibm-mono text-xs tracking-wider ${
                    isPriority ? 'text-[#2C3340] font-medium' : 'text-[#8B8578]'
                  }`}>
                    {c.designation}
                  </p>
                </div>
                <p className={`font-ibm-mono text-[9px] tracking-[0.2em] uppercase mb-1 ${
                  isPriority ? 'text-sky-600' : 'text-[#B8B3AA]'
                }`}>
                  {c.status === 'priority' ? 'Priority' : 'Routine'}
                </p>
                <p className={`text-[10px] leading-relaxed ${
                  isPriority ? 'text-[#4B5563]' : 'text-[#B8B3AA]'
                }`}>
                  {c.note}
                </p>
              </li>
            );
          })}
        </ul>

        <p className="font-ibm-mono text-[9px] text-[#B8B3AA] tracking-wider mt-4 pt-3 border-t border-[#E8E4DC]">
          Reconciliation Desk · Sector 4
        </p>
      </div>
    </aside>
  );
}
