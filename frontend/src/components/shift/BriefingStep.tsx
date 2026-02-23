import { useEffect, useRef, useState } from 'react';
import { useShiftStore } from '../../stores/shiftStore';
import { usePearlStore } from '../../stores/pearlStore';
import { getSocket } from '../../utils/socket';
import MultipleChoiceCheck from './shared/MultipleChoiceCheck';
import type { ComprehensionCheck } from '../../types/shifts';
import StoryBeatCard from './shared/StoryBeatCard';
import type { StoryBeatConfig } from './shared/StoryBeatCard';
import FrostedGlassPlayer from './media/FrostedGlassPlayer';
import { resolveUploadUrl } from '../../api/client';

type VideoSourceMode = 'auto' | 'upload' | 'embed';
type NowShowingStage = 'clip_a' | 'activity' | 'clip_b' | 'free';

type VideoChoice = {
  kind: 'upload' | 'embed' | 'none';
  src?: string;
};

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === 'number');
}

function chooseVideoSource(
  mode: VideoSourceMode,
  uploadedUrl?: string,
  embedUrl?: string
): VideoChoice {
  const uploaded = resolveUploadUrl((uploadedUrl || '').trim());
  const embed = (embedUrl || '').trim();

  if (mode === 'upload') {
    return uploaded ? { kind: 'upload', src: uploaded } : { kind: 'none' };
  }

  if (mode === 'embed') {
    return embed ? { kind: 'embed', src: embed } : { kind: 'none' };
  }

  if (uploaded) {
    return { kind: 'upload', src: uploaded };
  }
  if (embed) {
    return { kind: 'embed', src: embed };
  }

  return { kind: 'none' };
}

