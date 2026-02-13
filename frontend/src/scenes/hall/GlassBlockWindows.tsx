import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshStandardMaterial, PointLight } from 'three';

interface GlassBlockWindowProps {
  position: [number, number, number];
  rotation: [number, number, number];
}

/** Single glass block panel — 4x3 grid of translucent blocks + horizontal LED strip */
function GlassBlockWindow({ position, rotation }: GlassBlockWindowProps) {
  const ledRef = useRef<Mesh | null>(null);
  const lightRef = useRef<PointLight | null>(null);
  const offsetSeed = position[0] * 0.37 + position[2] * 0.19 + rotation[1] * 0.11;
  const normalizedSeed = offsetSeed - Math.floor(offsetSeed);
  const offsetRef = useRef(normalizedSeed * Math.PI * 2);

  useFrame((state) => {
    const t = state.clock.elapsedTime + offsetRef.current;
    const intensity = Math.sin(t * 0.8) * 0.3 + 0.7;
    if (ledRef.current) {
      const material = ledRef.current.material;
      if (!Array.isArray(material)) {
        (material as MeshStandardMaterial).emissiveIntensity = intensity;
      }
    }
    if (lightRef.current) {
      lightRef.current.intensity = 0.3 * intensity;
    }
  });

  const cols = 4;
  const rows = 3;
  const blockSize = 0.35;
  const gap = 0.04;

  return (
    <group position={position} rotation={rotation}>
      {/* Glass block grid */}
      {Array.from({ length: cols * rows }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = (col - (cols - 1) / 2) * (blockSize + gap);
        const y = (row - (rows - 1) / 2) * (blockSize + gap);
        return (
          <mesh key={i} position={[x, y, 0]}>
            <boxGeometry args={[blockSize, blockSize, 0.15]} />
            <meshStandardMaterial
              color="#E0F0F8"
              transparent
              opacity={0.4}
              roughness={0.2}
              metalness={0.1}
            />
          </mesh>
        );
      })}

      {/* Horizontal LED strip below blocks */}
      <mesh ref={ledRef} position={[0, -(rows / 2) * (blockSize + gap) - 0.1, 0.05]}>
        <boxGeometry args={[cols * (blockSize + gap), 0.04, 0.02]} />
        <meshStandardMaterial
          color="#00E5FF"
          emissive="#00E5FF"
          emissiveIntensity={0.7}
        />
      </mesh>

      {/* Cyan wash point light */}
      <pointLight
        ref={lightRef}
        position={[0, 0, 0.5]}
        intensity={0.3}
        color="#00E5FF"
        distance={5}
        decay={2}
      />
    </group>
  );
}

/** 6 glass block window panels placed between hub doors around the perimeter */
export default function GlassBlockWindows() {
  // 6 windows evenly placed between 7 doors
  // Doors are at angles: 0.5π/7 * (2i+1) relative to back of room
  // Windows go at angles midway between door pairs
  const windowAngles = [
    Math.PI * 0.65,
    Math.PI * 0.79,
    Math.PI * 0.93,
    Math.PI * 1.07,
    Math.PI * 1.21,
    Math.PI * 1.35,
  ];

  const wallRadius = 11.85;

  return (
    <>
      {windowAngles.map((angle, i) => {
        const x = Math.sin(angle) * wallRadius;
        const z = -Math.cos(angle) * wallRadius;
        const rotY = angle;
        return (
          <GlassBlockWindow
            key={i}
            position={[x, 2.5, z]}
            rotation={[0, rotY, 0]}
          />
        );
      })}
    </>
  );
}
