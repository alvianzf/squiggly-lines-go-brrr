"use client"; // Because Next.js gets upset if we don't tell it this is client-side. Shocking, I know.

import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Variants that draw actual squiggly lines
 * Because yes, we needed FOUR different ways to draw squiggly lines
 */
export type LineVariant = 'worms' | 'beetles' | 'ants' | 'thunder';

/**
 * Variants that scatter random characters around instead of lines
 * For when squiggles aren't cryptic enough
 */
export type GlyphVariant = 'letters' | 'numbers' | 'alphanumeric';

/**
 * Animation variant types
 * Now SEVEN ways to make your GPU regret this decision
 */
export type AnimationVariant = LineVariant | GlyphVariant;

/**
 * Which way the chaos travels
 * - horizontal: side to side, y barely moves
 * - vertical: up and down, x barely moves
 * - diagonal: 45 degrees, like a very determined crab
 * - random: each line picks its own from the three above
 * - default: unconstrained, the original free-for-all
 */
export type Direction = 'horizontal' | 'vertical' | 'diagonal' | 'random' | 'default';

/**
 * Named speeds, for people who don't want to think in multipliers
 */
export type SpeedPreset = 'slow' | 'normal' | 'fast' | 'ludicrous';

/**
 * Props for the most overengineered background component you'll ever use
 */
export interface SquigglyBackgroundProps {
  /**
   * How many lines to render. Default is 50 because why not tank your FPS?
   */
  count?: number;

  /**
   * Array of CSS color class names. Defaults to Tailwind classes, but any CSS classes that set `color` will work.
   * The component uses `stroke="currentColor"` so it inherits from text color.
   * Examples: ['text-purple-500/30', 'my-custom-color-class']
   *
   * Pass the string `'random'` to skip picking colors entirely and let every
   * line roll its own hue on each mount. No Tailwind required in that mode,
   * since the color is written straight to the element.
   */
  colors?: string[] | 'random';

  /**
   * Minimum stroke width in pixels. For when you want your lines to be barely visible.
   */
  minStrokeWidth?: number;

  /**
   * Maximum stroke width in pixels. Go wild. Make them THICC.
   */
  maxStrokeWidth?: number;

  /**
   * Minimum animation duration in seconds. Faster = more chaotic energy.
   */
  minDuration?: number;

  /**
   * Maximum animation duration in seconds. Slower = more "zen". Or boring. Your call.
   */
  maxDuration?: number;

  /**
   * Animation variant. Choose your poison:
   * - worms: Smooth curves (the original)
   * - beetles: Spiky, angular chaos
   * - ants: Short, frantic segments
   * - thunder: Sharp, electric zigzags
   * - letters: Random drifting letters
   * - numbers: Random drifting digits
   * - alphanumeric: Both, for maximum confusion
   */
  variant?: AnimationVariant;

  /**
   * Which way things travel. Applies to the line variants and to the drift of
   * the glyph variants. Defaults to 'default', i.e. the original free-for-all.
   */
  direction?: Direction;

  /**
   * Speed control layered on top of minDuration/maxDuration. Pass a multiplier
   * (2 = twice as fast, 0.5 = half speed) or a preset name. Zero and negative
   * numbers are ignored, because dividing by zero is not a speed.
   */
  speed?: number | SpeedPreset;

  /**
   * Additional CSS classes because of course you want more control
   */
  className?: string;

  /**
   * Background color. Default uses CSS variables because we're fancy like that.
   */
  backgroundColor?: string;
}

/** Everything except 'random', which is resolved per line before it gets used. */
type ResolvedDirection = Exclude<Direction, 'random'>;

/** What 'random' picks from. 'default' is excluded — it means "no direction". */
const PICKABLE_DIRECTIONS: ResolvedDirection[] = ['horizontal', 'vertical', 'diagonal'];

const GLYPH_VARIANTS: GlyphVariant[] = ['letters', 'numbers', 'alphanumeric'];

const CHARSETS: Record<GlyphVariant, string> = {
  letters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  alphanumeric: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
};

/** Preset name -> multiplier. Same knob the number form turns. */
const SPEED_PRESETS: Record<SpeedPreset, number> = {
  slow: 0.5,
  normal: 1,
  fast: 2.5,
  ludicrous: 6,
};

const isGlyphVariant = (variant: AnimationVariant): variant is GlyphVariant =>
  (GLYPH_VARIANTS as string[]).includes(variant);

