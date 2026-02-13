import { useRef, useEffect } from 'react';

interface WaveformVisualizerProps {
  getAnalyserData: () => Uint8Array | null;
  isRecording: boolean;
}

export default function WaveformVisualizer({ getAnalyserData, isRecording }: WaveformVisualizerProps) {
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

      if (data && isRecording) {
        // Cyan waveform
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00E5FF';
        ctx.beginPath();

        const sliceWidth = width / data.length;
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

        ctx.lineTo(width, height / 2);
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
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else {
        // Flat line when not recording
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationRef.current);
  }, [getAnalyserData, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={60}
      className="w-full h-[60px] border border-white/10 rounded-lg"
    />
  );
}
