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

type Point = { x: number; y: number };

/**
 * The shape of a route, kept as points rather than a string so we can both
 * draw it and walk along it. A string would mean parsing our own output back.
 */
type Geometry =
  | { kind: 'quad'; points: Point[] }
  | { kind: 'poly'; points: Point[] };

/** One step along a route: where the creature is, and where it's pointing. */
export interface PathSample {
  x: number;
  y: number;
  /** Heading in degrees. Screen coordinates, so y grows downward. */
  angle: number;
}

/**
 * Builds the route for a variant
 * This function is way too complicated for what it does, but hey, that's webdev in 2024
 *
 * @internal exported for tests, not part of the public API
 */
export const buildGeometry = (
  width: number,
  height: number,
  variant: LineVariant,
  direction: ResolvedDirection
): Geometry => {
  const start: Point = { x: Math.random() * width, y: Math.random() * height };

  switch (variant) {
    case 'worms': {
      // Smooth, organic curves. Very soothing. Very performance-intensive.
      const cp = wobble(400, direction);
      const control: Point = { x: start.x + cp.dx, y: start.y + cp.dy };
      const tail = wobble(400, direction);
      return {
        kind: 'quad',
        points: [start, control, { x: control.x + tail.dx, y: control.y + tail.dy }],
      };
    }

    case 'beetles': {
      // Angular, aggressive paths. For when you're feeling edgy.
      const points = Array.from({ length: 4 }, () => {
        const step = wobble(300, direction);
        return { x: start.x + step.dx, y: start.y + step.dy };
      });
      return { kind: 'poly', points: [start, ...points] };
    }

    case 'ants': {
      // Short, rapid segments. Anxiety-inducing or charming? You decide.
      const points = Array.from({ length: 6 }, () => {
        const step = wobble(150, direction);
        return { x: start.x + step.dx, y: start.y + step.dy };
      });
      return { kind: 'poly', points: [start, ...points] };
    }

    case 'thunder': {
      // Sharp, electric zigzags. Zap zap ⚡
      // Thunder is lopsided on purpose: a wide x stride with a shallow y one.
      const bolt = () =>
        applyDirection((Math.random() - 0.5) * 500, (Math.random() - 0.5) * 100, direction);

      const first = bolt();
      const cp1: Point = { x: start.x + first.dx, y: start.y + first.dy };
      const second = bolt();
      const cp2: Point = { x: cp1.x + second.dx, y: cp1.y + second.dy };
      const tail = wobble(300, direction);
      return {
        kind: 'poly',
        points: [start, cp1, cp2, { x: cp2.x + tail.dx, y: cp2.y + tail.dy }],
      };
    }

    default:
      return { kind: 'poly', points: [start] }; // Unreachable, but TypeScript worries.
  }
};

/** Turns a route back into the `d` attribute the SVG actually wants. */
const toPathData = ({ kind, points }: Geometry): string => {
  const [first, ...rest] = points;
  if (!first) return '';
  if (kind === 'quad' && rest.length === 2) {
    return `M ${first.x} ${first.y} Q ${rest[0].x} ${rest[0].y} ${rest[1].x} ${rest[1].y}`;
  }
  return `M ${first.x} ${first.y} ${rest.map(p => `L ${p.x} ${p.y}`).join(' ')}`;
};

const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/**
 * Stops the emoji spinning like a lawn sprinkler.
 *
 * Angles come out of atan2 wrapped to (-180, 180], so a heading crossing that
 * seam reads as a ~360 degree jump and framer-motion dutifully animates the
 * long way round. Nudging each angle to stay within a half turn of the
 * previous one keeps the rotation continuous.
 *
 * @internal exported for tests, not part of the public API
 */
export const unwrapAngles = (angles: number[]): number[] => {
  const result: number[] = [];
  for (const [index, angle] of angles.entries()) {
    if (index === 0) {
      result.push(angle);
      continue;
    }
    const previous = result[index - 1];
    result.push(angle + Math.round((previous - angle) / 360) * 360);
  }
  return result;
};

/** Position and heading at `t` (0..1) along a quadratic Bezier. */
const sampleQuad = (points: Point[], t: number): PathSample => {
  const [p0, p1, p2] = points;
  const inverse = 1 - t;
  return {
    x: inverse * inverse * p0.x + 2 * inverse * t * p1.x + t * t * p2.x,
    y: inverse * inverse * p0.y + 2 * inverse * t * p1.y + t * t * p2.y,
    // Derivative of the curve gives the tangent, which is the heading.
    angle: toDegrees(
      Math.atan2(
        2 * inverse * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
        2 * inverse * (p1.x - p0.x) + 2 * t * (p2.x - p1.x)
      )
    ),
  };
};