export default function BriefingStep() {
  const { missions, updateStepStatus, submitMissionScore, nextStep, updateMissionConfig } = useShiftStore();
  const triggerBark = usePearlStore(s => s.triggerBark);

  const mission = missions.find(m => m.missionType === 'briefing');
  const config = (mission?.config || {}) as {
    embedUrl?: string;
    uploadedVideoUrl?: string;
    clipAEmbedUrl?: string;
    clipAUploadedVideoUrl?: string;
    clipBEmbedUrl?: string;
    clipBUploadedVideoUrl?: string;
    videoSource?: VideoSourceMode;
    nowShowingStage?: NowShowingStage;
    checks?: ComprehensionCheck[];
    fallbackText?: string;
    transcript?: string[];
    episodeTitle?: string;
    storyBeat?: StoryBeatConfig;
    bridgeLine?: string;
  };

  const checks = config.checks || [];
  const embedUrl = config.embedUrl;
  const uploadedVideoUrl = config.uploadedVideoUrl;
  const clipAEmbedUrl = config.clipAEmbedUrl;
  const clipAUploadedVideoUrl = config.clipAUploadedVideoUrl;
  const clipBEmbedUrl = config.clipBEmbedUrl;
  const clipBUploadedVideoUrl = config.clipBUploadedVideoUrl;
  const videoSource: VideoSourceMode = config.videoSource || 'auto';
  const nowShowingStage: NowShowingStage = config.nowShowingStage || 'free';
  const fallbackText = config.fallbackText;
  const transcript = config.transcript || [];
  const storyBeat = config.storyBeat;
  const episodeTitle = config.episodeTitle;
  const bridgeLine = config.bridgeLine;

  const existingDetails = (mission?.score?.details || null) as Record<string, unknown> | null;
  const persistedStatus = typeof existingDetails?.status === 'string' ? existingDetails.status : '';

  const [embedFailed, setEmbedFailed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [activityComplete, setActivityComplete] = useState(
    checks.length === 0 || persistedStatus === 'activity_complete' || persistedStatus === 'complete'
  );
  const [activityAnswers, setActivityAnswers] = useState<number[]>(toNumberArray(existingDetails?.answers));
  const [activityScore, setActivityScore] = useState<number>(
    typeof existingDetails?.score === 'number' ? existingDetails.score : 0
  );

  const sequenceMode = nowShowingStage !== 'free';

  const primaryVideo = chooseVideoSource(videoSource, uploadedVideoUrl, embedUrl);
  const clipAVideo = chooseVideoSource(videoSource, clipAUploadedVideoUrl || uploadedVideoUrl, clipAEmbedUrl || embedUrl);
  const clipBVideo = chooseVideoSource(videoSource, clipBUploadedVideoUrl || uploadedVideoUrl, clipBEmbedUrl || embedUrl);

  const activeVideo = nowShowingStage === 'clip_a'
    ? clipAVideo
    : nowShowingStage === 'clip_b'
    ? clipBVideo
    : primaryVideo;

  useEffect(() => {
    const details = (mission?.score?.details || null) as Record<string, unknown> | null;
    const status = typeof details?.status === 'string' ? details.status : '';
    setActivityComplete(checks.length === 0 || status === 'activity_complete' || status === 'complete');
    setActivityAnswers(toNumberArray(details?.answers));
    setActivityScore(typeof details?.score === 'number' ? details.score : 0);
  }, [mission?.id, checks.length]);

  useEffect(() => {
    setEmbedFailed(false);
  }, [activeVideo.src, nowShowingStage]);

  // Listen for real-time stage changes from teacher via WebSocket
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !mission) return;

    const handler = (data: { missionId: string; nowShowingStage: string }) => {
      if (data.missionId === mission.id) {
        updateMissionConfig(mission.id, { nowShowingStage: data.nowShowingStage });
      }
    };

    socket.on('briefing:stage-changed', handler);
    return () => { socket.off('briefing:stage-changed', handler); };
  }, [mission?.id, updateMissionConfig]);

  // Bridge line bark when stage transitions to activity
  const bridgeBarkedRef = useRef(false);
  useEffect(() => {
    if (nowShowingStage === 'activity' && bridgeLine && !bridgeBarkedRef.current) {
      bridgeBarkedRef.current = true;
      triggerBark('notice', bridgeLine);
    }
    if (nowShowingStage !== 'activity') {
      bridgeBarkedRef.current = false;
    }
  }, [nowShowingStage, bridgeLine, triggerBark]);

  const handleCheckSubmit = async (answers: number[], score: number) => {
    if (!mission) return;

    if (sequenceMode) {
      setActivityComplete(true);
      setActivityAnswers(answers);
      setActivityScore(score);
      updateStepStatus('briefing', 'in_progress', { answers, score, activityComplete: true });
      await submitMissionScore(mission.id, score, { status: 'activity_complete', answers, score });

      if (score >= 0.8) {
        triggerBark('success', 'Activity complete. Await next Now Showing stage.');
      } else {
        triggerBark('hint', 'Activity submitted. Review feedback before the next clip.');
      }
      return;
    }

    setCompleted(true);
    updateStepStatus('briefing', 'complete', { answers, score });
    await submitMissionScore(mission.id, score, { status: 'complete', answers, score });

    if (score >= 0.8) {
      triggerBark('success', 'Briefing comprehension verified. Excellent awareness, Citizen.');
    } else if (score >= 0.5) {
      triggerBark('hint', 'Partial comprehension noted. Review the material when possible.');
    } else {
      triggerBark('incorrect', 'The Ministry suggests re-reading briefings more carefully.');
    }
    setTimeout(() => nextStep(), 2000);
  };

  const handleSequenceComplete = async () => {
    if (!mission || completed || !activityComplete) return;
    setCompleted(true);
    const finalScore = checks.length === 0 ? 1 : activityScore;
    const details = {
      status: 'complete',
      answers: activityAnswers,
      score: finalScore,
      nowShowingStage,
      sequenceMode: true,
    };

    updateStepStatus('briefing', 'complete', details);
    await submitMissionScore(mission.id, finalScore, details);
    triggerBark('success', 'Briefing sequence complete. Proceeding to Language Desk.');
    setTimeout(() => nextStep(), 2000);
  };

  const renderVideoBlock = () => {
    if (activeVideo.kind === 'upload' && activeVideo.src) {
      const title = nowShowingStage === 'clip_b'
        ? '1950s Briefing TV — Clip B'
        : nowShowingStage === 'clip_a'
        ? '1950s Briefing TV — Clip A'
        : '1950s Briefing TV';
      return <FrostedGlassPlayer src={activeVideo.src} title={title} />;
    }

    if (activeVideo.kind === 'embed' && activeVideo.src && !embedFailed) {
      return (
        <div>
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            <iframe
              src={activeVideo.src}
              className="absolute inset-0 w-full h-full rounded-lg"
              title="Ministry Briefing"
              onError={() => setEmbedFailed(true)}
              allow="autoplay; fullscreen"
            />
          </div>
          <a
            href={activeVideo.src}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-2 text-center font-ibm-mono text-[10px] text-white/30 tracking-wider hover:text-neon-cyan/70 transition-colors"
          >
            Open briefing in new tab
          </a>
        </div>
      );
    }

    return (
      <div>
        <div className="font-ibm-mono text-xs text-neon-cyan/60 tracking-[0.3em] uppercase mb-3 text-center">
          BRIEFING DOCUMENT
        </div>
        {fallbackText ? (
          <p className="font-ibm-sans text-base text-white/80 leading-relaxed mb-4">
            {fallbackText}
          </p>
        ) : (
          <p className="font-ibm-mono text-[11px] text-white/30 tracking-wider text-center mb-4">
            External briefing unavailable — review the summary below and answer the checks.
          </p>
        )}
        {transcript.length > 0 && (
          <div className="space-y-2 mt-4 pt-3 border-t border-white/10">
            <div className="font-ibm-mono text-[10px] text-neon-cyan/50 tracking-[0.2em] uppercase mb-2">
              Briefing Transcript
            </div>
            {transcript.map((line, i) => (
              <p key={i} className="font-ibm-sans text-sm text-white/70 leading-relaxed pl-3 border-l border-white/10">
                {line}
              </p>
            ))}
          </div>
        )}
        {activeVideo.kind === 'embed' && activeVideo.src && embedFailed && (
          <a
            href={activeVideo.src}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-3 text-center font-ibm-mono text-xs text-neon-cyan tracking-wider hover:text-neon-cyan/80 transition-colors"
          >
            Try opening briefing in new tab
          </a>
        )}
      </div>
    );
  };

  // In sequence mode, if the current clip has no real video, fall back to showing
  // checks + continue so the student isn't stuck waiting for a teacher action on
  // an empty stage.
  const clipHasVideo =
    (nowShowingStage === 'clip_a' && clipAVideo.kind !== 'none') ||
    (nowShowingStage === 'clip_b' && clipBVideo.kind !== 'none');
  const sequenceFallback = sequenceMode && !clipHasVideo &&
    (nowShowingStage === 'clip_a' || nowShowingStage === 'clip_b');

  const showVideo = nowShowingStage === 'clip_a' || nowShowingStage === 'clip_b' || nowShowingStage === 'free';
  const showChecks = checks.length > 0 && (
    nowShowingStage === 'activity' || nowShowingStage === 'free' || sequenceFallback
  );

  return (
    <div className="space-y-5">
      <StoryBeatCard storyBeat={storyBeat} />

      <div className="ios-glass-card p-5 space-y-4">
        {episodeTitle && (
          <h2 className="font-special-elite text-base text-white/90 tracking-wider">
            {episodeTitle}
          </h2>
        )}

        {showVideo && renderVideoBlock()}

        {nowShowingStage === 'activity' && activityComplete && (
          <div className="border border-neon-mint/30 bg-neon-mint/5 rounded-lg p-3">
            <p className="font-ibm-mono text-xs text-neon-mint tracking-wider">
              Activity submitted. Waiting for teacher.
            </p>
          </div>
        )}

        {((nowShowingStage === 'clip_b' && sequenceMode) || sequenceFallback) && (
          <div className="space-y-3">
            {!activityComplete && (
              <p className="font-ibm-mono text-[11px] text-white/40 tracking-wider text-center">
                Complete the activity first to continue.
              </p>
            )}
            <button
              onClick={handleSequenceComplete}
              disabled={!activityComplete || completed}
              className={`w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] transition-all ${
                activityComplete && !completed
                  ? 'ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)]'
                  : 'ios-glass-pill text-white/25 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          </div>
        )}
      </div>

      {showChecks && !activityComplete && (
        <MultipleChoiceCheck checks={checks} onSubmit={handleCheckSubmit} />
      )}

      {/* Free mode: show Continue when no checks or checks already done */}
      {!sequenceMode && !completed && activityComplete && (
        <button
          onClick={async () => {
            if (!mission) return;
            setCompleted(true);
            const finalScore = checks.length === 0 ? 1 : activityScore;
            updateStepStatus('briefing', 'complete', { answers: activityAnswers, score: finalScore });
            await submitMissionScore(mission.id, finalScore, { status: 'complete', answers: activityAnswers, score: finalScore });
            triggerBark('success', 'Briefing acknowledged. Proceeding to Language Desk.');
            setTimeout(() => nextStep(), 1500);
          }}
          className="w-full py-3 rounded-full font-ibm-mono text-xs uppercase tracking-[0.25em] transition-all ios-glass-pill-action text-neon-cyan hover:shadow-[0_0_16px_rgba(0,229,255,0.2)]"
        >
          Continue
        </button>
      )}

      {completed && (
        <div className="text-center font-ibm-mono text-xs text-neon-mint tracking-wider animate-pulse ios-text-glow-mint">
          COMPLETE
        </div>
      )}
    </div>
  );
}
