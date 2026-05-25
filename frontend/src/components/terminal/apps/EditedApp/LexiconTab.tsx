import { useState } from 'react';

// ─── Lexicon Tab ────────────────────────────────────────────────
//
// Five Black Words: words the Party has redacted from approved
// register because each one names a concept that, if allowed,
// threatens total control. All TOEIC B1 vocabulary — witness /
// relative / individual / independent / private.
//
// Tap-to-reveal Mandarin on every entry. The reveal is a small
// private act, which suits the dystopian register better than
// always-on glosses. Example sentences are in Unedited voice
// (lowercase, fragmented, urgent) so students feel the register
// shift while learning the word.

interface BlackWord {
  word: string;
  ipa: string;
  partOfSpeech: string;
  definition: string;
  example: string[];
  mandarin: string;
}

const ENTRIES: BlackWord[] = [
  {
    word: 'witness',
    ipa: '/ˈwɪtnəs/',
    partOfSpeech: 'noun, verb',
    definition:
      'a person who has seen something happen; to see something happen.',
    example: [
      'she was a witness.',
      'she saw them take him.',
      'she will not forget.',
    ],
    mandarin: '證人',
  },
  {
    word: 'relative',
    ipa: '/ˈrɛlətɪv/',
    partOfSpeech: 'noun',
    definition: 'a member of your family.',
    example: [
      'he had a relative in block 9.',
      'they used to write letters.',
      'the letters stopped.',
    ],
    mandarin: '親屬',
  },
  {
    word: 'individual',
    ipa: '/ˌɪndɪˈvɪdʒuəl/',
    partOfSpeech: 'noun, adjective',
    definition: 'a single person, separate from a group.',
    example: [
      'she was an individual.',
      'not a designation.',
      'a person with a story.',
    ],
    mandarin: '個人',
  },
  {
    word: 'independent',
    ipa: '/ˌɪndɪˈpɛndənt/',
    partOfSpeech: 'adjective',
    definition: 'not controlled by someone else; thinking for yourself.',
    example: [
      'they were independent before.',
      'they made their own choices.',
      'it was not allowed.',
    ],
    mandarin: '獨立',
  },
  {
    word: 'private',
    ipa: '/ˈpraɪvət/',
    partOfSpeech: 'adjective',
    definition: 'personal; not shared with others.',
    example: [
      'he kept a private notebook.',
      'he wrote his own thoughts.',
      'the inspector found it.',
    ],
    mandarin: '私人',
  },
];

function LexiconEntry({ entry }: { entry: BlackWord }) {
  const [showMandarin, setShowMandarin] = useState(false);

  return (
    <div className="mb-8">
      <p className="text-rose-400 mb-0.5">[ {entry.word} ]</p>
      <p className="text-slate-500 text-xs mb-3">
        {entry.ipa} &nbsp;·&nbsp; {entry.partOfSpeech}
      </p>

      <p className="text-slate-200 mb-4 leading-relaxed">{entry.definition}</p>

      <div className="mb-4 space-y-0.5 text-slate-300">
        {entry.example.map((line, idx) => (
          <p key={idx}>
            <span className="text-rose-400/60">&gt;</span> {line}
          </p>
        ))}
      </div>

      {showMandarin ? (
        <p className="text-slate-300">
          <span className="text-rose-400/60">&gt;</span> 中文:{' '}
          <span className="text-slate-100">{entry.mandarin}</span>
        </p>
      ) : (
        <button
          onClick={() => setShowMandarin(true)}
          className="text-slate-500 hover:text-slate-300 transition-colors lowercase"
        >
          &gt; show 中文
        </button>
      )}

      <hr className="mt-6 border-slate-800" />
    </div>
  );
}

export default function LexiconTab() {
  return (
    <div>
      <p className="text-slate-500 text-xs mb-6 lowercase">
        &gt; words removed from approved register.
      </p>

      {ENTRIES.map((entry) => (
        <LexiconEntry key={entry.word} entry={entry} />
      ))}

      <p className="text-rose-400/70 text-xs mt-4">— F</p>
    </div>
  );
}
