import { useState } from 'react';
import { markWelcomeWatched } from '../../api/dictionary';
import { resolveUploadUrl } from '../../api/client';
import MonitorPlayer from '../shared/MonitorPlayer';

interface Props {
  designation?: string | null;
  onComplete: () => void;
}

export default function WelcomeVideoModal({ designation, onComplete }: Props) {
  const [videoEnded, setVideoEnded] = useState(false);
  const [proceeding, setProceeding] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  const isTestUser = designation?.toUpperCase() === 'CA-1';

  // Use static file path — served by express.static('/uploads'), no auth needed
  const videoUrl = resolveUploadUrl('/uploads/welcome/welcome-video.mp4');

  const handleReplay = () => {
    setVideoEnded(false);
    setReplayKey(k => k + 1);
  };

  const handleProceed = async () => {
    if (proceeding) return;
    setProceeding(true);
    try {
      await markWelcomeWatched();
      onComplete();
    } catch {
      // If API fails, still let them through
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#0c0c0c]">
      <div className="relative w-full max-w-5xl px-4">
        <MonitorPlayer
          key={replayKey}
          src={videoUrl}
          autoPlay
          onEnded={() => setVideoEnded(true)}
          screenOverlay={
            <>
              {/* Proceed + Replay buttons — overlaid at bottom of screen after video ends */}
              {videoEnded && (
                <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
                  <button
                    onClick={handleReplay}
                    className="font-ibm-mono text-[10px] sm:text-xs tracking-[0.2em] uppercase px-4 py-2 sm:px-6 sm:py-3 border rounded transition-all active:scale-95"
                    style={{
                      borderColor: '#5a8a6a',
                      color: '#5a8a6a',
                      background: 'rgba(0, 40, 0, 0.4)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    WATCH AGAIN
                  </button>
                  <button
                    onClick={handleProceed}
                    disabled={proceeding}
                    className="font-ibm-mono text-[10px] sm:text-xs tracking-[0.2em] uppercase px-6 py-2 sm:px-8 sm:py-3 border rounded transition-all active:scale-95"
                    style={{
                      borderColor: '#00cc6a',
                      color: proceeding ? '#5a8a6a' : '#00ff88',
                      background: 'rgba(0, 40, 0, 0.6)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {proceeding ? 'PROCESSING...' : 'PROCEED TO YOUR STATION'}
                  </button>
                </div>
              )}

              {/* CA-1 test bypass */}
              {isTestUser && !videoEnded && (
                <button
                  onClick={handleProceed}
                  className="absolute bottom-[8%] left-1/2 -translate-x-1/2 z-20 font-ibm-mono text-[10px] tracking-wider uppercase px-3 py-1 border rounded"
                  style={{ borderColor: '#1a3d1a', color: '#5a8a6a', background: 'rgba(0, 20, 0, 0.5)' }}
                >
                  SKIP (TEST)
                </button>
              )}
            </>
          }
        />
      </div>
    </div>
  );
}
