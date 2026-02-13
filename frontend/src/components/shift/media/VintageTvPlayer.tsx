import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { Mesh } from 'three';
import * as THREE from 'three';

interface VintageTvPlayerProps {
  src: string;
  title?: string;
}

interface TvSetProps {
  texture: THREE.VideoTexture | null;
}

function TvSet({ texture }: TvSetProps) {
  const tvRef = useRef<Mesh>(null);

  const woodMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#4f3a2c', roughness: 0.85, metalness: 0.08 }),
    []
  );
  const bezelMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2f2d2a', roughness: 0.6, metalness: 0.25 }),
    []
  );

  useEffect(() => {
    return () => {
      woodMaterial.dispose();
      bezelMaterial.dispose();
    };
  }, [woodMaterial, bezelMaterial]);

  return (
    <group position={[0, 0.12, 0]}>
      <mesh ref={tvRef} material={woodMaterial}>
        <boxGeometry args={[4.8, 3.2, 1.8]} />
      </mesh>

      <mesh position={[0, 0.1, 0.92]} material={bezelMaterial}>
        <boxGeometry args={[3.9, 2.35, 0.08]} />
      </mesh>

      <mesh position={[0, 0.1, 0.97]}>
        <planeGeometry args={[3.25, 1.95]} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshBasicMaterial color="#1b2d1f" />
        )}
      </mesh>

      <mesh position={[1.75, 0.1, 0.97]}>
        <planeGeometry args={[0.5, 1.9]} />
        <meshStandardMaterial color="#2f2d2a" roughness={0.6} metalness={0.2} />
      </mesh>

      <mesh position={[1.75, 0.5, 1.02]}>
        <cylinderGeometry args={[0.11, 0.11, 0.08, 24]} />
        <meshStandardMaterial color="#b39a6b" roughness={0.35} metalness={0.55} />
      </mesh>
      <mesh position={[1.75, 0.08, 1.02]}>
        <cylinderGeometry args={[0.11, 0.11, 0.08, 24]} />
        <meshStandardMaterial color="#b39a6b" roughness={0.35} metalness={0.55} />
      </mesh>

      <mesh position={[-1.55, -1.72, 0.38]} rotation={[0.35, 0, 0.2]} material={woodMaterial}>
        <boxGeometry args={[0.35, 0.45, 0.35]} />
      </mesh>
      <mesh position={[1.55, -1.72, 0.38]} rotation={[0.35, 0, -0.2]} material={woodMaterial}>
        <boxGeometry args={[0.35, 0.45, 0.35]} />
      </mesh>
    </group>
  );
}

export default function VintageTvPlayer({ src, title = 'Briefing Monitor' }: VintageTvPlayerProps) {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const video = document.createElement('video');
    video.src = src;
    video.preload = 'metadata';
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.muted = false;

    const handleLoadedMetadata = () => {
      setReady(true);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setLoadError(null);
    };
    const handleTimeUpdate = () => setCurrentTime(video.currentTime || 0);
    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleError = () => {
      setLoadError('Could not load this video source in the TV monitor.');
      setReady(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    setVideoElement(video);
    setVideoTexture(texture);

    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      texture.dispose();
    };
  }, [src]);

  const handlePlayPause = async () => {
    if (!videoElement) return;
    if (videoElement.paused) {
      try {
        await videoElement.play();
      } catch {
        setLoadError('Playback was blocked. Press Play again after interacting with the page.');
      }
    } else {
      videoElement.pause();
    }
  };

  const handleRestart = () => {
    if (!videoElement) return;
    videoElement.currentTime = 0;
    void videoElement.play().catch(() => {
      setLoadError('Playback was blocked. Press Play again after interacting with the page.');
    });
  };

  const timeLabel = `${Math.floor(currentTime).toString().padStart(2, '0')} / ${Math.floor(duration).toString().padStart(2, '0')}s`;

  return (
    <div className="space-y-3">
      <div className="border border-terminal-border rounded-lg overflow-hidden bg-[#0f120f]">
        <div className="h-[320px] w-full">
          <Canvas camera={{ position: [0, 0.2, 6.1], fov: 34 }} dpr={[1, 1.5]}>
            <color attach="background" args={['#111512']} />
            <ambientLight intensity={0.55} color="#e4dcc9" />
            <directionalLight position={[2, 4, 3]} intensity={1.05} color="#fff1cf" />
            <pointLight position={[-2, 1.2, 2]} intensity={0.35} color="#9ec39b" />
            <TvSet texture={videoTexture} />
          </Canvas>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handlePlayPause}
          disabled={!ready}
          className="px-3 py-2 border border-terminal-green/40 text-terminal-green font-ibm-mono text-[11px] tracking-[0.2em] uppercase hover:bg-terminal-green/10 transition-colors disabled:opacity-40"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={handleRestart}
          disabled={!ready}
          className="px-3 py-2 border border-terminal-amber/40 text-terminal-amber font-ibm-mono text-[11px] tracking-[0.2em] uppercase hover:bg-terminal-amber/10 transition-colors disabled:opacity-40"
        >
          Restart
        </button>
        <span className="font-ibm-mono text-[11px] text-terminal-green-dim tracking-wider">
          {ready ? `${title} • ${timeLabel}` : 'Loading monitor feed...'}
        </span>
      </div>

      {loadError && (
        <p className="font-ibm-mono text-[11px] text-terminal-amber tracking-wider">
          {loadError}
        </p>
      )}
    </div>
  );
}