/** Position and heading at `t` (0..1) along a polyline, walking by length. */
const samplePolyline = (points: Point[], t: number): PathSample => {
  const lengths = points
    .slice(1)
    .map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
  const total = lengths.reduce((sum, length) => sum + length, 0);

  // A degenerate route (every point identical) has no direction to speak of.
  if (total === 0) return { x: points[0].x, y: points[0].y, angle: 0 };

  let remaining = t * total;
  for (const [index, length] of lengths.entries()) {
    if (remaining <= length || index === lengths.length - 1) {
      const from = points[index];
      const to = points[index + 1];
      const fraction = length === 0 ? 0 : Math.min(remaining / length, 1);
      return {
        x: from.x + (to.x - from.x) * fraction,
        y: from.y + (to.y - from.y) * fraction,
        angle: toDegrees(Math.atan2(to.y - from.y, to.x - from.x)),
      };
    }
    remaining -= length;
  }

  return { x: points[0].x, y: points[0].y, angle: 0 };
};

/**
 * Walks a route and returns evenly spaced steps along it.
 *
 * @internal exported for tests, not part of the public API
 */
export const sampleGeometry = (geometry: Geometry, count: number): PathSample[] => {
  const sampleAt = geometry.kind === 'quad' ? sampleQuad : samplePolyline;
  const samples = Array.from({ length: count }, (_, index) =>
    sampleAt(geometry.points, count === 1 ? 0 : index / (count - 1))
  );

  const unwrapped = unwrapAngles(samples.map(sample => sample.angle));
  return samples.map((sample, index) => ({ ...sample, angle: unwrapped[index] }));
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

/** The variants that are actual bugs, as opposed to a lightning bolt. */
type CreatureVariant = Exclude<LineVariant, 'thunder'>;

const isCreatureVariant = (variant: LineVariant): variant is CreatureVariant =>
  variant !== 'thunder';

const CREATURE_EMOJI: Record<CreatureVariant, string> = {
  worms: '🐛',
  beetles: '🪲',
  ants: '🐜',
};

/**
 * Emoji don't agree on which way is forward, so each one needs a nudge before
 * we point it along its heading.
 *
 * A heading of 0 degrees means "travelling right". The caterpillar is drawn
 * facing right already, so it needs nothing. The beetle and ant are drawn from
 * above with their heads at the top, i.e. already rotated -90, so they need
 * +90 to line back up. Artwork varies between platforms, so treat these as a
 * good default rather than gospel.
 */
const EMOJI_HEADING_OFFSET: Record<CreatureVariant, number> = {
  worms: 0,
  beetles: 90,
  ants: 90,
};

/** What each creature leaves behind it. */
const TRAIL_KIND: Record<CreatureVariant, 'line' | 'dots'> = {
  worms: 'line',
  beetles: 'dots',
  ants: 'dots',
};

/** Steps sampled per route. Enough for smooth turning without silly array sizes. */
const SAMPLE_COUNT = 24;

/** Every Nth sample becomes a breadcrumb, so dotted trails stay affordable. */
const DOT_STRIDE = 2;

/** Fraction of the cycle spent crawling; the rest is the fade out. */
const TRAVEL = 0.6;

/**
 * Which emoji a creature wears. Fixed by variant: ask for ants, get ants.
 * Thunder never gets one — it is weather, not wildlife.
 */
const resolveEmoji = (variant: LineVariant): string | null =>
  isCreatureVariant(variant) ? CREATURE_EMOJI[variant] : null;

/**
 * The rotation that points a creature along `angle`, once its artwork's own
 * idea of "forward" is accounted for.
 *
 * @internal exported for tests, not part of the public API
 */
export const emojiRotation = (variant: LineVariant, angle: number): number =>
  angle + (isCreatureVariant(variant) ? EMOJI_HEADING_OFFSET[variant] : 0);

/** A route plus the steps along it. */
interface Crawl {
  d: string;
  samples: PathSample[];
}

const generateCrawl = (
  width: number,
  height: number,
  variant: LineVariant,
  direction: ResolvedDirection
): Crawl => {
  const geometry = buildGeometry(width, height, variant, direction);
  return { d: toPathData(geometry), samples: sampleGeometry(geometry, SAMPLE_COUNT) };
};

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
  const [crawl, setCrawl] = useState<Crawl | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // These stay put across re-renders. Rolling them in the render body meant a
  // resize handed every line a new width and duration mid-flight, so the whole
  // background visibly twitched and restarted every time the window moved.
  const { strokeWidth, duration, delay, repeatDelay, emojiSize } = useMemo(
    () => ({
      strokeWidth: Math.random() * (maxStrokeWidth - minStrokeWidth) + minStrokeWidth,
      duration:
        (Math.random() * (maxDuration - minDuration) + minDuration) / resolveSpeed(speed),
      delay: Math.random() * 5,
      repeatDelay: Math.random() * 2,
      emojiSize: 16 + Math.random() * 12,
    }),
    [minStrokeWidth, maxStrokeWidth, minDuration, maxDuration, speed]
  );

  // Resolved once per mount so a 'random' direction doesn't reshuffle on resize.
  const resolvedDirection = useMemo(() => resolveDirection(direction), [direction]);

  // Same deal for the colour: rolling it per render would strobe.
  const paint = useMemo(() => resolvePaint(colors, id), [colors, id]);

  useEffect(() => {
    setCrawl(generateCrawl(width, height, variant, resolvedDirection));
  }, [width, height, variant, resolvedDirection]);

  if (!crawl) return null; // SSR safety. Because server-side rendering hates fun.

  const { d, samples } = crawl;
  const glyph = resolveEmoji(variant);
  const trail = glyph && isCreatureVariant(variant) ? TRAIL_KIND[variant] : 'line';
  const last = samples[samples.length - 1];

  // Breadcrumbs for the variants that leave dots instead of a line.
  const dots = samples.filter((_, index) => index % DOT_STRIDE === 0);

  // The creature walks the route over the first TRAVEL of the cycle, then the
  // whole thing fades. Sharing one duration and one `times` scale is what keeps
  // the emoji glued to the end of its own trail.
  const travelTimes = samples.map((_, index) =>
    samples.length === 1 ? 0 : (index / (samples.length - 1)) * TRAVEL
  );

  // Someone asked the OS to calm down. Draw the squiggles, skip the motion.
  if (prefersReducedMotion) {
    return (
      <>
        {trail === 'dots' ? (
          dots.map((sample, index) => (
            <circle
              key={index}
              cx={sample.x}
              cy={sample.y}
              r={strokeWidth}
              fill={paint.color}
              className={paint.className}
              opacity={0.5}
            />
          ))
        ) : (
          <path
            d={d}
            fill="none"
            stroke={paint.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={paint.className}
            opacity={0.5}
          />
        )}
        {glyph && (
          // Parked at the end of the route, still facing the way it was going.
          <g
            transform={`translate(${last.x} ${last.y}) rotate(${emojiRotation(variant, last.angle)})`}
          >
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={emojiSize}
              opacity={0.5}
            >
              {glyph}
            </text>
          </g>
        )}
      </>
    );
  }

  // No emoji means no creature, so keep the original line animation exactly.
  if (!glyph) {
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
  }

  // Everything below shares one duration and one `times` scale, and rides a
  // linear ease. That's what keeps the emoji pinned to the end of its own
  // trail instead of drifting ahead of it or lagging behind.
  const cycle = { duration, repeat: Infinity, delay, repeatDelay, ease: 'linear' as const };

  return (
    <>
      {trail === 'dots'
        ? dots.map((sample, index) => {
            const fraction = dots.length === 1 ? 0 : index / (dots.length - 1);
            // Each breadcrumb blinks on as the creature reaches it.
            const appearAt = Math.max(fraction * TRAVEL, 0.01);
            return (
              <motion.circle
                key={index}
                cx={sample.x}
                cy={sample.y}
                r={strokeWidth}
                fill={paint.color}
                className={paint.className}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 1, 0] }}
                transition={{
                  ...cycle,
                  times: [0, appearAt, Math.min(appearAt + 0.04, 0.99), 1],
                }}
              />
            );
          })
        : (
            <motion.path
              d={d}
              fill="none"
              stroke={paint.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className={paint.className}
              initial={{ pathLength: 0, opacity: 0 }}
              // Drawn in step with the crawl, so the line is the slime trail.
              animate={{ pathLength: [0, 1, 1], opacity: [1, 1, 0] }}
              transition={{ ...cycle, times: [0, TRAVEL, 1] }}
            />
          )}

      <motion.g
        // The transform values here are load-bearing, not decoration.
        // framer-motion only measures an SVG element (and therefore only ever
        // applies a transform to it) when the initial values already contain a
        // transform prop. With `initial={{ opacity: 0 }}` alone it silently
        // drops the transform, and every creature sits at the SVG origin.
        initial={{
          opacity: 0,
          x: samples[0].x,
          y: samples[0].y,
          rotate: emojiRotation(variant, samples[0].angle),
        }}
        animate={{
          x: [...samples.map(sample => sample.x), last.x],
          y: [...samples.map(sample => sample.y), last.y],
          rotate: [
            ...samples.map(sample => emojiRotation(variant, sample.angle)),
            emojiRotation(variant, last.angle),
          ],
          opacity: [...samples.map((_, index) => (index === 0 ? 0 : 1)), 0],
        }}
        transition={{ ...cycle, times: [...travelTimes, 1] }}
      >
        <text textAnchor="middle" dominantBaseline="central" fontSize={emojiSize}>
          {glyph}
        </text>
      </motion.g>
    </>
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
      // x/y here are the transform, not the x/y attributes in `common` that
      // place the glyph, so the drift is relative and starts at zero. They also
      // have to be present in `initial` or framer-motion never measures the
      // element and throws the transform away entirely.
      initial={{ opacity: 0, x: 0, y: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: [0, placement.dx],
        y: [0, placement.dy],
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
