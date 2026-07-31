import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { SquigglyBackground } from '../src';

/**
 * framer-motion only measures an SVG element, and therefore only ever applies a
 * transform to it, when the initial values already contain a transform prop.
 * With an opacity-only `initial` it drops the transform on the floor and the
 * element never leaves the SVG origin — which looked exactly like "the emoji
 * isn't showing".
 *
 * These render for real and let the animation tick, then assert a transform
 * actually landed on the element.
 */
const settle = async (ms = 220) => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, ms));
  });
};

const transformed = (nodes: Iterable<Element>) =>
  [...nodes].filter(node => ((node as SVGElement).style?.transform ?? '') !== '');

describe('creatures actually move', () => {
  it.each(['worms', 'beetles', 'ants'] as const)(
    'gives every %s emoji a real transform, not the SVG origin',
    async variant => {
      const { container } = render(<SquigglyBackground count={6} variant={variant} />);
      await settle();

      const groups = [...container.querySelectorAll('g')];
      expect(groups).toHaveLength(6);
      expect(transformed(groups)).toHaveLength(6);
    }
  );

  it('positions creatures away from the origin, spread across the viewport', async () => {
    const { container } = render(<SquigglyBackground count={12} variant="ants" />);
    await settle();

    const translations = [...container.querySelectorAll('g')].map(
      group => group.style.transform
    );
    // All twelve stacked at translate(0,0) is the exact failure we're guarding.
    expect(new Set(translations).size).toBeGreaterThan(1);
    for (const transform of translations) {
      expect(transform).toMatch(/translateX\([-\d.]+px\) translateY\([-\d.]+px\)/);
    }
  });

  it('rotates the emoji to face its heading', async () => {
    const { container } = render(<SquigglyBackground count={12} variant="ants" />);
    await settle();

    const rotations = [...container.querySelectorAll('g')]
      .map(group => group.style.transform.match(/rotate\(([-\d.]+)deg\)/)?.[1])
      .filter(Boolean);

    expect(rotations).toHaveLength(12);
    // Different routes head different ways, so the angles must not all match.
    expect(new Set(rotations).size).toBeGreaterThan(1);
  });
});

describe('glyphs actually drift', () => {
  it('applies a drift transform to letters', async () => {
    const { container } = render(<SquigglyBackground count={8} variant="letters" />);
    await settle();

    const glyphs = [...container.querySelectorAll('text')];
    expect(glyphs).toHaveLength(8);
    expect(transformed(glyphs).length).toBeGreaterThan(0);
  });

  it('keeps the x/y attributes as the anchor, so drift stays relative', async () => {
    const { container } = render(<SquigglyBackground count={8} variant="numbers" />);
    await settle();

    for (const glyph of container.querySelectorAll('text')) {
      // The attribute still places the glyph; the transform only nudges it.
      expect(Number(glyph.getAttribute('x'))).toBeGreaterThanOrEqual(0);
      expect(Number(glyph.getAttribute('x'))).toBeLessThanOrEqual(window.innerWidth);
    }
  });
});
