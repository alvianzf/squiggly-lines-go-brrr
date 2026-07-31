import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SquigglyBackground } from '../src';

const texts = (container: HTMLElement) =>
  [...container.querySelectorAll('text')].map(node => node.textContent);

describe('creature emoji', () => {
  it.each([
    ['worms', '🐛'],
    ['beetles', '🪲'],
    ['ants', '🐜'],
  ] as const)('gives the %s variant its own emoji, one per line', (variant, emoji) => {
    const { container } = render(<SquigglyBackground count={6} variant={variant} />);
    expect(texts(container)).toEqual(Array(6).fill(emoji));
  });

  it('is fixed by variant, so asking for ants gets ants', () => {
    const { container } = render(<SquigglyBackground count={3} variant="ants" />);
    for (const glyph of texts(container)) expect(glyph).toBe('🐜');
  });

  it('leaves thunder alone, because weather is not wildlife', () => {
    const { container } = render(<SquigglyBackground count={5} variant="thunder" />);
    expect(container.querySelectorAll('text')).toHaveLength(0);
    expect(container.querySelectorAll('path')).toHaveLength(5);
  });
});

describe('trails', () => {
  it('gives worms a stroked line to slime along', () => {
    const { container } = render(<SquigglyBackground count={4} variant="worms" />);
    expect(container.querySelectorAll('path')).toHaveLength(4);
    expect(container.querySelectorAll('circle')).toHaveLength(0);
  });

  it.each(['beetles', 'ants'] as const)('gives %s a trail of dots, not a line', variant => {
    const { container } = render(<SquigglyBackground count={4} variant={variant} />);
    expect(container.querySelectorAll('path')).toHaveLength(0);
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(4);
  });

  it('spreads the dots along the route rather than stacking them', () => {
    const { container } = render(<SquigglyBackground count={1} variant="ants" />);
    const positions = [...container.querySelectorAll('circle')].map(
      circle => `${circle.getAttribute('cx')},${circle.getAttribute('cy')}`
    );
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  it('paints dots with the colour the caller asked for', () => {
    const { container } = render(
      <SquigglyBackground count={3} variant="beetles" colors="random" />
    );
    for (const circle of container.querySelectorAll('circle')) {
      expect(circle.getAttribute('fill')).toMatch(/^hsla\(/);
    }
  });
});

describe('emoji orientation', () => {
  // Under animation the heading lives in framer-motion's keyframes, which jsdom
  // never applies to the DOM. The rotation maths is unit-tested in
  // helpers.test.ts, and the static heading is asserted in reduced-motion.test.tsx.
  it('mounts each creature inside its own transform group', () => {
    const { container } = render(<SquigglyBackground count={7} variant="ants" />);
    const groups = [...container.querySelectorAll('g')];
    expect(groups).toHaveLength(7);
    for (const group of groups) {
      // fill-box is what keeps the spin centred on the emoji rather than the
      // SVG origin, which would sling it off-screen.
      expect(group.style.transformBox).toBe('fill-box');
      expect(group.querySelector('text')?.textContent).toBe('🐜');
    }
  });
});
