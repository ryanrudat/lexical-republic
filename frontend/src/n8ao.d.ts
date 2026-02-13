declare module 'n8ao' {
  import type { Scene, Camera } from 'three';
  import type { Pass } from 'postprocessing';

  interface N8AOConfiguration {
    aoSamples: number;
    aoRadius: number;
    denoiseSamples: number;
    denoiseRadius: number;
    distanceFalloff: number;
    intensity: number;
    denoiseIterations: number;
    renderMode: number;
    color: import('three').Color;
    gammaCorrection: boolean;
    halfRes: boolean;
    depthAwareUpsampling: boolean;
    transparencyAware: boolean;
    accumulate: boolean;
  }

  export class N8AOPass extends Pass {
    configuration: N8AOConfiguration;
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    setSize(width: number, height: number): void;
    setQualityMode(mode: string): void;
    setDisplayMode(mode: string): void;
  }

  export class N8AOPostPass extends Pass {
    configuration: N8AOConfiguration;
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    setSize(width: number, height: number): void;
    setDepthTexture(depthTexture: import('three').DepthTexture): void;
  }

  export const DepthType: {
    Default: number;
    Log: number;
    Reverse: number;
  };
}
