import { useState } from 'react';
import LexiconTab from './LexiconTab';
import CipherTab from './CipherTab';
import DropBoxTab from './DropBoxTab';

// ─── [ ].edited App ──────────────────────────────────────────────
//
// The Unedited's smuggled surface. Lives on the terminal desktop as a
// glitched/unsigned tile that appears at Week 4. Three tabs: Lexicon
// (Black Words glossary), Cipher (the Unedited's cloze restoration),
// Drop Box (free-text observation slot, post Shift Report).
//
// Visual register is deliberately "dead-internet" — image-board /
// .onion / IRC aesthetic. Plain monospace text on dark slate. No
// styled cards, no rounded chrome, no animations beyond a cursor
// blink. The horror is that real life looks like a forum.

type Tab = 'lexicon' | 'cipher' | 'drop-box';

const TABS: { id: Tab; label: string }[] = [
  { id: 'lexicon', label: 'lexicon' },
  { id: 'cipher', label: 'cipher' },
  { id: 'drop-box', label: 'drop box' },
];

export default function EditedApp() {
  const [tab, setTab] = useState<Tab>('lexicon');

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-200 font-ibm-mono text-sm">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-rose-400 mb-1">&gt; [ ].edited</p>
          <p className="text-slate-500 text-xs">&gt; unsigned. unfiled. uncurated.</p>
          <hr className="mt-4 border-slate-800" />
        </div>

        {/* Tabs */}
        <div className="mb-8 flex flex-wrap gap-x-5 gap-y-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`lowercase tracking-wider transition-colors ${
                tab === t.id
                  ? 'text-rose-400'
                  : 'text-slate-500 hover:text-slate-200'
              }`}
            >
              [ {t.label} ]
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'lexicon' && <LexiconTab />}
        {tab === 'cipher' && <CipherTab />}
        {tab === 'drop-box' && <DropBoxTab />}
      </div>
    </div>
  );
}
