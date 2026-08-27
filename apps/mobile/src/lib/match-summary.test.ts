/// <reference types="jest" />
import { InvalidScoreError } from '@tennisfolio/core';

import { summarizeMatch } from './match-summary';

// These tests double as proof that the `@tennisfolio/core` workspace package
// resolves and runs from the mobile app's own toolchain (jest-expo), not just
// from Metro. The exhaustive scoring rules are covered by core's own suite.
describe('summarizeMatch', () => {
  it('derives the result of a super-tiebreak decider from the shared parser', () => {
    const summary = summarizeMatch('6-4 3-6 10-7');

    expect(summary.result).toBe('Win');
    expect(summary.setsWon).toBe(2);
    expect(summary.setsLost).toBe(1);
    expect(summary.normalized).toBe('6-4 3-6 10-7');
    expect(summary.sets).toHaveLength(3);
    expect(summary.sets[2].tiebreak).toBe(true);
  });

  it('surfaces the core validation error for an impossible score', () => {
    expect(() => summarizeMatch('6-6')).toThrow(InvalidScoreError);
  });
});
