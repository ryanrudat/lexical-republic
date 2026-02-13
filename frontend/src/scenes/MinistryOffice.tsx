import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PointLight } from 'three';
import Desk from './objects/Desk';
import CRTMonitor from './objects/CRTMonitor';
import FilingCabinet from './objects/FilingCabinet';
import DustParticles from './effects/DustParticles';

function FluorescentLight() {
  const lightRef = useRef<PointLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      const t = state.clock.elapsedTime;
      const flicker =
        Math.sin(t * 60) > 0.97
          ? 0.3
          : Math.sin(t * 0.5) * 0.1 + 0.9;
      lightRef.current.intensity = 0.8 * flicker;
    }
  });

  return (
    <>
      <pointLight ref={lightRef} position={[0, 2.5, 0]} intensity={0.8} color="#e8e4d8" distance={8} decay={2} />
      <mesh position={[0, 2.45, 0]}>
        <boxGeometry args={[1.5, 0.04, 0.08]} />
        <meshStandardMaterial color="#f0ead6" emissive="#f0ead6" emissiveIntensity={0.5} />
      </mesh>
    </>
  );
}

function DeskLamp() {
  return (
    <group position={[-0.8, 0.35, 0.2]}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.03, 16]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.2, -0.05]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.4, 8]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.38, -0.1]}>
        <coneGeometry args={[0.1, 0.08, 16, 1, true]} />
        <meshStandardMaterial color="#1a4a1a" roughness={0.6} side={2} />
      </mesh>
      <pointLight position={[0, 0.35, -0.08]} intensity={0.3} color="#ffcc88" distance={3} decay={2} />
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.1} color="#8888aa" />
      <FluorescentLight />
      <DeskLamp />
      <Desk />
      <CRTMonitor />
      <FilingCabinet />

      {/* Floor */}
      <mesh position={[0, -0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color="#2d2d3d" roughness={0.9} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 1.2, -1.5]}>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial color="#1e1e30" roughness={0.95} />
      </mesh>

      {/* Atmospheric dust only — CRT scanlines handled by CSS */}
      <DustParticles />
    </>
  );
}

export default function MinistryOffice() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 1.2, 2.5], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={['#0a0e0a']} />
        <fog attach="fog" args={['#0a0e0a', 4, 10]} />
        <Scene />
      </Canvas>
    </div>
  );
}
