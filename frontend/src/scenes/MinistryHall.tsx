import { Suspense, useState } from 'react';
import { Environment } from '@react-three/drei';
import { useViewStore } from '../stores/viewStore';
import { useCameraTransition } from '../hooks/useCameraTransition';
import DomeStructure from './hall/DomeStructure';
import PlayerDesk from './hall/PlayerDesk';
import BackWallScreen from './hall/BackWallScreen';
import HallDustParticles from './hall/HallDustParticles';
import HallPostProcessing from './effects/HallPostProcessing';

export default function MinistryHall() {
  const enterTerminal = useViewStore((s) => s.enterTerminal);
  const [hoveredObject, setHoveredObject] = useState<string | null>(null);

  // Camera zoom animation during transitions
  useCameraTransition();

  const handleMonitorClick = () => {
    enterTerminal('desktop');
  };

  return (
    <>
      {/* Environment map — soft industrial reflections for chrome surfaces */}
      <Suspense fallback={null}>
        <Environment preset="warehouse" environmentIntensity={0.3} background={false} />
      </Suspense>

      {/* Ambient fill */}
      <ambientLight intensity={0.3} color="#F0F0FF" />

      {/* Sky/ground ambient gradient */}
      <hemisphereLight args={['#F0F2F8', '#DDD6C8', 0.5]} />

      {/* === Room Shell === */}
      <DomeStructure />

      {/* === Player Station === */}
      <PlayerDesk
        hovered={hoveredObject === 'monitor'}
        onClick={handleMonitorClick}
        onPointerOver={() => setHoveredObject('monitor')}
        onPointerOut={() => setHoveredObject(null)}
      />

      {/* === Back Wall Video Screen === */}
      <BackWallScreen />

      {/* === Atmosphere === */}
      <HallDustParticles />

      {/* Post-processing: AO + Bloom + Vignette */}
      <HallPostProcessing />
    </>
  );
}
