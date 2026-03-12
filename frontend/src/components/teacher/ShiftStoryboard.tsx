import { useEffect, useState, useCallback, useRef } from 'react';
import {
  fetchWeekStoryboard,
  updateStepActivity,
  uploadStepVideo,
} from '../../api/teacher';
import type { StoryboardData, StoryboardStep } from '../../api/teacher';
import { resolveUploadUrl } from '../../api/client';
import MonitorPlayer from '../shared/MonitorPlayer';

interface ShiftStoryboardProps {
  weekId: string;
}

function SavedToast({ visible }: { visible: boolean }) {
  return (
    <span
      className={`text-xs font-medium text-emerald-600 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      Saved &check;
    </span>
  );
}

export default function ShiftStoryboard({ weekId }: ShiftStoryboardProps) {
  const [data, setData] = useState<StoryboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedStep, setSavedStep] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!weekId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWeekStoryboard(weekId);
      setData(result);
    } catch {
      setError('Failed to load storyboard');
    } finally {
      setLoading(false);
    }
  }, [weekId]);

  useEffect(() => {
    void load();
  }, [load]);

  const flashSaved = (stepType: string) => {
    setSavedStep(stepType);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedStep(null), 2000);
  };

  const handleRemoveVideo = async (step: StoryboardStep) => {
    if (!data) return;
    try {
      await updateStepActivity(data.weekId, step.missionType, { removeVideo: true });
      flashSaved(step.missionType);
      await load();
    } catch {
      setError('Failed to remove video');
    }
  };

  const handleUploadStepVideo = async (step: StoryboardStep, file: File) => {
    if (!data) return;
    try {
      await uploadStepVideo(data.weekId, step.missionType, file);
      flashSaved(step.missionType);
      await load();
    } catch {
      setError('Failed to upload video');
    }
  };

  const handleEmbedUrlChange = async (step: StoryboardStep, embedUrl: string) => {
    if (!data) return;
    try {
      await updateStepActivity(data.weekId, step.missionType, { videoClipEmbedUrl: embedUrl });
      flashSaved(step.missionType);
      await load();
    } catch {
      setError('Failed to update embed URL');
    }
  };

  const handleToggleHidden = async (step: StoryboardStep, hidden: boolean) => {
    if (!data) return;
    try {
      await updateStepActivity(data.weekId, step.missionType, { videoClipHidden: hidden });
      flashSaved(step.missionType);
      await load();
    } catch {
      setError('Failed to toggle video visibility');
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-slate-400 animate-pulse py-4">
        Loading storyboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 py-4">
        {error}
        <button
          onClick={() => void load()}
          className="ml-3 text-indigo-600 hover:text-indigo-500 transition-colors font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">
          Shift {data.weekNumber}: {data.title}
        </h3>
        <span className="text-xs text-slate-400">
          {data.steps.length} steps
        </span>
      </div>

      {data.steps.map((step) => (
        <StoryboardCard
          key={step.missionType}
          step={step}
          saved={savedStep === step.missionType}
          onRemoveVideo={() => handleRemoveVideo(step)}
          onUploadVideo={(file) => handleUploadStepVideo(step, file)}
          onEmbedUrlChange={(url) => handleEmbedUrlChange(step, url)}
          onToggleHidden={(hidden) => handleToggleHidden(step, hidden)}
        />
      ))}
    </div>
  );
}

interface StoryboardCardProps {
  step: StoryboardStep;
  saved: boolean;
  onRemoveVideo: () => void;
  onUploadVideo: (file: File) => void;
  onEmbedUrlChange: (embedUrl: string) => void;
  onToggleHidden: (hidden: boolean) => void;
}

function StoryboardCard({
  step,
  saved,
  onRemoveVideo,
  onUploadVideo,
  onEmbedUrlChange,
  onToggleHidden,
}: StoryboardCardProps) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <span className="text-lg">{step.icon}</span>
        <span className="text-sm font-medium text-slate-800 flex-1">
          {step.orderIndex + 1}. {step.label}
        </span>
        <SavedToast visible={saved} />
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-3">
        {/* Location tag */}
        {step.location && (
          <span className="inline-block text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded">
            {step.location}
          </span>
        )}

        {/* Step video clip */}
        <StepVideoSection
          step={step}
          onUpload={onUploadVideo}
          onRemove={onRemoveVideo}
          onEmbedUrlChange={onEmbedUrlChange}
          onToggleHidden={onToggleHidden}
        />
      </div>
    </div>
  );
}

function StepVideoSection({
  step,
  onUpload,
  onRemove,
  onEmbedUrlChange,
  onToggleHidden,
}: {
  step: StoryboardStep;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onEmbedUrlChange: (url: string) => void;
  onToggleHidden: (hidden: boolean) => void;
}) {
  const [embedDraft, setEmbedDraft] = useState(step.videoClipEmbedUrl || '');
  const [showEmbedInput, setShowEmbedInput] = useState(false);
  const hasUpload = !!step.videoClipFilename;
  const hasEmbed = !!step.videoClipEmbedUrl;
  const hasMedia = hasUpload || hasEmbed;

  return (
    <div className="space-y-2 pt-1">
      {/* Uploaded video — preview + controls */}
      {hasUpload && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className={`text-sm truncate flex-1 ${step.videoClipHidden ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
              Video: {step.videoClipFilename}
            </span>
            <button
              onClick={() => onToggleHidden(!step.videoClipHidden)}
              className={`text-xs font-medium px-2 py-1 transition-colors ${
                step.videoClipHidden
                  ? 'text-amber-600 hover:text-amber-700'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {step.videoClipHidden ? 'Show' : 'Hide'}
            </button>
            <button
              onClick={onRemove}
              className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors px-2 py-1"
            >
              Remove
            </button>
          </div>
          {/* Video preview */}
          <div className="max-w-md">
            <MonitorPlayer src={resolveUploadUrl(step.videoClipUrl)} />
          </div>
        </div>
      )}

      {/* Embed URL display — preview + controls */}
      {hasEmbed && !hasUpload && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className={`text-sm truncate flex-1 ${step.videoClipHidden ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
              Embed: {step.videoClipEmbedUrl}
            </span>
            <button
              onClick={() => onToggleHidden(!step.videoClipHidden)}
              className={`text-xs font-medium px-2 py-1 transition-colors ${
                step.videoClipHidden
                  ? 'text-amber-600 hover:text-amber-700'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {step.videoClipHidden ? 'Show' : 'Hide'}
            </button>
            <button
              onClick={() => onEmbedUrlChange('')}
              className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors px-2 py-1"
            >
              Remove
            </button>
          </div>
          {/* Embed preview */}
          <div className="max-w-md">
            <MonitorPlayer embedUrl={step.videoClipEmbedUrl} />
          </div>
        </div>
      )}

      {/* Add media buttons */}
      {!hasMedia && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium px-3 py-1.5 border border-slate-300 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-colors cursor-pointer rounded-lg">
            + Upload Video
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = '';
              }}
            />
          </label>
          <button
            onClick={() => setShowEmbedInput(true)}
            className="text-xs font-medium px-3 py-1.5 border border-slate-300 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-colors rounded-lg"
          >
            + Embed URL
          </button>
        </div>
      )}

      {/* Embed URL input */}
      {showEmbedInput && !hasMedia && (
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={embedDraft}
            onChange={(e) => setEmbedDraft(e.target.value)}
            placeholder="https://..."
            className="flex-1 bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={() => {
              if (embedDraft.trim()) {
                onEmbedUrlChange(embedDraft.trim());
                setShowEmbedInput(false);
              }
            }}
            disabled={!embedDraft.trim()}
            className="text-xs font-medium px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-40"
          >
            Save
          </button>
          <button
            onClick={() => { setShowEmbedInput(false); setEmbedDraft(''); }}
            className="text-xs font-medium px-2 py-1.5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
