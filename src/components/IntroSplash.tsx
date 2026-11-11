import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SESSION_KEY = 'smashzone_intro_shown';

const BALL_HOLES = [
  { cx: 0, cy: 0, r: 3.4 },
  { cx: -9, cy: -8, r: 2.7 },
  { cx: 9, cy: -8, r: 2.7 },
  { cx: -9, cy: 9, r: 2.7 },
  { cx: 9, cy: 9, r: 2.7 },
  { cx: 0, cy: -13, r: 2.3 },
  { cx: 0, cy: 13, r: 2.3 },
  { cx: -13, cy: 0, r: 2.3 },
  { cx: 13, cy: 0, r: 2.3 },
];

interface IntroSplashProps {
  onComplete?: () => void;
}

export function IntroSplash({ onComplete }: IntroSplashProps) {
  const [isDismissing, setIsDismissing] = useState(false);

  const [shouldShow, setShouldShow] = useState(() => {
    return typeof window !== 'undefined'
      ? !sessionStorage.getItem(SESSION_KEY)
      : true;
  });

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasDismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (hasDismissedRef.current) return;

    hasDismissedRef.current = true;
    setIsDismissing(true);

    dismissTimerRef.current = setTimeout(() => {
      setShouldShow(false);
      onComplete?.();
    }, 450);
  }, [onComplete]);

  useEffect(() => {
    if (!shouldShow) {
      onComplete?.();
      return;
    }

    sessionStorage.setItem(SESSION_KEY, 'true');

    const timer = setTimeout(dismiss, 3600);

    return () => {
      clearTimeout(timer);
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [shouldShow, dismiss, onComplete]);

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="smashzone-intro"
        onClick={dismiss}
        initial={{ opacity: 1 }}
        animate={{ opacity: isDismissing ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.45,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-white cursor-pointer select-none"
      >
        {/* Ambient Warm & Purple Radial Lighting */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 35% 35%, rgba(61,17,100,0.08) 0%, transparent 55%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 65% 30%, rgba(255,122,0,0.1) 0%, transparent 50%)',
          }}
        />

        {/* Main Logo Composition Container */}
        <div className="relative z-10 flex w-full max-w-[540px] flex-col items-center px-6">
          
          {/* SVG Graphic Scene: Paddle + Net + Swooshes + Ball */}
          <div className="relative z-10 h-[150px] w-full max-w-[420px]">
            <svg
              viewBox="0 0 420 150"
              preserveAspectRatio="xMidYMid meet"
              className="block h-full w-full overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <filter
                  id="ball-soft-glow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                  colorInterpolationFilters="sRGB"
                >
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#FF7A00" floodOpacity="0.3" />
                </filter>
                <filter
                  id="paddle-shadow"
                  x="-30%"
                  y="-30%"
                  width="160%"
                  height="160%"
                >
                  <feDropShadow dx="2" dy="5" stdDeviation="4" floodColor="#0D0E12" floodOpacity="0.18" />
                </filter>
              </defs>

              {/* Net grid in background */}
              <motion.g
                initial={{ opacity: 0, scaleX: 0.8 }}
                animate={{ opacity: 0.85, scaleX: 1 }}
                transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
                style={{ transformOrigin: '210px 85px' }}
              >
                {/* Net Frame */}
                <rect
                  x="150"
                  y="62"
                  width="180"
                  height="34"
                  fill="none"
                  stroke="#0D0E12"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                {/* Horizontal middle rope */}
                <line x1="150" y1="79" x2="330" y2="79" stroke="#0D0E12" strokeWidth="2" />
                {/* Net Vertical Bars */}
                {[170, 190, 210, 230, 250, 270, 290, 310].map((x) => (
                  <line
                    key={x}
                    x1={x}
                    y1="62"
                    x2={x}
                    y2="96"
                    stroke="#0D0E12"
                    strokeWidth="1.8"
                    opacity="0.85"
                  />
                ))}
              </motion.g>

              {/* Orange Upper Motion Swoosh Arc */}
              <motion.path
                d="M 50 115 C 130 0, 310 10, 350 45"
                fill="none"
                stroke="#FF7A00"
                strokeWidth="7"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Purple Inner Motion Swoosh Arc */}
              <motion.path
                d="M 40 125 C 120 18, 280 28, 330 65"
                fill="none"
                stroke="#3D1164"
                strokeWidth="5"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Paddle (Tilted on Left) */}
              <motion.g
                filter="url(#paddle-shadow)"
                initial={{ opacity: 0, scale: 0.6, rotate: -35 }}
                animate={{ opacity: 1, scale: 1, rotate: -20 }}
                transition={{ delay: 0.3, duration: 0.6, ease: [0.34, 1.3, 0.64, 1] }}
                style={{ transformOrigin: '120px 75px' }}
              >
                {/* Paddle Handle */}
                <rect
                  x="70"
                  y="105"
                  width="14"
                  height="26"
                  rx="4"
                  fill="#0D0E12"
                  stroke="#0D0E12"
                  strokeWidth="2"
                />
                {/* Paddle Outer Edge */}
                <rect
                  x="70"
                  y="30"
                  width="72"
                  height="82"
                  rx="20"
                  fill="#3D1164"
                  stroke="#0D0E12"
                  strokeWidth="4.5"
                />
                {/* Paddle Inner Inset Border */}
                <rect
                  x="74"
                  y="34"
                  width="64"
                  height="74"
                  rx="16"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />
                {/* Paddle Dynamic Accent Stripes */}
                <path
                  d="M 80 82 L 130 52"
                  stroke="#FF7A00"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <path
                  d="M 84 94 L 126 68"
                  stroke="#FF7A00"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </motion.g>

              {/* Pickleball (Top Right) */}
              <motion.g
                initial={{ opacity: 0, scale: 0.3, x: 40, y: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                transition={{ delay: 0.45, duration: 0.65, ease: [0.34, 1.45, 0.64, 1] }}
                filter="url(#ball-soft-glow)"
              >
                <g transform="translate(355 52)">
                  {/* Ball Body */}
                  <circle
                    cx="0"
                    cy="0"
                    r="28"
                    fill="#FFA81A"
                    stroke="#0D0E12"
                    strokeWidth="4"
                  />
                  {/* Perforated Holes */}
                  {BALL_HOLES.map((hole, i) => (
                    <circle
                      key={i}
                      cx={hole.cx * 0.9}
                      cy={hole.cy * 0.9}
                      r={hole.r * 0.95}
                      fill="#0D0E12"
                    />
                  ))}
                </g>
              </motion.g>
            </svg>
          </div>

          {/* Main Wordmark: SMASH ZONE */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-20 flex flex-col items-center text-center -mt-2"
          >
            <h1 className="font-display text-5xl font-black italic uppercase tracking-tight sm:text-6xl select-none leading-none">
              <span className="text-[#3D1164] drop-shadow-[0_2px_12px_rgba(61,17,100,0.25)]">
                SMASH
              </span>{' '}
              <span className="text-[#FF7A00] drop-shadow-[0_2px_14px_rgba(255,122,0,0.3)]">
                ZONE
              </span>
            </h1>

            {/* "by Jerjen" signature script style */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.85, duration: 0.5 }}
              className="mt-1 flex items-center justify-center gap-3 w-full"
            >
              <div className="h-[2px] w-12 sm:w-16 bg-[#0D0E12]" />
              <span
                className="font-serif italic text-lg sm:text-xl font-bold text-[#0D0E12] tracking-wide"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                by Jerjen
              </span>
              <div className="h-[2px] w-12 sm:w-16 bg-[#0D0E12]" />
            </motion.div>

            {/* RECREATIONAL HUB Subtitle */}
            <motion.p
              initial={{ opacity: 0, letterSpacing: '0.2em' }}
              animate={{ opacity: 1, letterSpacing: '0.45em' }}
              transition={{ delay: 1, duration: 0.6, ease: 'easeOut' }}
              className="mt-3 font-sans text-xs sm:text-sm font-extrabold uppercase text-[#0D0E12] pl-[0.45em]"
            >
              RECREATIONAL HUB
            </motion.p>
          </motion.div>

          {/* Lower Speed Swoosh Accent Line */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 flex h-[4px] w-36 overflow-hidden rounded-full"
          >
            <div className="w-1/2 bg-[#3D1164]" />
            <div className="w-1/2 bg-[#FF7A00]" />
          </motion.div>
        </div>

        {/* Tap to enter footer prompt */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.35, 0.85, 0.35] }}
          transition={{ delay: 1.4, duration: 2, repeat: Infinity }}
          className="absolute bottom-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500"
        >
          <span className="h-2 w-2 rounded-full bg-[#FF7A00] animate-pulse" />
          <span>Tap anywhere to book court</span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}