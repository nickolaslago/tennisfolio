/// <reference types="jest" />
import { maskIsoDate } from './date-mask';

describe('maskIsoDate', () => {
  it('inserts dashes at the YYYY-MM-DD boundaries as digits are typed', () => {
    expect(maskIsoDate('2')).toBe('2');
    expect(maskIsoDate('2024')).toBe('2024');
    expect(maskIsoDate('20240')).toBe('2024-0');
    expect(maskIsoDate('202403')).toBe('2024-03');
    expect(maskIsoDate('2024031')).toBe('2024-03-1');
    expect(maskIsoDate('20240315')).toBe('2024-03-15');
  });

  it('strips non-digit characters, including ones it inserted itself', () => {
    expect(maskIsoDate('2024-03-15')).toBe('2024-03-15');
  });

  it('ignores more than 8 digits', () => {
    expect(maskIsoDate('202403159999')).toBe('2024-03-15');
  });
});
