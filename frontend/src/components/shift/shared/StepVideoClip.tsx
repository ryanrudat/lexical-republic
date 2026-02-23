import { useState } from 'react';
import FrostedGlassPlayer from '../media/FrostedGlassPlayer';
import { resolveUploadUrl } from '../../../api/client';

interface StepVideoClipProps {
  config: Record<string, unknown>;
  stepLabel?: string;
}

/**
 * Renders a teacher-configured video clip at the top of any shift step.
 * Checks config.teacherOverride for:
 *   - videoClipUrl (uploaded file) → FrostedGlassPlayer
 *   - videoClipEmbedUrl (external embed) → iframe
 * Prefers uploaded video over embed. Renders nothing if both are empty.
 */
export default function StepVideoClip({ config, stepLabel }: StepVideoClipProps) {
  const override = config?.teacherOverride as Record<string, unknown> | undefined;
  const rawUpload = typeof override?.videoClipUrl === 'string' ? override.videoClipUrl : '';
  const rawEmbed = typeof override?.videoClipEmbedUrl === 'string' ? override.videoClipEmbedUrl : '';
  const uploadUrl = resolveUploadUrl(rawUpload);
  const embedUrl = rawEmbed.trim();

  const [embedFailed, setEmbedFailed] = useState(false);

  const title = stepLabel ? `${stepLabel} — Video Clip` : 'Video Clip';

  // Prefer uploaded video
  if (uploadUrl) {
    return (
      <div className="mb-4">
        <FrostedGlassPlayer src={uploadUrl} title={title} />
      </div>
    );
  }

  // Fallback to embed URL
  if (embedUrl && !embedFailed) {
    return (
      <div className="mb-4">
        <div className="ios-glass-card-strong overflow-hidden">
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              title={title}
              onError={() => setEmbedFailed(true)}
              allow="autoplay; fullscreen"
            />
          </div>
        </div>
        <a
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-1.5 text-center font-ibm-mono text-[10px] text-white/30 tracking-wider hover:text-neon-cyan/70 transition-colors"
        >
          Open in new tab
        </a>
      </div>
    );
  }

  return null;
}
