import { describe, expect, it } from 'vitest';
import { sampleGeometry, unwrapAngles } from '../src/SquigglyBackground';

const poly = (points: Array<[number, number]>) => ({
  kind: 'poly' as const,
  points: points.map(([x, y]) => ({ x, y })),
});

const quad = (points: Array<[number, number]>) => ({
  kind: 'quad' as const,
  points: points.map(([x, y]) => ({ x, y })),
});

describe('sampleGeometry: polylines', () => {
  it('reports 0 degrees when travelling right', () => {
    const samples = sampleGeometry(poly([[0, 0], [100, 0]]), 5);
    for (const sample of samples) expect(sample.angle).toBeCloseTo(0);
  });

  it('reports 90 degrees when travelling down the screen', () => {
    // y grows downward in screen coordinates, so "down" is +90, not -90.
    const samples = sampleGeometry(poly([[0, 0], [0, 100]]), 5);
    for (const sample of samples) expect(sample.angle).toBeCloseTo(90);
  });

  it('reports 180 degrees when travelling left', () => {
    const samples = sampleGeometry(poly([[100, 0], [0, 0]]), 5);
    for (const sample of samples) expect(Math.abs(sample.angle)).toBeCloseTo(180);
  });

  it('walks from the first point to the last', () => {
    const samples = sampleGeometry(poly([[0, 0], [100, 50]]), 5);
    expect(samples[0]).toMatchObject({ x: 0, y: 0 });
    expect(samples[samples.length - 1].x).toBeCloseTo(100);
    expect(samples[samples.length - 1].y).toBeCloseTo(50);
  });

  it('spaces samples evenly by length, not by vertex', () => {
    // Two segments of wildly different length: sampling by vertex would bunch
    // half the steps into the short one.
    const samples = sampleGeometry(poly([[0, 0], [10, 0], [1000, 0]]), 11);
    const midpoint = samples[5];
    expect(midpoint.x).toBeGreaterThan(400);
    expect(midpoint.x).toBeLessThan(600);
  });

  it('turns the corner rather than averaging through it', () => {
    const samples = sampleGeometry(poly([[0, 0], [100, 0], [100, 100]]), 9);
    expect(samples[0].angle).toBeCloseTo(0);
    expect(samples[samples.length - 1].angle).toBeCloseTo(90);
  });

  it('survives a route that never moves', () => {
    const samples = sampleGeometry(poly([[5, 5], [5, 5]]), 4);
    expect(samples).toHaveLength(4);
    for (const sample of samples) {
      expect(Number.isFinite(sample.angle)).toBe(true);
      expect(sample).toMatchObject({ x: 5, y: 5 });
    }
  });
});

describe('sampleGeometry: curves', () => {
  it('starts and ends on the curve endpoints', () => {
    const samples = sampleGeometry(quad([[0, 0], [50, 100], [100, 0]]), 9);
    expect(samples[0]).toMatchObject({ x: 0, y: 0 });
    expect(samples[samples.length - 1]).toMatchObject({ x: 100, y: 0 });
  });

  it('follows the tangent, so a symmetric arc mirrors its heading', () => {
    const samples = sampleGeometry(quad([[0, 0], [50, 100], [100, 0]]), 9);
    // Heading downward on the way out, upward on the way back.
    expect(samples[0].angle).toBeGreaterThan(0);
    expect(samples[samples.length - 1].angle).toBeLessThan(0);
    expect(samples[0].angle).toBeCloseTo(-samples[samples.length - 1].angle);
  });

  it('produces a finite heading at every step', () => {
    const samples = sampleGeometry(quad([[0, 0], [200, 30], [400, 400]]), 24);
    expect(samples).toHaveLength(24);
    for (const sample of samples) expect(Number.isFinite(sample.angle)).toBe(true);
  });
});

describe('unwrapAngles', () => {
  it('leaves a continuous run alone', () => {
    expect(unwrapAngles([0, 45, 90])).toEqual([0, 45, 90]);
  });

  it('carries past the -180/180 seam instead of spinning back', () => {
    // Naively this is a 340 degree jump; it should read as 20 degrees forward.
    expect(unwrapAngles([170, -170])).toEqual([170, 190]);
  });

  it('handles repeated crossings in both directions', () => {
    expect(unwrapAngles([-170, 170])).toEqual([-170, -190]);
    expect(unwrapAngles([170, -170, 170])).toEqual([170, 190, 170]);
  });

  it('never introduces a step larger than half a turn', () => {
    const unwrapped = unwrapAngles([0, 179, -179, 5, -175]);
    for (let i = 1; i < unwrapped.length; i++) {
      expect(Math.abs(unwrapped[i] - unwrapped[i - 1])).toBeLessThanOrEqual(180);
    }
  });
});
