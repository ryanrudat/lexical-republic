import { useEffect, useState } from 'react';
import { VideoTexture, SRGBColorSpace, LinearFilter } from 'three';

/** Large propaganda video screen mounted on the back wall of the dome */
export default function BackWallScreen() {
  const [videoTexture, setVideoTexture] = useState<VideoTexture | null>(null);

  useEffect(() => {
    const video = document.createElement('video');
    video.src = '/video/office-backdrop.mp4';
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {
      const resume = () => { video.play(); document.removeEventListener('click', resume); };
      document.addEventListener('click', resume);
    });

    const tex = new VideoTexture(video);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    setVideoTexture(tex);

    return () => {
      video.pause();
      video.src = '';
      tex.dispose();
    };
  }, []);

  return (
    <group position={[0, 4.5, -11.5]}>
      {/* Screen frame — dark bezel */}
      <mesh>
        <boxGeometry args={[6.5, 3.8, 0.12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.3} />
      </mesh>

      {/* Screen surface — faces +Z (toward camera) */}
      <mesh position={[0, 0, 0.065]}>
        <planeGeometry args={[6.0, 3.4]} />
        {videoTexture ? (
          <meshBasicMaterial map={videoTexture} toneMapped={false} />
        ) : (
          <meshStandardMaterial
            color="#080818"
            emissive="#A8D8EA"
            emissiveIntensity={0.3}
          />
        )}
      </mesh>

      {/* Soft light cast from screen onto room */}
      <pointLight
        position={[0, 0, 0.5]}
        intensity={0.6}
        color="#B8D8E8"
        distance={8}
        decay={2}
      />
    </group>
  );
}
