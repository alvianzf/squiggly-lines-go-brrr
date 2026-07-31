import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SquigglyBackground } from '../src';

/** Coordinates in a path `d` alternate x, y after each command letter. */
function extents(d: string) {
  const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  return {
    x: Math.max(...xs) - Math.min(...xs),
    y: Math.max(...ys) - Math.min(...ys),
  };
}

/** Mean x and y extent across every rendered path. */
function meanExtents(container: HTMLElement) {
  const all = [...container.querySelectorAll('path')].map(p => extents(p.getAttribute('d') ?? ''));
  return {
    x: all.reduce((sum, e) => sum + e.x, 0) / all.length,
    y: all.reduce((sum, e) => sum + e.y, 0) / all.length,
  };
}

describe('direction', () => {
  it('keeps horizontal lines wide and flat', () => {
    const { container } = render(<SquigglyBackground count={60} direction="horizontal" />);
    const mean = meanExtents(container);
    expect(mean.x).toBeGreaterThan(mean.y * 2);
  });

  it('keeps vertical lines tall and narrow', () => {
    const { container } = render(<SquigglyBackground count={60} direction="vertical" />);
    const mean = meanExtents(container);
    expect(mean.y).toBeGreaterThan(mean.x * 2);
  });

  it('balances both axes on the diagonal', () => {
    const { container } = render(<SquigglyBackground count={60} direction="diagonal" />);
    const mean = meanExtents(container);
    expect(mean.x / mean.y).toBeGreaterThan(0.5);
    expect(mean.x / mean.y).toBeLessThan(2);
  });

  it('still draws something for every direction and variant pairing', () => {
    for (const direction of ['horizontal', 'vertical', 'diagonal', 'random', 'default'] as const) {
      for (const variant of ['worms', 'beetles', 'ants', 'thunder'] as const) {
        const { container, unmount } = render(
          <SquigglyBackground count={4} direction={direction} variant={variant} />
        );
        // Beetles and ants leave dots; worms and thunder leave a stroked path.
        const dotted = variant === 'beetles' || variant === 'ants';
        if (dotted) {
          expect(container.querySelectorAll('circle').length).toBeGreaterThan(0);
        } else {
          const paths = [...container.querySelectorAll('path')];
          expect(paths).toHaveLength(4); // Guard against the loop below passing vacuously.
          for (const path of paths) {
            expect(path.getAttribute('d')).toMatch(/^M [\d.-]+ [\d.-]+ [QL] /);
          }
        }
        unmount();
      }
    }
  });
});

describe('glyph variants', () => {
  it('renders digits for the numbers variant', () => {
    const { container } = render(<SquigglyBackground count={20} variant="numbers" />);
    const glyphs = [...container.querySelectorAll('text')];
    expect(glyphs).toHaveLength(20);
    expect(container.querySelectorAll('path')).toHaveLength(0);
    for (const glyph of glyphs) {
      expect(glyph.textContent).toMatch(/^[0-9]$/);
    }
  });

  it('renders letters for the letters variant', () => {
    const { container } = render(<SquigglyBackground count={20} variant="letters" />);
    for (const glyph of container.querySelectorAll('text')) {
      expect(glyph.textContent).toMatch(/^[a-zA-Z]$/);
    }
  });

  it('renders both for the alphanumeric variant', () => {
    const { container } = render(<SquigglyBackground count={30} variant="alphanumeric" />);
    for (const glyph of container.querySelectorAll('text')) {
      expect(glyph.textContent).toMatch(/^[a-zA-Z0-9]$/);
    }
  });

  it('places glyphs inside the viewport', () => {
    const { container } = render(<SquigglyBackground count={30} variant="letters" />);
    for (const glyph of container.querySelectorAll('text')) {
      expect(Number(glyph.getAttribute('x'))).toBeGreaterThanOrEqual(0);
      expect(Number(glyph.getAttribute('x'))).toBeLessThanOrEqual(window.innerWidth);
      expect(Number(glyph.getAttribute('y'))).toBeGreaterThanOrEqual(0);
      expect(Number(glyph.getAttribute('y'))).toBeLessThanOrEqual(window.innerHeight);
    }
  });
});

describe('colors="random"', () => {
  it('paints each line with a literal colour instead of a class', () => {
    const { container } = render(<SquigglyBackground count={20} colors="random" />);
    for (const path of container.querySelectorAll('path')) {
      expect(path.getAttribute('stroke')).toMatch(/^hsla\(/);
      expect(path.getAttribute('class')).toBeNull();
    }
  });

  it('produces more than one colour across the set', () => {
    const { container } = render(<SquigglyBackground count={40} colors="random" />);
    const unique = new Set(
      [...container.querySelectorAll('path')].map(p => p.getAttribute('stroke'))
    );
    expect(unique.size).toBeGreaterThan(1);
  });

  it('works for glyphs too', () => {
    const { container } = render(
      <SquigglyBackground count={10} variant="numbers" colors="random" />
    );
    for (const glyph of container.querySelectorAll('text')) {
      expect(glyph.getAttribute('fill')).toMatch(/^hsla\(/);
    }
  });

  it('still uses currentColor and classes for the array form', () => {
    const { container } = render(<SquigglyBackground count={4} colors={['text-a', 'text-b']} />);
    for (const path of container.querySelectorAll('path')) {
      expect(path.getAttribute('stroke')).toBe('currentColor');
    }
  });
});
