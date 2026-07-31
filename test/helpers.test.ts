import { describe, expect, it } from 'vitest';
import { applyDirection, emojiRotation, resolveSpeed } from '../src/SquigglyBackground';

describe('resolveSpeed', () => {
  it('passes a positive multiplier straight through', () => {
    expect(resolveSpeed(2)).toBe(2);
    expect(resolveSpeed(0.5)).toBe(0.5);
  });

  it('maps the presets, fastest to slowest', () => {
    expect(resolveSpeed('slow')).toBeLessThan(resolveSpeed('normal'));
    expect(resolveSpeed('normal')).toBeLessThan(resolveSpeed('fast'));
    expect(resolveSpeed('fast')).toBeLessThan(resolveSpeed('ludicrous'));
    expect(resolveSpeed('normal')).toBe(1);
  });

  it('refuses values that would produce a broken duration', () => {
    // duration = range / speed, so 0 would be Infinity and a negative would run backwards.
    expect(resolveSpeed(0)).toBe(1);
    expect(resolveSpeed(-3)).toBe(1);
    expect(resolveSpeed(Number.POSITIVE_INFINITY)).toBe(1);
    expect(resolveSpeed(Number.NaN)).toBe(1);
    expect(resolveSpeed('turbo' as never)).toBe(1);
  });
});

describe('applyDirection', () => {
  it('flattens the vertical axis when going horizontal', () => {
    const { dx, dy } = applyDirection(100, 100, 'horizontal');
    expect(dx).toBe(100);
    expect(Math.abs(dy)).toBeLessThan(Math.abs(dx));
  });

  it('flattens the horizontal axis when going vertical', () => {
    const { dx, dy } = applyDirection(100, 100, 'vertical');
    expect(dy).toBe(100);
    expect(Math.abs(dx)).toBeLessThan(Math.abs(dy));
  });

  it('locks both axes to equal magnitude on the diagonal', () => {
    const { dx, dy } = applyDirection(200, 40, 'diagonal');
    expect(Math.abs(dx)).toBeCloseTo(Math.abs(dy));
  });

  it('keeps each sign so all four diagonals are reachable', () => {
    expect(applyDirection(50, -50, 'diagonal')).toEqual({ dx: 50, dy: -50 });
    expect(applyDirection(-50, 50, 'diagonal')).toEqual({ dx: -50, dy: 50 });
  });

  it('leaves the original free-for-all untouched', () => {
    expect(applyDirection(37, -12, 'default')).toEqual({ dx: 37, dy: -12 });
  });
});

describe('emojiRotation', () => {
  it('points the worm straight along its heading', () => {
    // 🐛 is drawn facing right, which is already heading 0.
    expect(emojiRotation('worms', 0)).toBe(0);
    expect(emojiRotation('worms', 90)).toBe(90);
    expect(emojiRotation('worms', -45)).toBe(-45);
  });

  it('turns the head-up creatures a quarter turn to match', () => {
    // 🪲 and 🐜 are drawn from above with their heads at the top, i.e. already
    // rotated -90, so heading right (0) needs +90 to line them back up.
    expect(emojiRotation('beetles', 0)).toBe(90);
    expect(emojiRotation('ants', 0)).toBe(90);
    expect(emojiRotation('ants', 90)).toBe(180);
  });

  it('keeps the offset constant, so turning is one-to-one with heading', () => {
    for (const variant of ['worms', 'beetles', 'ants'] as const) {
      const delta = emojiRotation(variant, 130) - emojiRotation(variant, 40);
      expect(delta).toBe(90);
    }
  });

  it('leaves thunder unrotated, since it wears no emoji', () => {
    expect(emojiRotation('thunder', 37)).toBe(37);
  });
});
