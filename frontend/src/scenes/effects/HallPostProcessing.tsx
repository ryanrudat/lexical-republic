import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  VignetteEffect,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

/**
 * Manual post-processing pipeline using raw `postprocessing` + `n8ao` libs.
 * Bypasses @react-three/postprocessing (crashes in R3F v9 strict mode).
 *
 * Pipeline order:
 *  1. RenderPass   — renders scene to buffer (with depth)
 *  2. N8AOPostPass — screen-space ambient occlusion (reads depth from RenderPass)
 *  3. EffectPass   — Bloom + Vignette + ACES tone mapping
 */
export default function HallPostProcessing() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const composerRef = useRef<EffectComposer | null>(null);
  const aoPassRef = useRef<N8AOPostPass | null>(null);

  // Create the pipeline once the GL context is ready
  useEffect(() => {
    const ctx = gl.getContext();
    if (!ctx) return;

    const composer = new EffectComposer(gl, {
      depthBuffer: true,
      stencilBuffer: false,
      multisampling: 0,
    });

    // --- Pass 1: Render scene (with depth for AO) ---
    composer.addPass(new RenderPass(scene, camera));

    // --- Pass 2: N8AO ambient occlusion (reads depth from RenderPass) ---
    const aoPass = new N8AOPostPass(scene, camera, size.width, size.height);
    aoPass.configuration.aoSamples = 16;
    aoPass.configuration.aoRadius = 2.0;
    aoPass.configuration.intensity = 1.2;
    aoPass.configuration.denoiseSamples = 8;
    aoPass.configuration.denoiseRadius = 12;
    aoPass.configuration.distanceFalloff = 0.8;
    aoPass.configuration.halfRes = true;
    aoPass.configuration.gammaCorrection = false;
    composer.addPass(aoPass);
    aoPassRef.current = aoPass;

    // --- Pass 3: Bloom + Vignette + ACES tone mapping ---
    const bloom = new BloomEffect({
      intensity: 0.5,
      luminanceThreshold: 0.7,
      mipmapBlur: true,
    });
    const vignette = new VignetteEffect({
      offset: 0.35,
      darkness: 0.35,
    });
    const toneMapping = new ToneMappingEffect({
      mode: ToneMappingMode.ACES_FILMIC,
    });
    composer.addPass(new EffectPass(camera, bloom, vignette, toneMapping));

    composer.setSize(size.width, size.height);
    composerRef.current = composer;

    return () => {
      composer.dispose();
      composerRef.current = null;
      aoPassRef.current = null;
    };
  }, [gl, scene, camera]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resize handler
  useEffect(() => {
    composerRef.current?.setSize(size.width, size.height);
    aoPassRef.current?.setSize(size.width, size.height);
  }, [size]);

  // Take over render loop (priority 1 = R3F skips its own gl.render)
  useFrame((_state, delta) => {
    if (composerRef.current) {
      composerRef.current.render(delta);
    }
  }, 1);

  return null;
}
