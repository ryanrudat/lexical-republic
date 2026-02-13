/** 4 cables from dome ceiling to PEARL frame — thin chrome cylinders */
export default function SuspensionCables() {
  // 4 attachment points on the PEARL frame ring (radius ~1.4)
  // Running from dome apex area (y~10) down to PEARL position (y~7)
  const cables = [
    { top: [1.2, 10, 1.2], bottom: [0.9, 7.8, 0.9] },
    { top: [-1.2, 10, 1.2], bottom: [-0.9, 7.8, 0.9] },
    { top: [1.2, 10, -1.2], bottom: [0.9, 7.8, -0.9] },
    { top: [-1.2, 10, -1.2], bottom: [-0.9, 7.8, -0.9] },
  ] as const;

  return (
    <>
      {cables.map((cable, i) => {
        const midX = (cable.top[0] + cable.bottom[0]) / 2;
        const midY = (cable.top[1] + cable.bottom[1]) / 2;
        const midZ = (cable.top[2] + cable.bottom[2]) / 2;

        const dx = cable.top[0] - cable.bottom[0];
        const dy = cable.top[1] - cable.bottom[1];
        const dz = cable.top[2] - cable.bottom[2];
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Calculate rotation to align cylinder with cable direction
        const rotX = Math.atan2(
          Math.sqrt(dx * dx + dz * dz),
          dy,
        );
        const rotY = Math.atan2(dx, dz);

        return (
          <mesh
            key={i}
            position={[midX, midY, midZ]}
            rotation={[rotX, rotY, 0]}
          >
            <cylinderGeometry args={[0.015, 0.015, length, 6]} />
            <meshStandardMaterial
              color="#A0A0A0"
              metalness={0.6}
              roughness={0.3}
            />
          </mesh>
        );
      })}
    </>
  );
}
