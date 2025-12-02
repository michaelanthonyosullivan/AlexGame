'use client';

import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

type GameStatus = 'playing' | 'success' | 'too-many';

type ConfettiPiece = {
  left: number;
  drift: number;
  duration: number;
  delay: number;
  color: string;
};

type BalloonSpec = {
  left: number;
  delay: number;
  color: string;
  scale: number;
};

type StarSpec = {
  top: number;
  left: number;
  delay: number;
};

const CONFETTI_COLORS = [
  '#f97316',
  '#facc15',
  '#22d3ee',
  '#a855f7',
  '#34d399',
  '#fb7185',
];

const BALLOON_COLORS = ['#f472b6', '#60a5fa', '#fbbf24', '#34d399', '#c084fc'];

const STAR_SPECS: StarSpec[] = [
  { top: 8, left: 18, delay: 0 },
  { top: 12, left: 72, delay: 0.1 },
  { top: 32, left: 5, delay: 0.2 },
  { top: 45, left: 86, delay: 0.3 },
  { top: 65, left: 12, delay: 0.35 },
  { top: 70, left: 80, delay: 0.4 },
  { top: 85, left: 30, delay: 0.45 },
  { top: 88, left: 65, delay: 0.5 },
];

const createConfettiPieces = (): ConfettiPiece[] =>
  Array.from({ length: 36 }, (_, idx) => ({
    left: Math.random() * 100,
    drift: Math.random() * 120 - 60,
    duration: 1 + Math.random() * 0.7,
    delay: idx * 0.035,
    color: CONFETTI_COLORS[idx % CONFETTI_COLORS.length],
  }));

const createBalloonSpecs = (): BalloonSpec[] =>
  Array.from({ length: 6 }, () => ({
    left: Math.random() * 80 + 10,
    delay: Math.random() * 0.6,
    color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
    scale: 0.7 + Math.random() * 0.5,
  }));

function getRandomTarget(): number {
  return Math.floor(Math.random() * 5) + 1; // 1–5
}

function getNextTarget(previous: number): number {
  let next = getRandomTarget();
  while (next === previous) {
    next = getRandomTarget();
  }
  return next;
}

function playCelebrationSound() {
  if (typeof window === 'undefined') return;

  const AudioCtx =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const now = ctx.currentTime;
  // Simple little "TA-DAH" melody: G4–C5–E5–G5, ending with a bright chord
  const melody: Array<{ freq: number; time: number }> = [
    { freq: 392.0, time: 0.0 },  // G4
    { freq: 523.25, time: 0.22 }, // C5
    { freq: 659.25, time: 0.44 }, // E5
    { freq: 784.0, time: 0.66 },  // G5
  ];

  melody.forEach(({ freq, time }, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = idx === melody.length - 1 ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(freq, now + time);

    gain.gain.setValueAtTime(0.0001, now + time);
    gain.gain.exponentialRampToValueAtTime(0.6, now + time + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + time + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + 0.6);
  });

  // Final "DAH" chord at the end for extra musicality
  const chordStart = now + 0.95;
  const chordNotes = [523.25, 659.25, 784.0]; // C5, E5, G5

  chordNotes.forEach(freq => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, chordStart);

    gain.gain.setValueAtTime(0.0001, chordStart);
    gain.gain.exponentialRampToValueAtTime(0.5, chordStart + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, chordStart + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(chordStart);
    osc.stop(chordStart + 0.7);
  });
}

function playPopSound() {
  if (typeof window === 'undefined') return;

  const AudioCtx =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const now = ctx.currentTime;

  // Create a quick pop sound: short burst of noise with quick decay
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const noiseFilter = ctx.createBiquadFilter();

  // Use a triangle wave with a quick frequency sweep for a "pop" effect
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(2000, now);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

  osc.connect(noiseFilter);
  noiseFilter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.1);
}

