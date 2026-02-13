import { Html } from '@react-three/drei';

interface PropagandaPosterProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

/** Large propaganda poster — white frame with chrome border, Special Elite text */
export default function PropagandaPoster({ position, rotation = [0, 0, 0] }: PropagandaPosterProps) {
  return (
    <group position={position} rotation={rotation}>
      {/* Poster backing */}
      <mesh>
        <planeGeometry args={[2.2, 1.4]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.9} />
      </mesh>

      {/* Chrome frame border */}
      {/* Top */}
      <mesh position={[0, 0.72, 0.005]}>
        <boxGeometry args={[2.24, 0.04, 0.02]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.6} roughness={0.25} />
      </mesh>
      {/* Bottom */}
      <mesh position={[0, -0.72, 0.005]}>
        <boxGeometry args={[2.24, 0.04, 0.02]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.6} roughness={0.25} />
      </mesh>
      {/* Left */}
      <mesh position={[-1.12, 0, 0.005]}>
        <boxGeometry args={[0.04, 1.44, 0.02]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.6} roughness={0.25} />
      </mesh>
      {/* Right */}
      <mesh position={[1.12, 0, 0.005]}>
        <boxGeometry args={[0.04, 1.44, 0.02]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.6} roughness={0.25} />
      </mesh>

      {/* Text content via Html overlay */}
      <Html position={[0, 0, 0.02]} transform scale={0.12}>
        <div style={{
          width: '340px',
          textAlign: 'center',
          userSelect: 'none',
          pointerEvents: 'none',
        }}>
          <p style={{
            fontFamily: '"Special Elite", cursive',
            fontSize: '22px',
            color: '#1a1a2e',
            lineHeight: '1.5',
            letterSpacing: '3px',
            margin: 0,
          }}>
            SIMPLE WORDS,
            <br />
            SIMPLE THOUGHTS,
            <br />
            SIMPLE HAPPINESS.
          </p>
          <div style={{
            width: '60px',
            height: '2px',
            background: '#E05B67',
            margin: '12px auto 8px',
          }} />
          <p style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: '9px',
            color: '#8899AA',
            letterSpacing: '2px',
            margin: 0,
          }}>
            MINISTRY APPROVED
          </p>
        </div>
      </Html>
    </group>
  );
}
