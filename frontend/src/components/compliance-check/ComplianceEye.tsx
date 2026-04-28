/**
 * Cyan PEARL eye SVG. Static markup; all motion (look-around, breathe,
 * halo-pulse) lives in index.css keyframes. Locked decision: no blink.
 */
const STRIPE_ANGLES = Array.from({ length: 60 }, (_, i) => i * 6);

export default function ComplianceEye() {
  return (
    <svg
      className="compliance-eye-img"
      viewBox="0 0 600 400"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <filter id="pearl-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.4
                    0 0 0 0 0.95
                    0 0 0 0 1
                    0 0 0 1 0"
          />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <clipPath id="pearl-eye-clip">
          <path d="M 60 200 Q 300 60 540 200 Q 300 340 60 200 Z" />
        </clipPath>

        <pattern
          id="scanline-pattern"
          x="0"
          y="0"
          width="600"
          height="6"
          patternUnits="userSpaceOnUse"
        >
          <rect width="600" height="3" fill="rgba(12,31,46,0.18)" />
          <rect y="3" width="600" height="3" fill="rgba(186,230,253,0.0)" />
        </pattern>
      </defs>

      <path
        d="M 60 200 Q 300 60 540 200 Q 300 340 60 200 Z"
        fill="#67e8f9"
        filter="url(#pearl-glow)"
      />

      <g clipPath="url(#pearl-eye-clip)">
        <g className="compliance-iris-look">
          <circle cx="300" cy="200" r="115" fill="#0c1f2e" opacity="0.85" />
          <g>
            <g transform="translate(300,200)">
              {STRIPE_ANGLES.map((deg) => (
                <g key={deg} transform={`rotate(${deg})`}>
                  <rect x="-1.5" y="-110" width="3" height="22" fill="#67e8f9" />
                </g>
              ))}
            </g>
          </g>
          <circle cx="300" cy="200" r="88" fill="none" stroke="#67e8f9" strokeWidth="3" />
          <circle cx="300" cy="200" r="55" fill="#0c1f2e" />
        </g>
      </g>

      <path
        d="M 60 200 Q 300 60 540 200 Q 300 340 60 200 Z"
        fill="none"
        stroke="#67e8f9"
        strokeWidth="4"
        opacity="0.9"
      />

      <g clipPath="url(#pearl-eye-clip)" opacity="0.6">
        <rect x="0" y="0" width="600" height="400" fill="url(#scanline-pattern)" />
      </g>
    </svg>
  );
}
