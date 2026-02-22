import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  VideoTexture,
  SRGBColorSpace,
  LinearFilter,
  ShaderMaterial,
} from 'three';

// ─── Types ────────────────────────────────────────────────────
interface PearlSphere3DProps {
  visible: boolean;
  onVisibilityChange: (v: boolean) => void;
  isMuted: boolean;
}

interface VideoFaceProps {
  videoTexture: VideoTexture | null;
  visible: boolean;
}

// ─── Swirl Shader ─────────────────────────────────────────────
// Animated flowing cyan light pattern on the inner sphere
const SWIRL_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mvPos.xyz);
  gl_Position = projectionMatrix * mvPos;
}
`;

const SWIRL_FRAG = /* glsl */ `
uniform float uTime;
uniform float uMood;   // 0 = calm, 1 = thinking/storm
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float angle = atan(p.y, p.x);

  // --- Constant slow vortex rotation (always present) ---
  // The whole pattern slowly rotates — inner parts faster than outer (like liquid in a bowl)
  float baseSwirl = uTime * 0.3 + r * 2.0;
  float a = angle + baseSwirl;

  // During storm: tighten and slightly speed up the vortex
  a += uMood * (uTime * 0.15 + r * 1.0);

  // Swirl bands — broad, smooth, unified (like ribbons of light curling around)
  float s1 = sin(a * 2.0 - r * 4.0 + uTime * 0.4) * 0.5 + 0.5;
  float s2 = sin(a * 1.5 + r * 3.0 - uTime * 0.3) * 0.5 + 0.5;
  float s3 = cos(a * 3.0 - r * 2.0 + uTime * 0.5) * 0.5 + 0.5;

  // Combine into a smooth, fluid intensity
  float intensity = s1 * 0.45 + s2 * 0.35 + s3 * 0.2;

  // Storm: fill in the gaps so it looks like a dense mass
  intensity = mix(intensity, 0.25 + intensity * 0.75, uMood);

  // Edge fade
  float facing = max(dot(vNormal, vViewDir), 0.0);
  float edge = smoothstep(0.0, 0.15, facing);
  intensity *= edge;

  // Calm palette: bright cyan
  vec3 c1_calm = vec3(0.0, 0.898, 1.0);   // #00E5FF
  vec3 c2_calm = vec3(0.314, 0.863, 1.0); // #50DCFF
  vec3 c3_calm = vec3(0.549, 0.941, 1.0); // #8CF0FF

  // Storm palette: deeper teal
  vec3 c1_storm = vec3(0.0, 0.5, 0.65);
  vec3 c2_storm = vec3(0.0, 0.35, 0.55);
  vec3 c3_storm = vec3(0.05, 0.6, 0.75);

  vec3 c1 = mix(c1_calm, c1_storm, uMood);
  vec3 c2 = mix(c2_calm, c2_storm, uMood);
  vec3 c3 = mix(c3_calm, c3_storm, uMood);

  vec3 color = mix(c1, c2, s1) * 0.5 + c3 * s3 * 0.3;
  color *= intensity;

  float alpha = intensity * mix(0.55, 0.72, uMood);

  gl_FragColor = vec4(color, alpha);
}
`;

function SwirlSphere() {
  const matRef = useRef<ShaderMaterial>(null);
  const moodTarget = useRef(0);   // 0 = calm, 1 = thinking
  const moodCurrent = useRef(0);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMood: { value: 0 },
  }), []);

  // Random mood timer — occasionally shift to "thinking" then back to calm
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const scheduleMoodShift = () => {
      // Calm phase: 3-5 minutes before next thinking moment
      const calmDuration = 3 * 60 * 1000 + Math.random() * 2 * 60 * 1000;
      timeout = setTimeout(() => {
        moodTarget.current = 1;
        // Thinking phase: 5-10 seconds
        const thinkDuration = 5000 + Math.random() * 5000;
        timeout = setTimeout(() => {
          moodTarget.current = 0;
          scheduleMoodShift();
        }, thinkDuration);
      }, calmDuration);
    };

    scheduleMoodShift();
    return () => clearTimeout(timeout);
  }, []);

  useFrame((state, delta) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;

    // Smooth lerp toward target mood
    const lerpSpeed = moodTarget.current > moodCurrent.current ? 1.5 : 0.8;
    moodCurrent.current += (moodTarget.current - moodCurrent.current) * Math.min(delta * lerpSpeed, 1);
    matRef.current.uniforms.uMood.value = moodCurrent.current;
  });

  return (
    <mesh renderOrder={0}>
      <sphereGeometry args={[1.0, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={SWIRL_VERT}
        fragmentShader={SWIRL_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Video Face (white-only shader) ───────────────────────────
// Shows only bright/white pixels from the video, rest transparent
// UV crop is applied directly in the vertex shader because ShaderMaterial
// does not use texture.repeat / texture.offset (those only work with built-in materials).
const FACE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  // Crop to face region: show Y 36%–91% of the video (rows ~115–819 of 1280)
  vUv = vec2(uv.x, uv.y * 0.55 + 0.36);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FACE_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec4 tex = texture2D(uMap, vUv);
  float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  // High threshold: only truly white pixels pass (filters out light-blue bg ~0.75 luma)
  float alpha = smoothstep(0.82, 0.92, luma) * uOpacity;
  gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
}
`;

