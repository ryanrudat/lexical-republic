import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';

/** Star compass inlay on central floor — decorative brass/chrome pattern */
export default function FloorCompass() {
  const points = 8;
  const outerR = 1.8;
  const innerR = 0.6;

  // Pre-build triangle geometries for star points
  const starGeometries = useMemo(() => {
    return Array.from({ length: points }, (_, i) => {
      const angle = (i / points) * Math.PI * 2;
      const isPrimary = i % 2 === 0;
      const tipR = isPrimary ? outerR : outerR * 0.7;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const cosL = Math.cos(angle - 0.15);
      const sinL = Math.sin(angle - 0.15);
      const cosR = Math.cos(angle + 0.15);
      const sinR = Math.sin(angle + 0.15);

      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute([
        sin * tipR, cos * tipR, 0,
        sinL * innerR, cosL * innerR, 0,
        sinR * innerR, cosR * innerR, 0,
      ], 3));
      geo.computeVertexNormals();

      return { geo, isPrimary };
    });
  }, []);

  return (
    <group position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Outer ring */}
      <mesh>
        <ringGeometry args={[1.9, 2.0, 64]} />
        <meshStandardMaterial color="#C0B090" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Inner ring */}
      <mesh>
        <ringGeometry args={[0.5, 0.55, 64]} />
        <meshStandardMaterial color="#C0B090" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Star points */}
      {starGeometries.map(({ geo, isPrimary }, i) => (
        <mesh key={i} geometry={geo}>
          <meshStandardMaterial
            color={isPrimary ? '#B8A878' : '#A89868'}
            metalness={0.3}
            roughness={0.6}
            side={2}
          />
        </mesh>
      ))}

      {/* Center disc */}
      <mesh>
        <circleGeometry args={[0.3, 32]} />
        <meshStandardMaterial color="#D0C8B0" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  );
}
