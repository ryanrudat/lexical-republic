import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshStandardMaterial } from 'three';
import NPCSprite from './NPCSprite';

interface WorkerRingProps {
  radius: number;
  deskCount: number;
  /** Angles (in radians) near the player's forward view to skip — clears sightlines to doors */
  skipAngles?: number[];
  skipTolerance?: number;
}

/** Ring of curved desks with small retro terminals and NPC silhouettes */
export default function WorkerRing({ radius, deskCount, skipAngles = [], skipTolerance = 0.35 }: WorkerRingProps) {
  const screenRefs = useRef<(Mesh | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    screenRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const flicker = Math.sin((t + i * 0.7) * 15) * 0.03 + 0.97;
      const material = mesh.material;
      if (!Array.isArray(material)) {
        (material as MeshStandardMaterial).emissiveIntensity = 0.4 * flicker;
      }
    });
  });

  const desks: { angle: number; x: number; z: number }[] = [];
  for (let i = 0; i < deskCount; i++) {
    const angle = (i / deskCount) * Math.PI * 2;

    // Skip desks near the player's forward view to keep sightlines clear
    const shouldSkip = skipAngles.some(
      (sa) => Math.abs(((angle - sa + Math.PI) % (Math.PI * 2)) - Math.PI) < skipTolerance,
    );
    if (shouldSkip) continue;

    desks.push({
      angle,
      x: Math.sin(angle) * radius,
      z: -Math.cos(angle) * radius,
    });
  }

  return (
    <>
      {desks.map((desk, i) => (
        <group key={i} position={[desk.x, 0, desk.z]} rotation={[0, desk.angle, 0]}>
          {/* Desk surface */}
          <mesh position={[0, 0.65, 0]} castShadow>
            <boxGeometry args={[0.9, 0.04, 0.5]} />
            <meshStandardMaterial color="#E0D8CC" roughness={0.6} />
          </mesh>

          {/* Desk legs */}
          {[[-0.38, 0.325, -0.18], [0.38, 0.325, -0.18], [-0.38, 0.325, 0.18], [0.38, 0.325, 0.18]].map((p, j) => (
            <mesh key={j} position={[p[0], p[1], p[2]]}>
              <boxGeometry args={[0.03, 0.65, 0.03]} />
              <meshStandardMaterial color="#B0B0B0" metalness={0.4} roughness={0.4} />
            </mesh>
          ))}

          {/* Small retro terminal */}
          <group position={[0, 0.82, -0.05]}>
            {/* Terminal body */}
            <mesh castShadow>
              <boxGeometry args={[0.3, 0.22, 0.18]} />
              <meshStandardMaterial color="#D8D8D8" roughness={0.5} />
            </mesh>
            {/* Screen */}
            <mesh
              ref={(el) => { screenRefs.current[i] = el; }}
              position={[0, 0.02, 0.091]}
            >
              <planeGeometry args={[0.22, 0.14]} />
              <meshStandardMaterial
                color="#0a2832"
                emissive="#5BB8D4"
                emissiveIntensity={0.4}
                roughness={0.1}
              />
            </mesh>
          </group>

          {/* NPC silhouette behind desk */}
          <NPCSprite position={[0, 0.7, 0.4]} />
        </group>
      ))}
    </>
  );
}