function VideoFace({ videoTexture, visible }: VideoFaceProps) {
  const matRef = useRef<ShaderMaterial>(null);
  const opacityRef = useRef(visible ? 1 : 0);

  const uniforms = useMemo(() => ({
    uMap: { value: null as VideoTexture | null },
    uOpacity: { value: 1.0 },
  }), []);

  useEffect(() => {
    uniforms.uMap.value = videoTexture;
  }, [videoTexture, uniforms]);

  useFrame((_state, delta) => {
    if (!matRef.current) return;
    const target = visible ? 1 : 0;
    opacityRef.current += (target - opacityRef.current) * Math.min(delta * 5, 1);
    matRef.current.uniforms.uOpacity.value = opacityRef.current;

    // Force texture update every frame while video has data.
    // video.load() can break the requestVideoFrameCallback chain that
    // VideoTexture relies on, leaving needsUpdate permanently false.
    if (videoTexture?.image) {
      const video = videoTexture.image as HTMLVideoElement;
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        videoTexture.needsUpdate = true;
      }
    }
  });

  if (!videoTexture) return null;

  return (
    <mesh position={[0, -0.38, 0.15]} renderOrder={2}>
      <circleGeometry args={[1.5, 48]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={FACE_VERT}
        fragmentShader={FACE_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

// ─── Glass Shell ──────────────────────────────────────────────
// Thin transparent front-facing highlight for glass sheen
function GlassShell() {
  return (
    <mesh renderOrder={3}>
      <sphereGeometry args={[1.0, 64, 64]} />
      <meshStandardMaterial
        color="#5BB8D4"
        transparent
        opacity={0.08}
        roughness={0.0}
        metalness={0.6}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Scene contents (inside Canvas) ──────────────────────────
function PearlScene({
  videoTexture,
  visible,
}: {
  videoTexture: VideoTexture | null;
  visible: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 0]} intensity={1.5} color="#00E5FF" distance={4} />
      <SwirlSphere />
      <VideoFace videoTexture={videoTexture} visible={visible} />
      <GlassShell />
    </>
  );
}

// ─── Main exported component ─────────────────────────────────
export default function PearlSphere3D({ visible, onVisibilityChange, isMuted }: PearlSphere3DProps) {
  const [videoTexture, setVideoTexture] = useState<VideoTexture | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  // Stable ref for callback so the mount-effect closure never goes stale
  const cbRef = useRef(onVisibilityChange);
  useEffect(() => { cbRef.current = onVisibilityChange; }, [onVisibilityChange]);

  useEffect(() => {
    // --- Visual-only video (no audio, autoplays everywhere including Safari) ---
    const video = document.createElement('video');
    video.src = '/video/office-backdrop-noaudio.mp4';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    videoElRef.current = video;

    // --- Separate audio track (requires user gesture to unlock) ---
    const audio = new Audio('/video/office-backdrop-audio.m4a');
    audio.preload = 'auto';
    audio.muted = true; // starts muted; volume button unlocks
    audioElRef.current = audio;

    const REPLAY_INTERVAL = 3 * 60 * 1000;

    const tex = new VideoTexture(video);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    setVideoTexture(tex);

    /** Play audio alongside video */
    const playAudioSync = () => {
      if (!audioElRef.current) return;
      audioElRef.current.currentTime = 0;
      audioElRef.current.play().catch(() => {});
    };

    /**
     * Start (or restart) the video. Browsers may evict media data from
     * off-DOM elements that have been idle, so we call video.load() first
     * to re-fetch data, then wait for readyState before playing.
     * Only shows the face (cbRef) once playback actually starts.
     */
    const startVideo = () => {
      video.currentTime = 0;
      video.load();

      const doPlay = () => {
        video.play().then(() => {
          cbRef.current(true);
          playAudioSync();
        }).catch((e) => {
          console.warn('[PEARL] video play failed:', e.message);
        });
      };

      if (video.readyState >= 2) {
        doPlay();
      } else {
        video.addEventListener('canplay', function onCanPlay() {
          video.removeEventListener('canplay', onCanPlay);
          doPlay();
        });
      }
    };

    // When video ends, fade out the face and pause audio
    const handleEnded = () => {
      cbRef.current(false);
      audioElRef.current?.pause();
    };
    video.addEventListener('ended', handleEnded);

    // Also stop audio if it outruns the video somehow
    const handleAudioEnded = () => {
      audioElRef.current?.pause();
    };
    audio.addEventListener('ended', handleAudioEnded);

    // Initial play — load and poll until ready
    startVideo();

    // Every 3 minutes, replay the face animation + audio
    // Uses startVideo() which re-loads media data to avoid stale buffer
    const replayTimer = setInterval(() => {
      startVideo();
    }, REPLAY_INTERVAL);

    return () => {
      video.removeEventListener('ended', handleEnded);
      audio.removeEventListener('ended', handleAudioEnded);
      clearInterval(replayTimer);
      video.pause();
      video.src = '';
      audio.pause();
      audio.src = '';
      tex.dispose();
    };
  }, []);

  // Sync mute state from parent into the audio element.
  // When unmuting, also sync playback position with the video and start playing
  // (the button click IS the user gesture that unlocks audio).
  useEffect(() => {
    const audio = audioElRef.current;
    const video = videoElRef.current;
    if (!audio) return;

    audio.muted = isMuted;

    if (!isMuted && video && !video.paused && !video.ended) {
      // Video is currently playing — sync audio to it and play
      audio.currentTime = video.currentTime;
      audio.play().catch(() => {});
    }
  }, [isMuted]);

  // If parent sets visible=true while video is paused, restart playback
  useEffect(() => {
    const video = videoElRef.current;
    if (!video) return;
    if (visible && video.paused) {
      video.currentTime = 0;
      video.load();
      const onReady = () => {
        video.removeEventListener('canplay', onReady);
        video.play().catch(() => {});
        if (audioElRef.current) {
          audioElRef.current.currentTime = 0;
          audioElRef.current.play().catch(() => {});
        }
      };
      if (video.readyState >= 2) {
        video.play().catch(() => {});
        if (audioElRef.current) {
          audioElRef.current.currentTime = 0;
          audioElRef.current.play().catch(() => {});
        }
      } else {
        video.addEventListener('canplay', onReady);
      }
    }
  }, [visible]);

  return (
    <Canvas
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 2.15], fov: 45 }}
      style={{ pointerEvents: 'none', width: '100%', height: '100%' }}
    >
      <PearlScene videoTexture={videoTexture} visible={visible} />
    </Canvas>
  );
}
