import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, BufferGeometry, Float32BufferAttribute } from 'three';

const PARTICLE_COUNT = 150;

function deterministicNoise(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

/** Scaled-up ambient dust particles for the large Ministry Hall space */
export default function HallDustParticles() {
  const pointsRef = useRef<Points>(null);
  const resetCounterRef = useRef(0);

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Spread across the hall (radius ~12, height ~10)
      const baseSeed = i + 1;
      const angle = deterministicNoise(baseSeed * 5 + 1) * Math.PI * 2;
      const r = deterministicNoise(baseSeed * 5 + 2) * 10;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = deterministicNoise(baseSeed * 5 + 3) * 8 + 0.5;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      velocities[i * 3] = (deterministicNoise(baseSeed * 11 + 1) - 0.5) * 0.003;
      velocities[i * 3 + 1] = deterministicNoise(baseSeed * 11 + 2) * 0.001 + 0.0003;
      velocities[i * 3 + 2] = (deterministicNoise(baseSeed * 11 + 3) - 0.5) * 0.003;
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

      // Wrap around — reset when above dome height
      if (arr[i * 3 + 1] > 9) {
        const seed = PARTICLE_COUNT * 100 + i * 17 + resetCounterRef.current;
        resetCounterRef.current += 1;
        const angle = deterministicNoise(seed + 1) * Math.PI * 2;
        const r = deterministicNoise(seed + 2) * 10;
        arr[i * 3] = Math.cos(angle) * r;
        arr[i * 3 + 1] = 0.5;
        arr[i * 3 + 2] = Math.sin(angle) * r;
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color="#D0D0D0"
        size={0.025}
        transparent
        opacity={0.12}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
