import { useAudioStore } from '../../stores/audioStore';
import { useMediaRecorder } from '../../hooks/useMediaRecorder';
import { uploadRecording } from '../../api/recordings';
import WaveformVisualizer from './WaveformVisualizer';

interface RecordingWidgetProps {
  missionId?: string;
  onUploaded?: (recordingId: string) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
}

export default function RecordingWidget({ missionId, onUploaded }: RecordingWidgetProps) {
  const { state, duration, blob, error, setState, reset } = useAudioStore();
  const { startRecording, stopRecording, getAnalyserData } = useMediaRecorder();

  const handleUpload = async () => {
    if (!blob) return;
    setState('uploading');
    try {
      const recording = await uploadRecording(blob, duration, missionId);
      setState('uploaded');
      onUploaded?.(recording.id);
      setTimeout(reset, 2000);
    } catch {
      setState('error');
    }
  };

  return (
    <div className="relative z-10 w-full max-w-md mx-auto">
      <div className="ios-glass-card overflow-hidden">
        {/* Widget header */}
        <div className="bg-ios-bg/60 border-b border-white/10 px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              state === 'recording' ? 'bg-neon-pink animate-pulse' :
              state === 'uploaded' ? 'bg-neon-mint' :
              'bg-neon-cyan'
            }`} />
            <h3 className="font-ibm-mono text-xs text-white/70 uppercase tracking-[0.25em]">
              Voice Compliance Module
            </h3>
          </div>
          <span className="font-ibm-mono text-[10px] text-white/30 tracking-wider">
            VCM-4.7
          </span>
        </div>

        <div className="p-5">
          {/* Waveform */}
          <div className="mb-3">
            <WaveformVisualizer
              getAnalyserData={getAnalyserData}
              isRecording={state === 'recording'}
            />
          </div>

          {/* Timer */}
          <div className="text-center mb-4 py-2 bg-ios-bg/35 border border-white/10 rounded-lg">
            <span className="font-dseg7 text-2xl text-neon-cyan tracking-wider">
              {formatTime(duration)}
            </span>
            {state === 'recording' && (
              <span className="block font-ibm-mono text-[10px] text-neon-pink tracking-[0.3em] mt-1 animate-pulse">
                RECORDING IN PROGRESS
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {state === 'idle' && (
              <button
                onClick={startRecording}
                className="w-14 h-14 border-2 border-neon-cyan/40 hover:border-neon-cyan bg-neon-cyan/5 hover:bg-neon-cyan/10 flex items-center justify-center transition-all hover:scale-105 group"
                style={{ borderRadius: '50%' }}
                title="Begin recording"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-neon-cyan group-hover:text-neon-cyan transition-colors" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>
            )}

            {state === 'recording' && (
              <button
                onClick={stopRecording}
                className="w-14 h-14 bg-neon-pink border-2 border-neon-pink/50 flex items-center justify-center transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,107,149,0.3)]"
                style={{ borderRadius: '50%' }}
              >
                <div className="w-5 h-5 bg-white" />
              </button>
            )}

            {state === 'stopped' && (
              <>
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-full font-ibm-mono text-xs text-white/50 border border-white/10 hover:border-neon-pink/30 hover:text-neon-pink transition-all uppercase tracking-[0.15em]"
                >
                  Discard
                </button>
                <button
                  onClick={handleUpload}
                  className="px-6 py-2.5 rounded-full font-ibm-mono text-xs text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/10 transition-all uppercase tracking-[0.25em]"
                >
                  Submit for Review
                </button>
              </>
            )}

            {state === 'uploading' && (
              <div className="font-ibm-mono text-xs text-neon-cyan animate-pulse tracking-[0.2em]">
                TRANSMITTING TO MINISTRY...
              </div>
            )}

            {state === 'uploaded' && (
              <div className="text-center">
                <div className="font-ibm-mono text-xs text-neon-mint tracking-[0.2em]">
                  SUBMISSION ACCEPTED
                </div>
                <div className="font-ibm-mono text-[10px] text-white/50 mt-1">
                  Thank you for your cooperation, Citizen.
                </div>
              </div>
            )}

            {state === 'requesting' && (
              <div className="font-ibm-mono text-xs text-neon-cyan animate-pulse tracking-[0.2em]">
                REQUESTING DEVICE ACCESS...
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 p-2 rounded-lg border border-neon-pink/20 bg-neon-pink/5">
              <p className="text-center font-ibm-mono text-xs text-neon-pink tracking-wider">
                DEVICE ERROR: {error.toUpperCase()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