/**
 * Turns the speed prop into a plain multiplier. Anything nonsensical (zero,
 * negative, an unknown preset) falls back to 1 rather than producing an
 * infinite or negative duration.
 */
/** @internal exported for tests, not part of the public API */
export const resolveSpeed = (speed: number | SpeedPreset): number => {
  if (typeof speed === 'number') return speed > 0 && Number.isFinite(speed) ? speed : 1;
  return SPEED_PRESETS[speed] ?? 1;
};

/** Picks a concrete direction, rolling the dice only for 'random'. */
const resolveDirection = (direction: Direction): ResolvedDirection =>
  direction === 'random'
    ? PICKABLE_DIRECTIONS[Math.floor(Math.random() * PICKABLE_DIRECTIONS.length)]
    : direction;

/**
 * Reweights a raw (dx, dy) wobble so it leans the way the caller asked.
 * Each variant keeps its own character; we just squash one axis or lock them
 * together for diagonals.
 */
/** @internal exported for tests, not part of the public API */
export const applyDirection = (
  dx: number,
  dy: number,
  direction: ResolvedDirection
): { dx: number; dy: number } => {
  switch (direction) {
    case 'horizontal':
      return { dx, dy: dy * 0.15 };

    case 'vertical':
      return { dx: dx * 0.15, dy };

    case 'diagonal': {
      // Equal magnitude on both axes gives a clean 45 degrees; keeping each
      // sign means we still get all four diagonals rather than just one.
      const magnitude = (Math.abs(dx) + Math.abs(dy)) / 2;
      return {
        dx: magnitude * (Math.sign(dx) || 1),
        dy: magnitude * (Math.sign(dy) || 1),
      };
    }

    default:
      return { dx, dy };
  }
};

