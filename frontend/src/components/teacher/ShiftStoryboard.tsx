import { useEffect, useState, useCallback, useRef } from 'react';
import {
  fetchWeekStoryboard,
  updateStepActivity,
  uploadStepVideo,
  updateWeekBriefing,
  uploadWeekBriefingVideo,
} from '../../api/teacher';
import type { StoryboardData, StoryboardStep } from '../../api/teacher';

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

  const handleSwapActivity = async (step: StoryboardStep, activityId: string) => {
    if (!data) return;
    try {
      if (activityId === 'default') {
        await updateStepActivity(data.weekId, step.missionType, { reset: true });
      } else {
        await updateStepActivity(data.weekId, step.missionType, { activityId });
      }
      flashSaved(step.missionType);
      await load();
    } catch {
      setError('Failed to swap activity');
    }
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

  const handleBriefingNowShowing = async (stage: string) => {
    if (!data) return;
    try {
      await updateWeekBriefing(data.weekId, {
        nowShowingStage: stage as 'clip_a' | 'activity' | 'clip_b' | 'free',
      });
      flashSaved('briefing');
      await load();
    } catch {
      setError('Failed to update Now Showing');
    }
  };

  const handleBriefingVideoUpload = async (file: File, slot: 'primary' | 'clipA' | 'clipB') => {
    if (!data) return;
    try {
      await uploadWeekBriefingVideo(data.weekId, file, slot);
      flashSaved('briefing');
      await load();
    } catch {
      setError('Failed to upload briefing video');
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
          onSwapActivity={(activityId) => handleSwapActivity(step, activityId)}
          onRemoveVideo={() => handleRemoveVideo(step)}
          onUploadVideo={(file) => handleUploadStepVideo(step, file)}
          onBriefingNowShowing={handleBriefingNowShowing}
          onBriefingVideoUpload={handleBriefingVideoUpload}
        />
      ))}
    </div>
  );
}

interface StoryboardCardProps {
  step: StoryboardStep;
  saved: boolean;
  onSwapActivity: (activityId: string) => void;
  onRemoveVideo: () => void;
  onUploadVideo: (file: File) => void;
  onBriefingNowShowing: (stage: string) => void;
  onBriefingVideoUpload: (file: File, slot: 'primary' | 'clipA' | 'clipB') => void;
}

function StoryboardCard({
  step,
  saved,
  onSwapActivity,
  onRemoveVideo,
  onUploadVideo,
  onBriefingNowShowing,
  onBriefingVideoUpload,
}: StoryboardCardProps) {
  const isBriefing = step.missionType === 'briefing';
  const isClockOut = step.missionType === 'clock_out';
  const hasAlternatives = step.alternatives.length > 0;

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
        {/* Summary */}
        {step.summary && (
          <p className="text-sm text-slate-600 leading-relaxed">
            {step.summary}
          </p>
        )}

        {/* Vocab/Grammar tags */}
        {(step.knownWords.length > 0 || step.newWords.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {step.knownWords.map((w) => (
              <span
                key={w}
                className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded"
              >
                {w}
              </span>
            ))}
            {step.newWords.map((w) => (
              <span
                key={w}
                className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-medium"
              >
                {w}
              </span>
            ))}
          </div>
        )}

        {step.grammarFocus && (
          <p className="text-sm text-indigo-600">
            Grammar: {step.grammarFocus}
          </p>
        )}

        {/* Briefing-specific section */}
        {isBriefing && (
          <BriefingSection
            step={step}
            onNowShowing={onBriefingNowShowing}
            onVideoUpload={onBriefingVideoUpload}
          />
        )}

        {/* Activity swap dropdown */}
        {hasAlternatives && !isClockOut && (
          <div className="flex items-center gap-3 pt-1">
            <label className="text-xs font-medium text-slate-500 shrink-0">
              Activity:
            </label>
            <select
              value={step.currentActivityId}
              onChange={(e) => onSwapActivity(e.target.value)}
              className="flex-1 bg-white border border-slate-300 px-3 py-2 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="default">Default</option>
              {step.alternatives.map((alt) => (
                <option key={alt.id} value={alt.id}>
                  {alt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Step video clip */}
        {!isBriefing && !isClockOut && (
          <StepVideoSection
            videoClipFilename={step.videoClipFilename}
            onUpload={onUploadVideo}
            onRemove={onRemoveVideo}
          />
        )}
      </div>
    </div>
  );
}

function BriefingSection({
  step,
  onNowShowing,
  onVideoUpload,
}: {
  step: StoryboardStep;
  onNowShowing: (stage: string) => void;
  onVideoUpload: (file: File, slot: 'primary' | 'clipA' | 'clipB') => void;
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
      {/* Episode info */}
      {step.episodeTitle && (
        <p className="text-sm font-medium text-amber-700">
          {step.episodeTitle}
        </p>
      )}

      {/* Clip A */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-slate-500 shrink-0">Clip A:</span>
          <span className="text-xs text-slate-400 truncate">
            {step.clipAUploadedVideoFilename || step.clipAEmbedUrl || 'none'}
          </span>
        </div>
        <label className="shrink-0 text-xs font-medium px-3 py-1.5 bg-white border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer rounded-lg">
          Upload
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onVideoUpload(file, 'clipA');
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {/* Activity (checks count) */}
      <div className="text-sm text-slate-600 py-2 border-t border-b border-slate-200">
        Activity: {step.checksCount || 0} Comprehension Checks
      </div>

      {/* Clip B */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-slate-500 shrink-0">Clip B:</span>
          <span className="text-xs text-slate-400 truncate">
            {step.clipBUploadedVideoFilename || step.clipBEmbedUrl || 'none'}
          </span>
        </div>
        <label className="shrink-0 text-xs font-medium px-3 py-1.5 bg-white border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer rounded-lg">
          Upload
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onVideoUpload(file, 'clipB');
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {/* Now Showing control */}
      <div className="flex items-center gap-3 pt-1">
        <label className="text-xs font-medium text-slate-500 shrink-0">
          Now Showing:
        </label>
        <select
          value={step.nowShowingStage || 'free'}
          onChange={(e) => onNowShowing(e.target.value)}
          className="flex-1 bg-white border border-slate-300 px-3 py-2 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="clip_a">Clip A</option>
          <option value="activity">Activity</option>
          <option value="clip_b">Clip B</option>
          <option value="free">Free (student self-paced)</option>
        </select>
      </div>
    </div>
  );
}

function StepVideoSection({
  videoClipFilename,
  onUpload,
  onRemove,
}: {
  videoClipFilename: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 pt-1">
      {videoClipFilename ? (
        <>
          <span className="text-sm text-slate-600 truncate flex-1">
            Video: {videoClipFilename}
          </span>
          <button
            onClick={onRemove}
            className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors px-2 py-1"
          >
            Remove
          </button>
        </>
      ) : (
        <label className="text-xs font-medium px-3 py-1.5 border border-slate-300 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-colors cursor-pointer rounded-lg">
          + Add Video Clip
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
      )}
    </div>
  );
}
