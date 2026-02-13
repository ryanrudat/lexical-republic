import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Mesh, MeshStandardMaterial } from 'three';

interface CRTMonitorProps {
  interactive?: boolean;
  hovered?: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export default function CRTMonitor({
  interactive = false,
  hovered = false,
  onClick,
  onPointerOver,
  onPointerOut,
}: CRTMonitorProps) {
  const screenRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (screenRef.current) {
      const flicker = Math.sin(state.clock.elapsedTime * 30) * 0.02 + 0.98;
      const hoverBoost = hovered ? 1.4 : 1.0;
      const screenMaterial = screenRef.current.material;
      if (!Array.isArray(screenMaterial)) {
        (screenMaterial as MeshStandardMaterial).emissiveIntensity = 0.4 * flicker * hoverBoost;
      }
    }
    if (glowRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 0.3;
      const hoverBoost = hovered ? 1.5 : 1.0;
      const glowMaterial = glowRef.current.material;
      if (!Array.isArray(glowMaterial)) {
        (glowMaterial as MeshStandardMaterial).opacity = pulse * hoverBoost;
      }
    }
  });

  return (
    <group
      position={[0, 0.6, -0.3]}
      onClick={interactive ? onClick : undefined}
      onPointerOver={interactive ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; onPointerOver?.(); } : undefined}
      onPointerOut={interactive ? () => { document.body.style.cursor = 'default'; onPointerOut?.(); } : undefined}
    >
      {/* Monitor body — thin flat panel */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.7, 0.48, 0.05]} />
        <meshStandardMaterial color="#E0E0E0" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Screen bezel */}
      <mesh position={[0, 0.02, 0.026]}>
        <boxGeometry args={[0.62, 0.4, 0.01]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>

      {/* Screen (emissive) */}
      <mesh ref={screenRef} position={[0, 0.02, 0.032]}>
        <planeGeometry args={[0.56, 0.34]} />
        <meshStandardMaterial
          color="#0a1628"
          emissive={hovered ? '#5bb8d4' : '#a8d8ea'}
          emissiveIntensity={0.4}
          roughness={0.1}
        />
      </mesh>

      {/* Screen glow */}
      <mesh ref={glowRef} position={[0, 0.02, 0.035]}>
        <planeGeometry args={[0.64, 0.42]} />
        <meshStandardMaterial
          color={hovered ? '#5bb8d4' : '#a8d8ea'}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* "CLICK TO LOG IN" text when hovered */}
      {interactive && hovered && (
        <Html position={[0, 0.02, 0.04]} transform occlude scale={0.05}>
          <div style={{
            color: '#5bb8d4',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: '14px',
            letterSpacing: '2px',
            textShadow: '0 0 8px rgba(91,184,212,0.5)',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            pointerEvents: 'none',
          }}>
            CLICK TO LOG IN
          </div>
        </Html>
      )}

      {/* Monitor stand — slim neck + wide base, aluminum */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
        <meshStandardMaterial color="#C0C0C0" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, -0.38, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.02, 16]} />
        <meshStandardMaterial color="#C0C0C0" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Power LED — teal */}
      <mesh position={[0.22, -0.17, 0.028]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#5bb8d4" emissive="#5bb8d4" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}
