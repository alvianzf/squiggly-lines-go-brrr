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
});
