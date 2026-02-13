import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { PointLight } from 'three';

/** Dome ceiling + cylindrical walls + warm stone floor + recessed lights */
export default function DomeStructure() {
  const lightsRef = useRef<PointLight[]>([]);

  // Subtle fluorescent flicker on dome lights
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    lightsRef.current.forEach((light, i) => {
      if (!light) return;
      const offset = i * 1.1;
      light.intensity = 1.2 + Math.sin((t + offset) * 0.5) * 0.05;
    });
  });

  // 6 dome lights evenly spaced at radius 5, y=8
  const domeLights = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2;
    return [Math.cos(angle) * 5, 8, Math.sin(angle) * 5] as const;
  });

  return (
    <>
      {/* Dome ceiling — hemisphere, BackSide rendering */}
      <mesh position={[0, 4, 0]}>
        <sphereGeometry args={[13, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#EAECF0" roughness={0.9} side={1} />
      </mesh>

      {/* Cylindrical walls — warm tint distinct from cool ceiling */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[12, 12, 6, 64, 1, true]} />
        <meshStandardMaterial color="#DDD8D0" roughness={0.8} metalness={0.02} side={1} />
      </mesh>

      {/* Floor — polished warm stone, darker than walls, slightly reflective */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[12, 64]} />
        <meshStandardMaterial color="#A89880" roughness={0.55} metalness={0.05} />
      </mesh>

      {/* LED accent strip along dome base — emissive ring where walls meet ceiling */}
      <mesh position={[0, 5.98, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[11.8, 12.05, 64]} />
        <meshStandardMaterial
          color="#A8D8EA"
          emissive="#A8D8EA"
          emissiveIntensity={1.0}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Recessed dome point lights — warm white, brighter for more definition */}
      {domeLights.map((pos, i) => (
        <pointLight
          key={i}
          ref={(el) => { if (el) lightsRef.current[i] = el; }}
          position={[pos[0], pos[1], pos[2]]}
          intensity={1.2}
          color="#FFF8F0"
          distance={25}
          decay={2}
        />
      ))}

      {/* Central overhead shadow-casting directional light */}
      <directionalLight
        position={[3, 12, 4]}
        intensity={1.5}
        color="#FFFAF0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={0.5}
        shadow-camera-far={25}
        shadow-bias={-0.001}
      />
    </>
  );
}
