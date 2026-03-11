import MonitorPlayer from '../../shared/MonitorPlayer';
import { resolveUploadUrl } from '../../../api/client';

interface StepVideoClipProps {
  config: Record<string, unknown>;
  stepLabel?: string;
}

/**
 * Renders a teacher-configured video clip at the top of any shift step.
 * Checks config.teacherOverride for:
 *   - videoClipUrl (uploaded file) → MonitorPlayer
 *   - videoClipEmbedUrl (external embed) → MonitorPlayer
 * Prefers uploaded video over embed. Renders nothing if both are empty.
 */
export default function StepVideoClip({ config }: StepVideoClipProps) {
  const override = config?.teacherOverride as Record<string, unknown> | undefined;
  const rawUpload = typeof override?.videoClipUrl === 'string' ? override.videoClipUrl : '';
  const rawEmbed = typeof override?.videoClipEmbedUrl === 'string' ? override.videoClipEmbedUrl : '';
  const uploadUrl = resolveUploadUrl(rawUpload);
  const embedUrl = rawEmbed.trim();

  // Prefer uploaded video
  if (uploadUrl) {
    return (
      <div className="mb-4 max-w-2xl mx-auto">
        <MonitorPlayer src={uploadUrl} />
      </div>
    );
  }

  // Fallback to embed URL
  if (embedUrl) {
    return (
      <div className="mb-4 max-w-2xl mx-auto">
        <MonitorPlayer embedUrl={embedUrl} />
      </div>
    );
  }

  return null;
}
