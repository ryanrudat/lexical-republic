import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh, MeshStandardMaterial } from 'three';

/** Giant suspended PEARL — chrome ring frame, cyan screen, pixel smiley, glow halo */
export default function PearlFace() {
  const screenRef = useRef<Mesh | null>(null);
  const haloRef = useRef<Mesh | null>(null);
  const groupRef = useRef<Group | null>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Gentle vertical bob — lowered so visible from player camera
    if (groupRef.current) {
      groupRef.current.position.y = 5.2 + Math.sin(t * 0.5) * 0.05;
    }

    // Pulsing screen emissive
    if (screenRef.current) {
      const pulse = Math.sin(t * 1.5) * 0.15 + 0.85;
      const screenMaterial = screenRef.current.material;
      if (!Array.isArray(screenMaterial)) {
        (screenMaterial as MeshStandardMaterial).emissiveIntensity = pulse;
      }
    }

    // Pulsing halo
    if (haloRef.current) {
      const haloPulse = Math.sin(t * 1.2) * 0.08 + 0.2;
      const haloMaterial = haloRef.current.material;
      if (!Array.isArray(haloMaterial)) {
        (haloMaterial as MeshStandardMaterial).opacity = haloPulse;
      }
    }
  });

  // Pixel smiley: eyes (2x2 grids) and smile (curved arc of blocks)
  const pixelSize = 0.08;
  const pixelDepth = 0.04;
  const pixelColor = '#1A2A3E';

  // Eye positions (2x2 blocks each)
  const leftEye = [
    [-0.35, 0.25], [-0.25, 0.25],
    [-0.35, 0.15], [-0.25, 0.15],
  ];
  const rightEye = [
    [0.25, 0.25], [0.35, 0.25],
    [0.25, 0.15], [0.35, 0.15],
  ];

  // Smile — curved arc of blocks
  const smile = [
    [-0.45, -0.15],
    [-0.35, -0.25],
    [-0.25, -0.32],
    [-0.15, -0.35],
    [-0.05, -0.37],
    [0.05, -0.37],
    [0.15, -0.35],
    [0.25, -0.32],
    [0.35, -0.25],
    [0.45, -0.15],
  ];

  const allPixels = [...leftEye, ...rightEye, ...smile];

  return (
    <group ref={groupRef} position={[0, 5.2, 0]}>
      {/* Chrome ring frame */}
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[1.3, 1.5, 64]} />
        <meshStandardMaterial
          color="#C0C0C0"
          metalness={0.8}
          roughness={0.15}
        />
      </mesh>

      {/* Back ring for depth */}
      <mesh position={[0, 0, -0.08]}>
        <ringGeometry args={[1.3, 1.5, 64]} />
        <meshStandardMaterial
          color="#A0A0A0"
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>

      {/* Chrome ring connecting front to back (cylinder segments) */}
      <mesh position={[0, 0, -0.04]}>
        <cylinderGeometry args={[1.5, 1.5, 0.08, 64, 1, true]} />
        <meshStandardMaterial
          color="#B0B0B0"
          metalness={0.75}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, 0, -0.04]}>
        <cylinderGeometry args={[1.3, 1.3, 0.08, 64, 1, true]} />
        <meshStandardMaterial
          color="#A0A0A0"
          metalness={0.7}
          roughness={0.2}
          side={1}
        />
      </mesh>

      {/* Cyan screen face — brighter emissive for visible glow */}
      <mesh ref={screenRef} position={[0, 0, 0.01]}>
        <circleGeometry args={[1.3, 64]} />
        <meshStandardMaterial
          color="#0A2030"
          emissive="#5BB8D4"
          emissiveIntensity={1.2}
          roughness={0.15}
        />
      </mesh>

      {/* Pixel smiley face */}
      {allPixels.map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.02]}>
          <boxGeometry args={[pixelSize, pixelSize, pixelDepth]} />
          <meshStandardMaterial color={pixelColor} roughness={0.8} />
        </mesh>
      ))}

      {/* Glow halo ring behind frame */}
      <mesh ref={haloRef} position={[0, 0, -0.12]}>
        <ringGeometry args={[1.5, 2.2, 64]} />
        <meshStandardMaterial
          color="#5BB8D4"
          transparent
          opacity={0.2}
          depthWrite={false}
          emissive="#5BB8D4"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Dramatic downward spotlight cone onto the hall */}
      <spotLight
        position={[0, -0.5, 0.5]}
        target-position={[0, -8, 0]}
        angle={Math.PI / 4}
        penumbra={0.8}
        intensity={2.0}
        color="#5BB8D4"
        distance={14}
        decay={2}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
    </group>
  );
}
