import { Vignette } from '@react-three/postprocessing';
import { EffectComposer } from '@react-three/postprocessing';

export default function CRTScanlines() {
  return (
    <EffectComposer>
      <Vignette eskil={false} offset={0.2} darkness={0.3} />
    </EffectComposer>
  );
}
