import { useRef, useEffect } from 'react';

interface WaveformVisualizerProps {
  getAnalyserData: () => Uint8Array | null;
  isRecording: boolean;
  /** Optional volume zone for meter display */
  volumeZone?: 'safe' | 'warning' | 'danger';
  /** Optional normalized volume (0-1) for meter bar */
  volumeLevel?: number;
}

const ZONE_COLORS = {
  safe: { bar: '#69F0AE', glow: 'rgba(105, 240, 174, 0.3)' },     // neon-mint
  warning: { bar: '#FFAA00', glow: 'rgba(255, 170, 0, 0.3)' },     // terminal-amber
  danger: { bar: '#FF4081', glow: 'rgba(255, 64, 129, 0.3)' },     // neon-pink
};

export default function WaveformVisualizer({
  getAnalyserData,
  isRecording,
  volumeZone,
  volumeLevel,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Dark navy background matching terminal
      ctx.fillStyle = '#131D35';
      ctx.fillRect(0, 0, width, height);

      const data = getAnalyserData();

      // Reserve right side for volume meter when zone is provided
      const waveWidth = volumeZone ? width - 20 : width;

      if (data && isRecording) {
        // Cyan waveform
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00E5FF';
        ctx.beginPath();

        const sliceWidth = waveWidth / data.length;
        let x = 0;

        for (let i = 0; i < data.length; i++) {
          const v = data[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(waveWidth, height / 2);
        ctx.stroke();

        // Glow effect
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
        ctx.beginPath();
        x = 0;
        for (let i = 0; i < data.length; i++) {
          const v = data[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(waveWidth, height / 2);
        ctx.stroke();
      } else {
        // Flat line when not recording
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(waveWidth, height / 2);
        ctx.stroke();
      }

      // Volume meter bar (right edge)
      if (volumeZone && volumeLevel !== undefined) {
        const meterX = width - 14;
        const meterW = 8;
        const meterH = height - 8;
        const meterY = 4;

        // Background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(meterX, meterY, meterW, meterH);

        // Fill level (bottom-up)
        const level = Math.min(1, Math.max(0, volumeLevel));
        const fillH = meterH * level;
        const colors = ZONE_COLORS[volumeZone];

        ctx.fillStyle = colors.bar;
        ctx.fillRect(meterX, meterY + meterH - fillH, meterW, fillH);

        // Glow
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 4;
        ctx.fillRect(meterX, meterY + meterH - fillH, meterW, fillH);
        ctx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationRef.current);
  }, [getAnalyserData, isRecording, volumeZone, volumeLevel]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={60}
      className="w-full h-[60px] border border-white/10 rounded-lg"
    />
  );
}
