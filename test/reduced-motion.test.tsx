import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

// Pin the preference at the source rather than poking matchMedia, since
// framer-motion caches the media query globally on first read.
vi.mock('framer-motion', async importActual => ({
  ...(await importActual<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));

const { SquigglyBackground } = await import('../src');

describe('SquigglyBackground with prefers-reduced-motion', () => {
  it('still draws the lines', () => {
    const { container } = render(<SquigglyBackground count={8} />);
    expect(container.querySelectorAll('path')).toHaveLength(8);
  });

  it('renders them static instead of animating forever', () => {
    const { container } = render(<SquigglyBackground count={8} />);
    for (const path of container.querySelectorAll('path')) {
      expect(path.getAttribute('opacity')).toBe('0.5');
      // framer-motion drives pathLength through inline style; static paths have none.
      expect(path.getAttribute('style') ?? '').not.toContain('path-length');
    }
  });

  it('parks each creature facing the way it was heading', () => {
    // The static branch writes a plain transform attribute, so unlike the
    // animated path the heading is actually readable here.
    const { container } = render(<SquigglyBackground count={8} variant="ants" />);
    const groups = [...container.querySelectorAll('g')];
    expect(groups).toHaveLength(8);
    for (const group of groups) {
      const transform = group.getAttribute('transform') ?? '';
      expect(transform).toMatch(/^translate\([-\d.]+ [-\d.]+\) rotate\([-\d.]+\)$/);
    }
  });

  it('still leaves a trail of dots for ants', () => {
    const { container } = render(<SquigglyBackground count={4} variant="ants" />);
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(4);
    expect(container.querySelectorAll('path')).toHaveLength(0);
  });
});