/** A wobble of up to +/- spread/2 on each axis, already direction-adjusted. */
const wobble = (spread: number, direction: ResolvedDirection) =>
  applyDirection((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, direction);

/**
 * Generates a path based on the selected variant
 * This function is way too complicated for what it does, but hey, that's webdev in 2024
 */
const generatePath = (
  width: number,
  height: number,
  variant: LineVariant,
  direction: ResolvedDirection
): string => {
  const startX = Math.random() * width;
  const startY = Math.random() * height;

  switch (variant) {
    case 'worms': {
      // Smooth, organic curves. Very soothing. Very performance-intensive.
      const cp = wobble(400, direction);
      const cp1X = startX + cp.dx;
      const cp1Y = startY + cp.dy;
      const end = wobble(400, direction);
      const endX = cp1X + end.dx;
      const endY = cp1Y + end.dy;
      return `M ${startX} ${startY} Q ${cp1X} ${cp1Y} ${endX} ${endY}`;
    }

    case 'beetles': {
      // Angular, aggressive paths. For when you're feeling edgy.
      const points = Array.from({ length: 4 }, () => {
        const step = wobble(300, direction);
        return { x: startX + step.dx, y: startY + step.dy };
      });
      return `M ${startX} ${startY} ${points.map(p => `L ${p.x} ${p.y}`).join(' ')}`;
    }

    case 'ants': {
      // Short, rapid segments. Anxiety-inducing or charming? You decide.
      const segments = Array.from({ length: 6 }, () => {
        const step = wobble(150, direction);
        return { x: startX + step.dx, y: startY + step.dy };
      });
      return `M ${startX} ${startY} ${segments.map(s => `L ${s.x} ${s.y}`).join(' ')}`;
    }

    case 'thunder': {
      // Sharp, electric zigzags. Zap zap ⚡
      // Thunder is lopsided on purpose: a wide x stride with a shallow y one.
      const bolt = () => {
        const stride = applyDirection(
          (Math.random() - 0.5) * 500,
          (Math.random() - 0.5) * 100,
          direction
        );
        return stride;
      };
      const cp1 = bolt();
      const cp1X = startX + cp1.dx;
      const cp1Y = startY + cp1.dy;
      const cp2 = bolt();
      const cp2X = cp1X + cp2.dx;
      const cp2Y = cp1Y + cp2.dy;
      const tail = wobble(300, direction);
      const endX = cp2X + tail.dx;
      const endY = cp2Y + tail.dy;
      return `M ${startX} ${startY} L ${cp1X} ${cp1Y} L ${cp2X} ${cp2Y} L ${endX} ${endY}`;
    }

    default:
      return ''; // TypeScript made us do this even though it's impossible to reach
  }
};

/**
 * A random, pleasantly translucent color. Used when colors is 'random', so the
 * component stops depending on Tailwind classes entirely.
 */
const randomColor = (): string => {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70 + Math.random() * 20;
  const lightness = 50 + Math.random() * 15;
  return `hsla(${hue}, ${saturation.toFixed(1)}%, ${lightness.toFixed(1)}%, 0.35)`;
};

/**
 * Works out how a line should be painted: either a CSS class riding on
 * currentColor (the original behaviour) or a literal color when the caller
 * asked for 'random'.
 */
const resolvePaint = (colors: string[] | 'random', id: number) =>
  colors === 'random'
    ? { className: undefined, color: randomColor() }
    : { className: colors[id % colors.length], color: 'currentColor' };

/**
 * Individual animated line component
 * Each one is an independent performance drain... I mean, beautiful animation
 */
const AnimatedLine = ({
  width,
  height,
  id,
  colors,
  minStrokeWidth,
  maxStrokeWidth,
  minDuration,
  maxDuration,
  variant,
  direction,
  speed,
}: {
  width: number;
  height: number;
  id: number;
  colors: string[] | 'random';
  minStrokeWidth: number;
  maxStrokeWidth: number;
  minDuration: number;
  maxDuration: number;
  variant: LineVariant;
  direction: Direction;
  speed: number | SpeedPreset;
}) => {
  const [d, setD] = useState('');
  const prefersReducedMotion = useReducedMotion();

  // These stay put across re-renders. Rolling them in the render body meant a
  // resize handed every line a new width and duration mid-flight, so the whole
  // background visibly twitched and restarted every time the window moved.
  const { strokeWidth, duration, delay, repeatDelay } = useMemo(
    () => ({
      strokeWidth: Math.random() * (maxStrokeWidth - minStrokeWidth) + minStrokeWidth,
      duration:
        (Math.random() * (maxDuration - minDuration) + minDuration) / resolveSpeed(speed),
      delay: Math.random() * 5,
      repeatDelay: Math.random() * 2,
    }),
    [minStrokeWidth, maxStrokeWidth, minDuration, maxDuration, speed]
  );

  // Resolved once per mount so a 'random' direction doesn't reshuffle on resize.
  const resolvedDirection = useMemo(() => resolveDirection(direction), [direction]);

  // Same deal for the colour: rolling it per render would strobe.
  const paint = useMemo(() => resolvePaint(colors, id), [colors, id]);

  useEffect(() => {
    setD(generatePath(width, height, variant, resolvedDirection));
  }, [width, height, variant, resolvedDirection]);

  if (!d) return null; // SSR safety. Because server-side rendering hates fun.

  // Someone asked the OS to calm down. Draw the squiggles, skip the motion.
  if (prefersReducedMotion) {
    return (
      <path
        d={d}
        fill="none"
        stroke={paint.color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={paint.className}
        opacity={0.5}
      />
    );
  }

  return (
    <motion.path
      d={d}
      fill="none"
      stroke={paint.color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={paint.className}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{
        pathLength: [0, 1, 1, 0], // Draw it, admire it, delete it. The circle of life.
        opacity: [0, 1, 0, 0],
        pathOffset: [0, 0, 1, 0],
      }}
      transition={{
        duration,
        repeat: Infinity, // Yes, forever. Your CPU will love this.
        ease: 'easeInOut',
        delay,
        repeatDelay,
      }}
    />
  );
};

/** How far a glyph drifts over its lifetime, before direction weighting. */
const GLYPH_DRIFT = 160;

/**
 * Individual animated character
 * Like AnimatedLine, but it spells nothing and means less
 */
const AnimatedGlyph = ({
  width,
  height,
  id,
  colors,
  minDuration,
  maxDuration,
  variant,
  direction,
  speed,
}: {
  width: number;
  height: number;
  id: number;
  colors: string[] | 'random';
  minDuration: number;
  maxDuration: number;
  variant: GlyphVariant;
  direction: Direction;
  speed: number | SpeedPreset;
}) => {
  const [placed, setPlaced] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const resolvedDirection = useMemo(() => resolveDirection(direction), [direction]);
  const paint = useMemo(() => resolvePaint(colors, id), [colors, id]);

  const { char, fontSize, duration, delay, repeatDelay } = useMemo(() => {
    const charset = CHARSETS[variant];
    return {
      char: charset[Math.floor(Math.random() * charset.length)],
      fontSize: 12 + Math.random() * 24,
      duration:
        (Math.random() * (maxDuration - minDuration) + minDuration) / resolveSpeed(speed),
      delay: Math.random() * 5,
      repeatDelay: Math.random() * 2,
    };
  }, [variant, minDuration, maxDuration, speed]);

  // Position and drift depend on the viewport, so they wait for the client.
  const [placement, setPlacement] = useState({ x: 0, y: 0, dx: 0, dy: 0 });

  useEffect(() => {
    const drift = wobble(GLYPH_DRIFT, resolvedDirection);
    setPlacement({
      x: Math.random() * width,
      y: Math.random() * height,
      dx: drift.dx,
      dy: drift.dy,
    });
    setPlaced(true);
  }, [width, height, resolvedDirection]);

  if (!placed) return null; // Same SSR dance as the lines.

  const common = {
    x: placement.x,
    y: placement.y,
    fill: paint.color,
    className: paint.className,
    fontSize,
    fontFamily: 'monospace',
    textAnchor: 'middle' as const,
  };

  if (prefersReducedMotion) {
    return (
      <text {...common} opacity={0.5}>
        {char}
      </text>
    );
  }

  return (
    <motion.text
      {...common}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: [placement.x, placement.x + placement.dx],
        y: [placement.y, placement.y + placement.dy],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
        repeatDelay,
      }}
    >
      {char}
    </motion.text>
  );
};

