import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Mesh, MeshStandardMaterial } from 'three';

interface PlayerDeskProps {
  hovered: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}

/** Player's central workstation — light oak desk + interactive flat-panel monitor + desk lamp */
export default function PlayerDesk({ hovered, onClick, onPointerOver, onPointerOut }: PlayerDeskProps) {
  const screenRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (screenRef.current) {
      const flicker = Math.sin(t * 30) * 0.02 + 0.98;
      const boost = hovered ? 1.3 : 1.0;
      const screenMaterial = screenRef.current.material;
      if (!Array.isArray(screenMaterial)) {
        (screenMaterial as MeshStandardMaterial).emissiveIntensity = 1.5 * flicker * boost;
      }
    }
    if (glowRef.current) {
      const pulse = Math.sin(t * 2) * 0.1 + 0.35;
      const boost = hovered ? 1.5 : 1.0;
      const glowMaterial = glowRef.current.material;
      if (!Array.isArray(glowMaterial)) {
        (glowMaterial as MeshStandardMaterial).opacity = pulse * boost;
      }
    }
  });

  return (
    <group position={[0, 0, -0.6]}>
      {/* === Desk Surface — rich oak with slight sheen === */}
      <mesh position={[0, 0.72, -0.4]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.06, 0.9]} />
        <meshStandardMaterial color="#C4B08A" roughness={0.35} metalness={0.02} />
      </mesh>

      {/* Desk front panel — adds visual weight */}
      <mesh position={[0, 0.55, 0.04]} castShadow>
        <boxGeometry args={[1.6, 0.34, 0.03]} />
        <meshStandardMaterial color="#B8A478" roughness={0.4} />
      </mesh>

      {/* Desk legs — chrome with higher metalness */}
      {[[-0.7, 0.35, -0.1], [0.7, 0.35, -0.1], [-0.7, 0.35, -0.75], [0.7, 0.35, -0.75]].map((pos, i) => (
        <mesh key={i} position={[pos[0], pos[1], pos[2]]} castShadow>
          <boxGeometry args={[0.05, 0.7, 0.05]} />
          <meshStandardMaterial color="#C8C8C8" metalness={0.7} roughness={0.2} />
        </mesh>
      ))}

      {/* Art Deco trim strip along front edge */}
      <mesh position={[0, 0.75, 0.05]}>
        <boxGeometry args={[1.6, 0.025, 0.01]} />
        <meshStandardMaterial color="#D0C0A0" metalness={0.8} roughness={0.15} />
      </mesh>

      {/* === Monitor — interactive, larger for hero presence === */}
      <group
        position={[0, 1.05, -0.55]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; onPointerOver(); }}
        onPointerOut={() => { document.body.style.cursor = 'default'; onPointerOut(); }}
      >
        {/* Monitor body — sleeker */}
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.55, 0.04]} />
          <meshStandardMaterial color="#E8E8E8" roughness={0.35} metalness={0.3} />
        </mesh>

        {/* Screen bezel */}
        <mesh position={[0, 0.02, 0.021]}>
          <boxGeometry args={[0.72, 0.46, 0.008]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.95} />
        </mesh>

        {/* Screen — bright emissive for hero glow */}
        <mesh ref={screenRef} position={[0, 0.02, 0.026]}>
          <planeGeometry args={[0.66, 0.40]} />
          <meshStandardMaterial
            color="#061018"
            emissive={hovered ? '#6CCAE8' : '#A8D8EA'}
            emissiveIntensity={1.5}
            roughness={0.02}
          />
        </mesh>

        {/* Screen glow halo */}
        <mesh ref={glowRef} position={[0, 0.02, 0.03]}>
          <planeGeometry args={[0.9, 0.65]} />
          <meshStandardMaterial
            color={hovered ? '#6CCAE8' : '#A8D8EA'}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>

        {/* "BEGIN SHIFT" overlay */}
        {hovered && (
          <Html position={[0, 0.02, 0.035]} transform occlude scale={0.05}>
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
              BEGIN SHIFT
            </div>
          </Html>
        )}

        {/* Monitor stand — taller for bigger screen */}
        <mesh position={[0, -0.34, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.14, 8]} />
          <meshStandardMaterial color="#C8C8C8" roughness={0.25} metalness={0.6} />
        </mesh>
        <mesh position={[0, -0.41, 0]}>
          <cylinderGeometry args={[0.14, 0.17, 0.025, 16]} />
          <meshStandardMaterial color="#C8C8C8" roughness={0.25} metalness={0.6} />
        </mesh>

        {/* Power LED */}
        <mesh position={[0.26, -0.2, 0.023]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color="#5bb8d4" emissive="#5bb8d4" emissiveIntensity={3} />
        </mesh>

        {/* Screen light cast — visible cyan pool on desk surface */}
        <pointLight
          position={[0, -0.15, 0.3]}
          intensity={0.8}
          color="#A8D8EA"
          distance={2.0}
          decay={2}
        />
      </group>

      {/* === Desk Lamp — warmer, more prominent === */}
      <group position={[-0.6, 0.74, -0.3]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.07, 0.09, 0.025, 16]} />
          <meshStandardMaterial color="#C8C8C8" metalness={0.6} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.17, -0.04]} rotation={[0.3, 0, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.35, 8]} />
          <meshStandardMaterial color="#C8C8C8" metalness={0.6} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.32, -0.07]} castShadow>
          <coneGeometry args={[0.1, 0.08, 16, 1, true]} />
          <meshStandardMaterial color="#F0EDE8" roughness={0.6} side={2} />
        </mesh>
        {/* Warm lamp bulb glow */}
        <mesh position={[0, 0.26, -0.06]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial
            color="#FFE8C0"
            emissive="#FFE0B0"
            emissiveIntensity={2.0}
          />
        </mesh>
        <spotLight
          position={[0, 0.30, -0.06]}
          target-position={[0, -0.5, -0.05]}
          angle={Math.PI / 3}
          penumbra={0.7}
          intensity={1.5}
          color="#FFF0E0"
          distance={4}
          decay={2}
        />
      </group>

      {/* === Small items on desk for detail === */}
      {/* Coffee mug */}
      <mesh position={[0.5, 0.80, -0.25]} castShadow>
        <cylinderGeometry args={[0.035, 0.03, 0.07, 12]} />
        <meshStandardMaterial color="#E8E0D8" roughness={0.7} />
      </mesh>
      {/* Pen */}
      <mesh position={[0.3, 0.76, -0.2]} rotation={[0, 0.4, Math.PI / 2]}>
        <cylinderGeometry args={[0.005, 0.005, 0.15, 6]} />
        <meshStandardMaterial color="#2A2A3E" roughness={0.5} />
      </mesh>
    </group>
  );
}
