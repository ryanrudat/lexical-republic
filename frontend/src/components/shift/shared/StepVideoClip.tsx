import FrostedGlassPlayer from '../media/FrostedGlassPlayer';
import { resolveUploadUrl } from '../../../api/client';

interface StepVideoClipProps {
  config: Record<string, unknown>;
  stepLabel?: string;
}

/**
 * Renders a teacher-uploaded video clip at the top of any shift step.
 * Checks config.teacherOverride.videoClipUrl — if present, shows the
 * FrostedGlassPlayer. Otherwise renders nothing.
 */
export default function StepVideoClip({ config, stepLabel }: StepVideoClipProps) {
  const override = config?.teacherOverride as Record<string, unknown> | undefined;
  const raw = typeof override?.videoClipUrl === 'string' ? override.videoClipUrl : '';
  const videoClipUrl = resolveUploadUrl(raw);

  if (!videoClipUrl) return null;

  return (
    <div className="mb-4">
      <FrostedGlassPlayer
        src={videoClipUrl}
        title={stepLabel ? `${stepLabel} — Video Clip` : 'Video Clip'}
      />
    </div>
  );
}
