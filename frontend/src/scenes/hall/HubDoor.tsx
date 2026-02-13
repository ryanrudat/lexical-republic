import { useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Mesh, MeshStandardMaterial } from 'three';
import { usePearlStore } from '../../stores/pearlStore';

interface HubDoorProps {
  position: [number, number, number];
  rotation: [number, number, number];
  label: string;
}

/** Labeled perimeter doorway — recessed dark void + chrome U-frame + lock indicator */
export default function HubDoor({ position, rotation, label }: HubDoorProps) {
  const lockRef = useRef<Mesh>(null);
  const hoverRef = useRef(false);
  const triggerBark = usePearlStore((s) => s.triggerBark);

  useFrame((state) => {
    if (!lockRef.current) return;
    const t = state.clock.elapsedTime;
    const base = 0.8;
    const pulse = hoverRef.current ? Math.sin(t * 4) * 0.4 + 1.2 : base;
    const material = lockRef.current.material;
    if (!Array.isArray(material)) {
      (material as MeshStandardMaterial).emissiveIntensity = pulse;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    triggerBark('concern', `ACCESS RESTRICTED. ${label} clearance not yet granted. Report to your supervisor.`);
  };

  return (
    <group position={position} rotation={rotation}>
      {/* Dark recessed void */}
      <mesh position={[0, 1.5, -0.15]}>
        <boxGeometry args={[1.6, 3, 0.3]} />
        <meshStandardMaterial color="#2A2A3E" roughness={0.95} />
      </mesh>

      {/* Chrome frame — left pillar */}
      <mesh position={[-0.85, 1.5, 0]}>
        <boxGeometry args={[0.1, 3.2, 0.12]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.6} roughness={0.25} />
      </mesh>

      {/* Chrome frame — right pillar */}
      <mesh position={[0.85, 1.5, 0]}>
        <boxGeometry args={[0.1, 3.2, 0.12]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.6} roughness={0.25} />
      </mesh>

      {/* Chrome frame — header */}
      <mesh position={[0, 3.15, 0]}>
        <boxGeometry args={[1.8, 0.12, 0.12]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.6} roughness={0.25} />
      </mesh>

      {/* Label sign above door */}
      <Html position={[0, 3.5, 0.05]} transform scale={0.08}>
        <div style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '13px',
          color: '#2A2A3E',
          letterSpacing: '3px',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          pointerEvents: 'none',
          textAlign: 'center',
          background: 'rgba(248,249,252,0.9)',
          padding: '4px 12px',
          borderRadius: '2px',
        }}>
          {label}
        </div>
      </Html>

      {/* Red lock indicator light */}
      <mesh
        ref={lockRef}
        position={[0.65, 1.2, 0.06]}
      >
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial
          color="#E05B67"
          emissive="#E05B67"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Warm glow leaking from behind the door */}
      <pointLight
        position={[0, 1.5, -0.3]}
        intensity={0.3}
        color="#FFE4C4"
        distance={4}
        decay={2}
      />

      {/* Invisible click target covering the doorway */}
      <mesh
        position={[0, 1.5, 0.05]}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); hoverRef.current = true; document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { hoverRef.current = false; document.body.style.cursor = 'default'; }}
      >
        <planeGeometry args={[1.6, 3]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}
