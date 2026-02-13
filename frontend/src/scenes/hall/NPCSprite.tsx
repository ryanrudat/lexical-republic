import { Billboard } from '@react-three/drei';

interface NPCSpriteProps {
  position: [number, number, number];
}

/** 2D billboard silhouette — circle head + rectangle torso, placeholder NPC */
export default function NPCSprite({ position }: NPCSpriteProps) {
  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      {/* Head */}
      <mesh position={[0, 0.35, 0]}>
        <circleGeometry args={[0.12, 16]} />
        <meshBasicMaterial color="#8899AA" transparent opacity={0.6} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 0.08, 0]}>
        <planeGeometry args={[0.2, 0.4]} />
        <meshBasicMaterial color="#8899AA" transparent opacity={0.6} />
      </mesh>

      {/* Shoulders taper */}
      <mesh position={[0, 0.24, 0]}>
        <planeGeometry args={[0.28, 0.08]} />
        <meshBasicMaterial color="#8899AA" transparent opacity={0.5} />
      </mesh>
    </Billboard>
  );
}
