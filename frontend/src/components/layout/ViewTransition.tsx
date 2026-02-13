import { useViewStore } from '../../stores/viewStore';

export default function ViewTransition() {
  const isTransitioning = useViewStore((s) => s.isTransitioning);
  const transitionType = useViewStore((s) => s.transitionType);

  if (!isTransitioning) return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* CRT static noise */}
      <div
        className="absolute inset-0 animate-screen-flicker"
        style={{
          background: transitionType === 'enter-terminal'
            ? 'radial-gradient(ellipse at center, rgba(91,184,212,0.15) 0%, rgba(0,0,0,0.95) 70%)'
            : 'radial-gradient(ellipse at center, rgba(237,232,208,0.15) 0%, rgba(0,0,0,0.95) 70%)',
          animation: 'viewTransition 1200ms ease-in-out forwards',
        }}
      />
      {/* Horizontal scan line */}
      <div
        className="absolute left-0 right-0 h-1"
        style={{
          background: transitionType === 'enter-terminal'
            ? 'rgba(91,184,212,0.6)'
            : 'rgba(237,232,208,0.6)',
          boxShadow: transitionType === 'enter-terminal'
            ? '0 0 20px rgba(91,184,212,0.4)'
            : '0 0 20px rgba(237,232,208,0.4)',
          animation: 'scanSweep 1200ms ease-in-out forwards',
        }}
      />
    </div>
  );
}
