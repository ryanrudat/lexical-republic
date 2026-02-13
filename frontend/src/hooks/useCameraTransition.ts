import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useViewStore } from '../stores/viewStore';

const SEATED_POS = new Vector3(0, 2.2, 1.5);
const SEATED_LOOK = new Vector3(0, 1.8, -8);
const SCREEN_POS = new Vector3(0, 1.15, -0.8);
const SCREEN_LOOK = new Vector3(0, 1.05, -1.15);
const LERP_SPEED = 3.0;

export function useCameraTransition() {
  const isTransitioning = useViewStore((s) => s.isTransitioning);
  const transitionType = useViewStore((s) => s.transitionType);
  const { camera } = useThree();
  const targetRef = useRef(SEATED_POS.clone());
  const lookRef = useRef(SEATED_LOOK.clone());
  const initRef = useRef(false);

  // Set initial camera orientation on first mount
  useEffect(() => {
    if (!initRef.current) {
      camera.position.copy(SEATED_POS);
      camera.lookAt(SEATED_LOOK);
      initRef.current = true;
    }
  }, [camera]);

  useFrame((_, delta) => {
    if (!isTransitioning) return;

    if (transitionType === 'enter-terminal') {
      targetRef.current.copy(SCREEN_POS);
      lookRef.current.copy(SCREEN_LOOK);
    } else if (transitionType === 'exit-terminal') {
      targetRef.current.copy(SEATED_POS);
      lookRef.current.copy(SEATED_LOOK);
    }

    camera.position.lerp(targetRef.current, LERP_SPEED * delta);
    // Smoothly update lookAt by lerping a target point
    const currentLook = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position);
    currentLook.lerp(lookRef.current, LERP_SPEED * delta);
    camera.lookAt(currentLook);
  });
}