export default function QuantitativeNumberGame() {
  const [target, setTarget] = useState<number>(1);
  const [tapCount, setTapCount] = useState(0);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);
  const [balloons, setBalloons] = useState<BalloonSpec[]>([]);
  const prevTapCountRef = useRef<number>(0);

  // Initialize target on mount
  useEffect(() => {
    setTarget(getRandomTarget());
  }, []);

  // Play pop sound when apples turn red (tapCount increases)
  useEffect(() => {
    if (tapCount > prevTapCountRef.current && tapCount <= target) {
      playPopSound();
    }
    prevTapCountRef.current = tapCount;
  }, [tapCount, target]);

  const startNewRound = () => {
    setTarget(prev => getNextTarget(prev));
    setTapCount(0);
    setStatus('playing');
    setConfettiPieces([]);
    setBalloons([]);
  };

  const handleTap = () => {
    if (status !== 'playing') return;

    const nextCount = tapCount + 1;
    setTapCount(nextCount);

    if (nextCount === target) {
      setTimeout(() => {
        setStatus('success');
        setConfettiPieces(createConfettiPieces());
        setBalloons(createBalloonSpecs());
        playCelebrationSound();
      }, 400);
      setTimeout(startNewRound, 2400);
    } else if (nextCount > target) {
      setStatus('too-many');
      setTimeout(startNewRound, 1000);
    }
  };

  const isSuccess = status === 'success';
  const isTooMany = status === 'too-many';

  return (
    <div className="party-wallpaper relative overflow-hidden min-h-screen flex items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="background-ribbon ribbon-one" />
        <div className="background-ribbon ribbon-two" />
        <div className="background-ribbon ribbon-three" />
        <div className="background-bubble bubble-one" />
        <div className="background-bubble bubble-two" />
        <div className="background-bubble bubble-three" />
      </div>

      <div className="relative w-full max-w-md rounded-3xl bg-amber-50 shadow-2xl px-6 py-8 sm:px-10 sm:py-10">
        {isSuccess && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="success-balloons">
              {balloons.map((balloon, idx) => (
                <span
                  key={`balloon-${idx}`}
                  className="celebration-balloon"
                  style={{
                    left: `${balloon.left}%`,
                    animationDelay: `${balloon.delay}s`,
                    backgroundColor: balloon.color,
                    '--balloon-scale': balloon.scale,
                  } as CSSProperties}
                />
              ))}
            </div>
            {confettiPieces.map((piece, idx) => (
              <span
                key={`confetti-${idx}`}
                className="celebration-confetti"
                style={{
                  left: `${piece.left}%`,
                  animationDelay: `${piece.delay}s`,
                  backgroundColor: piece.color,
                  '--confetti-drift': `${piece.drift}px`,
                  '--confetti-duration': `${piece.duration}s`,
                } as CSSProperties}
              />
            ))}
            <div className="success-starfield">
              {STAR_SPECS.map((star, idx) => (
                <span
                  key={`floating-star-${idx}`}
                  style={{
                    top: `${star.top}%`,
                    left: `${star.left}%`,
                    animationDelay: `${star.delay}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <h1 className="text-center text-3xl sm:text-4xl font-bold text-indigo-700 mb-2 drop-shadow-md">
          Alex&apos;s Number Game
        </h1>
        <p className="text-center text-sm text-gray-600 mb-6">
          Look at the number. Tap the big button the same number of times!
        </p>

        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-indigo-600 text-white text-6xl sm:text-7xl font-extrabold shadow-xl">
            {target}
          </div>

          <div aria-hidden="true" className="flex items-center justify-center gap-3 mt-1">
            {Array.from({ length: target }).map((_, i) => {
              const filled = i < Math.min(tapCount, target);
              return (
                <div
                  key={i}
                  className={`apple-dot ${filled ? 'apple-dot--red' : 'apple-dot--green'}`}
                />
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={handleTap}
          className="w-full py-6 sm:py-7 rounded-full bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white text-2xl sm:text-3xl font-bold shadow-lg active:scale-95 transition-transform touch-manipulation"
        >
          TAP!
        </button>

        <div className="mt-6 h-16 flex flex-col items-center justify-center">
          {isSuccess && (
            <>
              <div className="flex justify-center gap-2 mb-2">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <span
                    key={`star-${idx}`}
                    className="celebration-star text-4xl sm:text-5xl"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                    aria-hidden="true"
                  >
                    ✨
                  </span>
                ))}
              </div>
              <p className="text-green-600 font-semibold text-center text-sm sm:text-base">
                Spectacular! You matched the number perfectly!
              </p>
            </>
          )}
          {isTooMany && (
            <p className="text-red-500 font-semibold text-sm sm:text-base">
              Oops, that was too many taps. Let&apos;s try a new number!
            </p>
          )}
          {!isSuccess && !isTooMany && (
            <p className="text-gray-500 text-xs sm:text-sm text-center">
              For grown-ups: This game helps children to get a sense of the size of the displayed numeral by matching the taps to the number.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