/**
 * The main event: Squiggly Lines Go Brrr 🎉
 *
 * A highly customizable animated background that absolutely nobody asked for,
 * but here we are. Your product manager will love it. Your backend team will
 * wonder why the server costs went up.
 *
 * @example
 * ```tsx
 * // Basic usage (boring)
 * <SquigglyBackground />
 *
 * // Actually customized (slightly less boring)
 * <SquigglyBackground
 *   variant="thunder"
 *   count={100}
 *   colors={['text-purple-500/30', 'text-pink-500/30']}
 *   minDuration={3}
 *   maxDuration={8}
 * />
 *
 * // Drifting digits, moving sideways, twice as fast, no Tailwind needed
 * <SquigglyBackground
 *   variant="numbers"
 *   direction="horizontal"
 *   speed="fast"
 *   colors="random"
 * />
 * ```
 */
export default function SquigglyBackground({
  count = 50,
  colors = ['text-red-500/20', 'text-slate-400/30'],
  minStrokeWidth = 1,
  maxStrokeWidth = 3,
  minDuration = 5,
  maxDuration = 10,
  variant = 'worms',
  direction = 'default',
  speed = 1,
  className = '',
  backgroundColor = 'var(--bg-primary)',
}: SquigglyBackgroundProps) {
  const [dimensions, setDimensions] = useState({ width: 1000, height: 1000 });

  useEffect(() => {
    // Check if window exists because SSR is a thing and it gets cranky
    if (typeof window === 'undefined') return;

    // Bail out when nothing actually moved, so a resize that only changes one
    // axis doesn't re-roll every path for nothing.
    const measure = () =>
      setDimensions(prev =>
        prev.width === window.innerWidth && prev.height === window.innerHeight
          ? prev
          : { width: window.innerWidth, height: window.innerHeight }
      );

    measure();

    // Resize fires dozens of times a second while dragging. Coalescing to one
    // update per frame keeps us from regenerating every path on each event.
    let frame = 0;
    const handleResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 -z-10 transition-colors duration-300 overflow-hidden pointer-events-none ${className}`}
      style={{ backgroundColor }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true" // Screen readers, look away. This is purely decorative chaos.
      >
        {Array.from({ length: count }).map((_, i) =>
          isGlyphVariant(variant) ? (
            <AnimatedGlyph
              key={i}
              width={dimensions.width}
              height={dimensions.height}
              id={i}
              colors={colors}
              minDuration={minDuration}
              maxDuration={maxDuration}
              variant={variant}
              direction={direction}
              speed={speed}
            />
          ) : (
            <AnimatedLine
              key={i}
              width={dimensions.width}
              height={dimensions.height}
              id={i}
              colors={colors}
              minStrokeWidth={minStrokeWidth}
              maxStrokeWidth={maxStrokeWidth}
              minDuration={minDuration}
              maxDuration={maxDuration}
              variant={variant}
              direction={direction}
              speed={speed}
            />
          )
        )}
      </svg>
    </div>
  );
}
