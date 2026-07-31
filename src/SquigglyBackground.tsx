"use client"; // Because Next.js gets upset if we don't tell it this is client-side. Shocking, I know.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Animation variant types
 * Because yes, we needed FOUR different ways to draw squiggly lines
 */
export type AnimationVariant = 'worms' | 'beetles' | 'ants' | 'thunder';

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
   */
  colors?: string[];

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
   */
  variant?: AnimationVariant;

  /**
   * Additional CSS classes because of course you want more control
   */
  className?: string;

  /**
   * Background color. Default uses CSS variables because we're fancy like that.
   */
  backgroundColor?: string;
}

/**
 * Generates a path based on the selected variant
 * This function is way too complicated for what it does, but hey, that's webdev in 2024
 */
const generatePath = (
  width: number,
  height: number,
  variant: AnimationVariant
): string => {
  const startX = Math.random() * width;
  const startY = Math.random() * height;

  switch (variant) {
    case 'worms': {
      // Smooth, organic curves. Very soothing. Very performance-intensive.
      const cp1X = startX + (Math.random() - 0.5) * 400;
      const cp1Y = startY + (Math.random() - 0.5) * 400;
      const endX = cp1X + (Math.random() - 0.5) * 400;
      const endY = cp1Y + (Math.random() - 0.5) * 400;
      return `M ${startX} ${startY} Q ${cp1X} ${cp1Y} ${endX} ${endY}`;
    }

    case 'beetles': {
      // Angular, aggressive paths. For when you're feeling edgy.
      const points = Array.from({ length: 4 }, () => ({
        x: startX + (Math.random() - 0.5) * 300,
        y: startY + (Math.random() - 0.5) * 300,
      }));
      return `M ${startX} ${startY} ${points.map(p => `L ${p.x} ${p.y}`).join(' ')}`;
    }

    case 'ants': {
      // Short, rapid segments. Anxiety-inducing or charming? You decide.
      const segments = Array.from({ length: 6 }, () => ({
        x: startX + (Math.random() - 0.5) * 150,
        y: startY + (Math.random() - 0.5) * 150,
      }));
      return `M ${startX} ${startY} ${segments.map(s => `L ${s.x} ${s.y}`).join(' ')}`;
    }

    case 'thunder': {
      // Sharp, electric zigzags. Zap zap ⚡
      const cp1X = startX + (Math.random() - 0.5) * 500;
      const cp1Y = startY + (Math.random() - 0.5) * 100;
      const cp2X = cp1X + (Math.random() - 0.5) * 500;
      const cp2Y = cp1Y + (Math.random() - 0.5) * 100;
      const endX = cp2X + (Math.random() - 0.5) * 300;
      const endY = cp2Y + (Math.random() - 0.5) * 300;
      return `M ${startX} ${startY} L ${cp1X} ${cp1Y} L ${cp2X} ${cp2Y} L ${endX} ${endY}`;
    }

    default:
      return ''; // TypeScript made us do this even though it's impossible to reach
  }
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
}: {
  width: number;
  height: number;
  id: number;
  colors: string[];
  minStrokeWidth: number;
  maxStrokeWidth: number;
  minDuration: number;
  maxDuration: number;
  variant: AnimationVariant;
}) => {
  const [d, setD] = useState('');

  useEffect(() => {
    setD(generatePath(width, height, variant));
  }, [width, height, id, variant]);

  if (!d) return null; // SSR safety. Because server-side rendering hates fun.

  const randomColor = colors[id % colors.length];
  const strokeWidth = Math.random() * (maxStrokeWidth - minStrokeWidth) + minStrokeWidth;
  const duration = Math.random() * (maxDuration - minDuration) + minDuration;

  return (
    <motion.path
      d={d}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={randomColor}
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
        delay: Math.random() * 5,
        repeatDelay: Math.random() * 2,
      }}
    />
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
  className = '',
  backgroundColor = 'var(--bg-primary)',
}: SquigglyBackgroundProps) {
  const [dimensions, setDimensions] = useState({ width: 1000, height: 1000 });

  useEffect(() => {
    // Check if window exists because SSR is a thing and it gets cranky
    if (typeof window === 'undefined') return;

    setDimensions({ width: window.innerWidth, height: window.innerHeight });

    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
        {Array.from({ length: count }).map((_, i) => (
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
          />
        ))}
      </svg>
    </div>
  );
}
