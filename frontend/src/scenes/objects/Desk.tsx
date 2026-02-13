import { useRef } from 'react';
import { Mesh } from 'three';

export default function Desk() {
  const meshRef = useRef<Mesh>(null);

  return (
    <group position={[0, -0.5, 0]}>
      {/* Desktop surface — light oak */}
      <mesh ref={meshRef} position={[0, 0.75, 0]}>
        <boxGeometry args={[2.4, 0.08, 1.2]} />
        <meshStandardMaterial color="#E8E0D4" roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Left legs — brushed steel */}
      <mesh position={[-1.05, 0.35, 0.45]}>
        <boxGeometry args={[0.08, 0.7, 0.08]} />
        <meshStandardMaterial color="#C0C0C0" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[-1.05, 0.35, -0.45]}>
        <boxGeometry args={[0.08, 0.7, 0.08]} />
        <meshStandardMaterial color="#C0C0C0" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Right legs */}
      <mesh position={[1.05, 0.35, 0.45]}>
        <boxGeometry args={[0.08, 0.7, 0.08]} />
        <meshStandardMaterial color="#C0C0C0" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[1.05, 0.35, -0.45]}>
        <boxGeometry args={[0.08, 0.7, 0.08]} />
        <meshStandardMaterial color="#C0C0C0" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Center panel */}
      <mesh position={[0, 0.45, -0.55]}>
        <boxGeometry args={[2.2, 0.55, 0.04]} />
        <meshStandardMaterial color="#D0C8BC" roughness={0.6} />
      </mesh>

      {/* Drawer */}
      <mesh position={[0.7, 0.55, 0.01]}>
        <boxGeometry args={[0.6, 0.15, 0.04]} />
        <meshStandardMaterial color="#E8E0D4" roughness={0.5} />
      </mesh>
      {/* Drawer handle — chrome */}
      <mesh position={[0.7, 0.55, 0.04]}>
        <boxGeometry args={[0.12, 0.03, 0.02]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}
