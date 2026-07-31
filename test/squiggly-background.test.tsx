import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { SquigglyBackground } from '../src';

/** Resize the window and let the rAF-throttled handler flush. */
async function resizeTo(width: number, height: number) {
  await act(async () => {
    window.innerWidth = width;
    window.innerHeight = height;
    window.dispatchEvent(new Event('resize'));
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
  });
}

const strokeWidths = (container: HTMLElement) =>
  [...container.querySelectorAll('path')].map(p => p.getAttribute('stroke-width'));

describe('SquigglyBackground', () => {
  it('renders one path per requested line', () => {
    const { container } = render(<SquigglyBackground count={12} />);
    expect(container.querySelectorAll('path')).toHaveLength(12);
  });

  it('sizes the viewBox to the window', async () => {
    const { container } = render(<SquigglyBackground count={2} />);
    await resizeTo(800, 600);
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 800 600');
  });

  it('keeps stroke widths stable across a resize', async () => {
    // Regression: stroke width and duration were rolled in the render body, so
    // every resize handed each line new values and the background twitched.
    const { container } = render(<SquigglyBackground count={20} />);
    const before = strokeWidths(container);

    await resizeTo(640, 480);

    expect(strokeWidths(container)).toEqual(before);
  });

  it('re-rolls stroke widths when the stroke bounds actually change', async () => {
    const { container, rerender } = render(
      <SquigglyBackground count={20} minStrokeWidth={1} maxStrokeWidth={2} />
    );
    const before = strokeWidths(container);

    await act(async () => {
      rerender(<SquigglyBackground count={20} minStrokeWidth={40} maxStrokeWidth={50} />);
    });

    expect(strokeWidths(container)).not.toEqual(before);
    for (const width of strokeWidths(container)) {
      expect(Number(width)).toBeGreaterThanOrEqual(40);
      expect(Number(width)).toBeLessThanOrEqual(50);
    }
  });

  it('honours stroke width bounds', () => {
    const { container } = render(
      <SquigglyBackground count={30} minStrokeWidth={2} maxStrokeWidth={4} />
    );
    for (const width of strokeWidths(container)) {
      expect(Number(width)).toBeGreaterThanOrEqual(2);
      expect(Number(width)).toBeLessThanOrEqual(4);
    }
  });

  it('cycles the supplied colour classes', () => {
    const { container } = render(
      <SquigglyBackground count={4} colors={['text-a', 'text-b']} />
    );
    expect([...container.querySelectorAll('path')].map(p => p.getAttribute('class'))).toEqual([
      'text-a',
      'text-b',
      'text-a',
      'text-b',
    ]);
  });

  it('marks the decorative layer as hidden from assistive tech', () => {
    const { container } = render(<SquigglyBackground count={1} />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.firstElementChild?.className).toContain('pointer-events-none');
  });

  it.each(['worms', 'beetles', 'ants', 'thunder'] as const)(
    'emits a drawable path for the %s variant',
    variant => {
      const { container } = render(<SquigglyBackground count={5} variant={variant} />);
      const paths = [...container.querySelectorAll('path')];
      expect(paths).toHaveLength(5);
      for (const path of paths) {
        expect(path.getAttribute('d')).toMatch(/^M [\d.-]+ [\d.-]+ [QL] /);
      }
    }
  );

  it('removes its resize listener on unmount', () => {
    const { unmount } = render(<SquigglyBackground count={1} />);
    unmount();
    // Would throw "update on an unmounted component" if the listener survived.
    window.dispatchEvent(new Event('resize'));
  });
});
