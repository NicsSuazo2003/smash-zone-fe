
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SESSION_KEY = 'smashpoint_intro_shown';

const BALL_HOLES = [
  { cx: 0, cy: 0, r: 3.2 },
  { cx: -10, cy: -8, r: 2.6 },
  { cx: 10, cy: -8, r: 2.6 },
  { cx: -10, cy: 9, r: 2.6 },
  { cx: 10, cy: 9, r: 2.6 },
  { cx: 0, cy: -14, r: 2.2 },
  { cx: 0, cy: 14, r: 2.2 },
  { cx: -14, cy: 0, r: 2.2 },
  { cx: 14, cy: 0, r: 2.2 },
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

    const timer = setTimeout(dismiss, 3400);

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
        key="smashpoint-intro"
        onClick={dismiss}
        initial={{ opacity: 1 }}
        animate={{ opacity: isDismissing ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.45,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#0A0B0D] cursor-pointer select-none"
      >
        {/* Background lighting */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 40%, rgba(237,28,36,0.12) 0%, transparent 60%)',
          }}
        />

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 30%, rgba(255,183,3,0.06) 0%, transparent 45%)',
          }}
        />

        {/* Main logo container */}
        <div className="relative z-10 flex w-full max-w-[540px] flex-col items-center px-6">

          {/* Logo emblem: arch + centered pickleball */}
          <div className="relative z-10 h-[130px] w-full max-w-[420px]">
            <svg
              viewBox="0 0 420 130"
              preserveAspectRatio="xMidYMid meet"
              className="block h-full w-full overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <filter
                  id="ball-glow"
                  x="-100%"
                  y="-100%"
                  width="300%"
                  height="300%"
                  colorInterpolationFilters="sRGB"
                >
                  <feGaussianBlur stdDeviation="5" />
                </filter>

                <filter
                  id="arc-shadow"
                  x="-20%"
                  y="-30%"
                  width="140%"
                  height="170%"
                >
                  <feDropShadow
                    dx="0"
                    dy="4"
                    stdDeviation="3"
                    floodColor="#000000"
                    floodOpacity="0.35"
                  />
                </filter>
              </defs>

              {/* Primary red arch */}
              <motion.path
                d="M 50 115 Q 210 10 370 115"
                fill="none"
                stroke="#ED1C24"
                strokeWidth="7"
                strokeLinecap="round"
                filter="url(#arc-shadow)"
                initial={{
                  pathLength: 0,
                  opacity: 0,
                }}
                animate={{
                  pathLength: 1,
                  opacity: 1,
                }}
                transition={{
                  duration: 0.75,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />

              {/* Secondary inner arch */}
              <motion.path
                d="M 80 118 Q 210 32 340 118"
                fill="none"
                stroke="#B00714"
                strokeWidth="3.5"
                strokeLinecap="round"
                initial={{
                  pathLength: 0,
                  opacity: 0,
                }}
                animate={{
                  pathLength: 1,
                  opacity: 0.7,
                }}
                transition={{
                  delay: 0.1,
                  duration: 0.75,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />

              {/* Pickleball — correctly centered at the arch apex */}
              <motion.g
                initial={{
                  opacity: 0,
                  scale: 0.4,
                  y: -24,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.45,
                  duration: 0.65,
                  ease: [0.34, 1.45, 0.64, 1],
                }}
                style={{
                  transformBox: 'view-box',
                  transformOrigin: '210px 62px',
                }}
              >
                <g transform="translate(210 62)">
                  {/* Soft yellow glow */}
                  <circle
                    cx="0"
                    cy="0"
                    r="34"
                    fill="#FFB703"
                    opacity="0.28"
                    filter="url(#ball-glow)"
                  />

                  {/* Main ball */}
                  <circle
                    cx="0"
                    cy="0"
                    r="29"
                    fill="#FFB703"
                  />

                  {/* Perforated holes */}
                  {BALL_HOLES.map((hole, index) => (
                    <circle
                      key={index}
                      cx={hole.cx * 0.9}
                      cy={hole.cy * 0.9}
                      r={hole.r * 0.9}
                      fill="#0A0B0D"
                    />
                  ))}
                </g>
              </motion.g>
            </svg>
          </div>

          {/* SMASH POINT wordmark */}
          <motion.div
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.65,
              duration: 0.55,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative z-20 -mt-[10px] flex items-center justify-center text-center"
          >
            <h1 className="whitespace-nowrap font-display text-4xl font-extrabold italic uppercase tracking-wider sm:text-5xl">
              <span className="text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)]">
                SMASH
              </span>{' '}
              <span className="text-[#ED1C24] drop-shadow-[0_0_20px_rgba(237,28,36,0.5)]">
                POINT
              </span>
            </h1>
          </motion.div>

          {/* Red divider */}
          <motion.div
            initial={{
              scaleX: 0,
              opacity: 0,
            }}
            animate={{
              scaleX: 1,
              opacity: 1,
            }}
            transition={{
              delay: 0.85,
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="my-3 h-[3px] w-full max-w-[280px] origin-center rounded-full bg-[#ED1C24] shadow-[0_0_12px_rgba(237,28,36,0.7)]"
          />

          {/* Subtitle */}
          <motion.p
            initial={{
              opacity: 0,
              letterSpacing: '0.15em',
            }}
            animate={{
              opacity: 1,
              letterSpacing: '0.35em',
            }}
            transition={{
              delay: 1,
              duration: 0.55,
              ease: 'easeOut',
            }}
            className="whitespace-nowrap font-sans text-[11px] font-bold uppercase text-[#A4ABB9] sm:text-xs"
          >
            Pickle Sports Center
          </motion.p>
        </div>

        {/* Tap to continue */}
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: [0.3, 0.75, 0.3],
          }}
          transition={{
            delay: 1.3,
            duration: 2,
            repeat: Infinity,
          }}
          className="absolute bottom-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[#7A8395]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#ED1C24]" />
          <span>Tap anywhere to book</span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
