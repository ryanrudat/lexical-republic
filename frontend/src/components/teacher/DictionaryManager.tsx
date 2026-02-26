import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchDictionary, updateTeacherDictionaryWord } from '../../api/dictionary';
import type { DictionaryWord, WordStatus } from '../../types/dictionary';
import client from '../../api/client';

const STATUS_OPTIONS: WordStatus[] = ['approved', 'monitored', 'grey', 'proscribed', 'recovered'];
const TOEIC_OPTIONS = ['business', 'communication', 'office', 'personnel', 'procedures'];

export default function DictionaryManager() {
  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [weekFilter, setWeekFilter] = useState<number | 'all'>('all');
  const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadStatus, setVideoUploadStatus] = useState('');

  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = async () => {
    try {
      const { words: w } = await fetchDictionary();
      setWords(w);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const handleCellSave = useCallback(async (wordId: string, field: string, value: unknown) => {
    setSaveStatus((s) => ({ ...s, [wordId]: 'saving...' }));
    try {
      await updateTeacherDictionaryWord(wordId, { [field]: value });
      setSaveStatus((s) => ({ ...s, [wordId]: 'Saved' }));
      setTimeout(() => setSaveStatus((s) => ({ ...s, [wordId]: '' })), 2000);
    } catch {
      setSaveStatus((s) => ({ ...s, [wordId]: 'Error' }));
    }
  }, []);

  const handleWelcomeVideoUpload = async () => {
    if (!videoFile) return;
    setVideoUploading(true);
    setVideoUploadStatus('');
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      await client.post('/dictionary/welcome-video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setVideoUploadStatus('Uploaded successfully');
      setVideoFile(null);
    } catch {
      setVideoUploadStatus('Upload failed');
    }
    setVideoUploading(false);
  };

  const filteredWords = words.filter((w) => {
    if (weekFilter !== 'all' && w.weekIntroduced !== weekFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return w.word.toLowerCase().includes(q) || w.partyDefinition.toLowerCase().includes(q);
    }
    return true;
  });

  const availableWeeks = [...new Set(words.map((w) => w.weekIntroduced))].sort((a, b) => a - b);

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading dictionary...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Video Upload */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Welcome Video</h3>
        <p className="text-xs text-slate-400 mb-3">
          Upload a welcome video that new students will see on their first login.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            className="text-xs text-slate-300"
          />
          <button
            onClick={handleWelcomeVideoUpload}
            disabled={!videoFile || videoUploading}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {videoUploading ? 'Uploading...' : 'Upload'}
          </button>
          {videoUploadStatus && (
            <span className={`text-xs ${videoUploadStatus.includes('fail') ? 'text-red-400' : 'text-emerald-400'}`}>
              {videoUploadStatus}
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search words..."
          className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500"
        />
        <select
          value={weekFilter}
          onChange={(e) => setWeekFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded text-slate-200 outline-none"
        >
          <option value="all">All Weeks</option>
          {availableWeeks.map((w) => (
            <option key={w} value={w}>Week {w}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400 ml-auto">
          {filteredWords.length} of {words.length} words
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="px-2 py-2 text-xs text-slate-400 font-medium">Word</th>
              <th className="px-2 py-2 text-xs text-slate-400 font-medium">POS</th>
              <th className="px-2 py-2 text-xs text-slate-400 font-medium w-64">Definition</th>
              <th className="px-2 py-2 text-xs text-slate-400 font-medium">&#x4E2D;&#x6587;</th>
              <th className="px-2 py-2 text-xs text-slate-400 font-medium w-48">Example</th>
              <th className="px-2 py-2 text-xs text-slate-400 font-medium">Status</th>
              <th className="px-2 py-2 text-xs text-slate-400 font-medium">Wk</th>
              <th className="px-2 py-2 text-xs text-slate-400 font-medium">Target</th>
              <th className="px-2 py-2 text-xs text-slate-400 font-medium">TOEIC</th>
              <th className="px-2 py-2 text-xs text-slate-400 font-medium w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filteredWords.map((w) => (
              <WordRow
                key={w.id}
                word={w}
                onSave={handleCellSave}
                status={saveStatus[w.id] || ''}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WordRow({
  word,
  onSave,
  status,
}: {
  word: DictionaryWord;
  onSave: (wordId: string, field: string, value: unknown) => void;
  status: string;
}) {
  return (
    <tr className="border-b border-slate-800 hover:bg-slate-800/30">
      <td className="px-2 py-1.5 text-slate-200 font-medium">{word.word}</td>
      <td className="px-2 py-1.5 text-slate-400 text-xs">{word.partOfSpeech}</td>
      <td className="px-2 py-1.5">
        <EditableCell
          value={word.partyDefinition}
          onSave={(v) => onSave(word.id, 'partyDefinition', v)}
        />
      </td>
      <td className="px-2 py-1.5">
        <EditableCell
          value={word.translationZhTw || ''}
          onSave={(v) => onSave(word.id, 'translationZhTw', v)}
          placeholder="&#x4E2D;&#x6587;"
        />
      </td>
      <td className="px-2 py-1.5">
        <EditableCell
          value={word.exampleSentence}
          onSave={(v) => onSave(word.id, 'exampleSentence', v)}
        />
      </td>
      <td className="px-2 py-1.5">
        <select
          defaultValue={word.status}
          onChange={(e) => onSave(word.id, 'initialStatus', e.target.value)}
          className="text-xs bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-slate-300 outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5 text-slate-400 text-xs text-center">{word.weekIntroduced}</td>
      <td className="px-2 py-1.5 text-center">
        <input
          type="checkbox"
          checked={!word.isWorldBuilding}
          onChange={(e) => onSave(word.id, 'isWorldBuilding', !e.target.checked)}
          className="rounded"
        />
      </td>
      <td className="px-2 py-1.5">
        <select
          defaultValue={word.toeicCategory}
          onChange={(e) => onSave(word.id, 'toeicCategory', e.target.value)}
          className="text-xs bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-slate-300 outline-none"
        >
          {TOEIC_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5 text-xs text-emerald-400">{status}</td>
    </tr>
  );
}

function EditableCell({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = () => {
    setEditing(false);
    if (text !== value) {
      onSave(text);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
        className="w-full text-xs bg-slate-700 border border-indigo-500 rounded px-1 py-0.5 text-slate-200 outline-none"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="text-xs text-slate-300 cursor-pointer hover:text-slate-100 block truncate"
      title={value || placeholder}
    >
      {value || <span className="text-slate-600">{placeholder || 'Click to edit'}</span>}
    </span>
  );
}
