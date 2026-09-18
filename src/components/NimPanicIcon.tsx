/**
 * NimPanicIcon — flame-wrapped stopwatch matching the app favicon.
 * Renders as a plain SVG so it works at any size without raster scaling.
 *
 * Props:
 *   size  — pixel dimension of the square SVG (default 32)
 *   className — extra Tailwind / CSS classes on the <svg>
 */
export function NimPanicIcon({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        {/* Gold gradient used on all icon shapes */}
        <linearGradient id="npi-gold" x1="30" y1="10" x2="70" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFD55A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* ── Flame (behind the clock) ── */}
      <path
        d="
          M 38 88
          C 18 80 12 62 22 46
          C 26 39 30 34 30 26
          C 30 20 28 15 26 10
          C 34 16 40 24 38 36
          C 42 30 42 22 40 14
          C 50 22 56 34 52 46
          C 56 42 58 36 56 28
          C 64 36 68 48 64 60
          C 68 56 70 50 68 44
          C 76 54 78 68 70 78
          C 66 84 58 88 50 89
          C 46 89 42 89 38 88
          Z
        "
        fill="url(#npi-gold)"
      />

      {/* ── Stopwatch body ── */}
      <circle cx="55" cy="62" r="26" fill="url(#npi-gold)" />
      {/* inner face cutout */}
      <circle cx="55" cy="62" r="21" fill="#0F1B3E" />

      {/* ── Crown / stem ── */}
      <rect x="51" y="33" width="8" height="5" rx="2" fill="url(#npi-gold)" />
      {/* side button */}
      <rect x="68" y="38" width="6" height="4" rx="2" fill="url(#npi-gold)" transform="rotate(30 71 40)" />

      {/* ── Tick marks ── */}
      {/* 12 o'clock */}
      <rect x="54" y="44" width="2" height="5" rx="1" fill="url(#npi-gold)" />
      {/* 3 o'clock */}
      <rect x="72" y="61" width="5" height="2" rx="1" fill="url(#npi-gold)" />
      {/* 6 o'clock */}
      <rect x="54" y="75" width="2" height="5" rx="1" fill="url(#npi-gold)" />
      {/* 9 o'clock */}
      <rect x="34" y="61" width="5" height="2" rx="1" fill="url(#npi-gold)" />
      {/* 1:30 */}
      <rect x="64" y="47" width="4" height="2" rx="1" fill="url(#npi-gold)" transform="rotate(-60 66 48)" />
      {/* 4:30 */}
      <rect x="68" y="71" width="4" height="2" rx="1" fill="url(#npi-gold)" transform="rotate(60 70 72)" />
      {/* 7:30 */}
      <rect x="40" y="73" width="4" height="2" rx="1" fill="url(#npi-gold)" transform="rotate(-60 42 74)" />
      {/* 10:30 */}
      <rect x="36" y="49" width="4" height="2" rx="1" fill="url(#npi-gold)" transform="rotate(60 38 50)" />

      {/* ── Hands (pointing ~1 o'clock for tension) ── */}
      {/* minute hand */}
      <line x1="55" y1="62" x2="55" y2="47" stroke="url(#npi-gold)" strokeWidth="2" strokeLinecap="round" />
      {/* hour hand — angled right */}
      <line x1="55" y1="62" x2="65" y2="55" stroke="url(#npi-gold)" strokeWidth="2.5" strokeLinecap="round" />
      {/* centre pip */}
      <circle cx="55" cy="62" r="2.5" fill="url(#npi-gold)" />
    </svg>
  );
}
