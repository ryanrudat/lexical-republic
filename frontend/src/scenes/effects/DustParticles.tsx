import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, BufferGeometry, Float32BufferAttribute } from 'three';

const PARTICLE_COUNT = 60;

function deterministicNoise(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export default function DustParticles() {
  const pointsRef = useRef<Points>(null);
  const resetCounterRef = useRef(0);

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const baseSeed = i + 1;
      positions[i * 3] = (deterministicNoise(baseSeed * 3 + 1) - 0.5) * 6;
      positions[i * 3 + 1] = deterministicNoise(baseSeed * 3 + 2) * 3 - 0.5;
      positions[i * 3 + 2] = (deterministicNoise(baseSeed * 3 + 3) - 0.5) * 4;

      velocities[i * 3] = (deterministicNoise(baseSeed * 7 + 1) - 0.5) * 0.002;
      velocities[i * 3 + 1] = deterministicNoise(baseSeed * 7 + 2) * 0.001 + 0.0005;
      velocities[i * 3 + 2] = (deterministicNoise(baseSeed * 7 + 3) - 0.5) * 0.002;
    }

    return { positions, velocities };
  }, []);

  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3] += velocities[i * 3];
      arr[i * 3 + 1] += velocities[i * 3 + 1];
      arr[i * 3 + 2] += velocities[i * 3 + 2];

      // Wrap around
      if (arr[i * 3 + 1] > 3) {
        const seed = PARTICLE_COUNT * 100 + i * 17 + resetCounterRef.current;
        resetCounterRef.current += 1;
        arr[i * 3 + 1] = -0.5;
        arr[i * 3] = (deterministicNoise(seed + 1) - 0.5) * 6;
        arr[i * 3 + 2] = (deterministicNoise(seed + 2) - 0.5) * 4;
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color="#e0e0e0"
        size={0.015}
        transparent
        opacity={0.15}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
