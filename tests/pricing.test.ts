import { describe, it, expect } from 'vitest';
import { estimateCost, formatCost } from '../src/lib/pricing';

describe('pricing', () => {
  it('returns 0 for an empty usage map', () => {
    expect(estimateCost({})).toBe(0);
  });

  it('prices a known model proportionally', () => {
    // opus-4.7 is $30/M; 1M tokens → $30.
    const c = estimateCost({ 'anthropic/claude-opus-4.7': 1_000_000 });
    expect(c).toBeCloseTo(30, 2);
  });

  it('uses the unknown-model fallback', () => {
    const c = estimateCost({ 'mystery/model': 1_000_000 });
    expect(c).toBeCloseTo(5, 2);
  });

  it('sums across multiple models', () => {
    const c = estimateCost({
      'google/gemini-3.1-flash-lite': 1_000_000,   // $0.15
      'anthropic/claude-sonnet-4.6':  1_000_000,   // $6
    });
    expect(c).toBeCloseTo(6.15, 2);
  });

  it('formatCost picks reasonable precision per scale', () => {
    expect(formatCost(0)).toBe('$0');
    expect(formatCost(0.0001)).toBe('$0.0001');
    expect(formatCost(0.5)).toBe('$0.500');
    expect(formatCost(1.234)).toBe('$1.23');
  });
});
