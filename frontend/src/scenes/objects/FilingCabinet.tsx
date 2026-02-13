interface FilingCabinetProps {
  interactive?: boolean;
  hovered?: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export default function FilingCabinet({
  interactive = false,
  hovered = false,
  onClick,
  onPointerOver,
  onPointerOut,
}: FilingCabinetProps) {
  const bodyColor = hovered ? '#E0E4E8' : '#D0D4D8';
  const handleColor = hovered ? '#C8C8C8' : '#B0B0B0';

  return (
    <group
      position={[2, -0.1, -0.5]}
      onClick={interactive ? onClick : undefined}
      onPointerOver={interactive ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; onPointerOver?.(); } : undefined}
      onPointerOut={interactive ? () => { document.body.style.cursor = 'default'; onPointerOut?.(); } : undefined}
    >
      {/* Cabinet body */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.6, 1.6, 0.5]} />
        <meshStandardMaterial color={bodyColor} roughness={0.85} metalness={0.15} />
      </mesh>

      {/* Drawer 1 (top) */}
      <mesh position={[0, 1.15, 0.255]}>
        <boxGeometry args={[0.54, 0.32, 0.01]} />
        <meshStandardMaterial color="#E8ECF0" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.15, 0.27]}>
        <boxGeometry args={[0.12, 0.03, 0.02]} />
        <meshStandardMaterial color={handleColor} metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Drawer 2 */}
      <mesh position={[0, 0.75, 0.255]}>
        <boxGeometry args={[0.54, 0.32, 0.01]} />
        <meshStandardMaterial color="#E8ECF0" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.75, 0.27]}>
        <boxGeometry args={[0.12, 0.03, 0.02]} />
        <meshStandardMaterial color={handleColor} metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Drawer 3 */}
      <mesh position={[0, 0.35, 0.255]}>
        <boxGeometry args={[0.54, 0.32, 0.01]} />
        <meshStandardMaterial color="#E8ECF0" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.35, 0.27]}>
        <boxGeometry args={[0.12, 0.03, 0.02]} />
        <meshStandardMaterial color={handleColor} metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Drawer 4 (bottom) */}
      <mesh position={[0, -0.05, 0.255]}>
        <boxGeometry args={[0.54, 0.32, 0.01]} />
        <meshStandardMaterial color="#E8ECF0" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.05, 0.27]}>
        <boxGeometry args={[0.12, 0.03, 0.02]} />
        <meshStandardMaterial color={handleColor} metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Label on top drawer when hovered */}
      {interactive && hovered && (
        <mesh position={[0, 1.15, 0.26]}>
          <planeGeometry args={[0.3, 0.08]} />
          <meshStandardMaterial
            color="#5bb8d4"
            emissive="#5bb8d4"
            emissiveIntensity={0.3}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
    </group>
  );
}
