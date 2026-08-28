/// <reference types="jest" />
/**
 * These assertions are all "what would Python's `csv` module do?", because the
 * bundle has to be byte-interchangeable with the API's.
 */
import { parseCsvDicts, parseCsvRows, writeCsv } from '@/lib/transfer/csv';

describe('writeCsv', () => {
  it('terminates rows with CRLF, including the last one', () => {
    expect(writeCsv(['a', 'b'], [['1', '2']])).toBe('a,b\r\n1,2\r\n');
  });

  it('leaves empty cells unquoted, so a blank means null', () => {
    expect(writeCsv(['a', 'b'], [['', '']])).toBe('a,b\r\n,\r\n');
  });

  it('quotes only fields that need it (QUOTE_MINIMAL)', () => {
    expect(writeCsv(['a'], [['plain']])).toBe('a\r\nplain\r\n');
    expect(writeCsv(['a'], [['has,comma']])).toBe('a\r\n"has,comma"\r\n');
    expect(writeCsv(['a'], [['has\nnewline']])).toBe('a\r\n"has\nnewline"\r\n');
  });

  it('escapes a double quote by doubling it', () => {
    expect(writeCsv(['a'], [['say "hi"']])).toBe('a\r\n"say ""hi"""\r\n');
  });

  it('writes a header-only file when there are no rows', () => {
    expect(writeCsv(['a', 'b'], [])).toBe('a,b\r\n');
  });
});

describe('parseCsvRows', () => {
  it('reads CRLF, LF and lone-CR line endings alike', () => {
    expect(parseCsvRows('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    expect(parseCsvRows('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    expect(parseCsvRows('a,b\r1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('does not invent a trailing row after the final newline', () => {
    expect(parseCsvRows('a\r\n')).toEqual([['a']]);
  });

  it('reads a final row that has no newline after it', () => {
    expect(parseCsvRows('a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('unquotes fields and un-doubles escaped quotes', () => {
    expect(parseCsvRows('"has,comma","say ""hi"""')).toEqual([['has,comma', 'say "hi"']]);
  });

  it('keeps newlines that are inside a quoted field', () => {
    expect(parseCsvRows('"line1\nline2",b')).toEqual([['line1\nline2', 'b']]);
  });

  it('returns nothing for empty input', () => {
    expect(parseCsvRows('')).toEqual([]);
  });
});

describe('parseCsvDicts', () => {
  it('keys each row by the header', () => {
    expect(parseCsvDicts('a,b\r\n1,2\r\n')).toEqual([{ a: '1', b: '2' }]);
  });

  it('fills missing trailing cells with empty strings', () => {
    expect(parseCsvDicts('a,b,c\r\n1\r\n')).toEqual([{ a: '1', b: '', c: '' }]);
  });

  it('drops fields beyond the header', () => {
    expect(parseCsvDicts('a\r\n1,extra\r\n')).toEqual([{ a: '1' }]);
  });

  it('skips blank lines', () => {
    expect(parseCsvDicts('a,b\r\n1,2\r\n\r\n')).toEqual([{ a: '1', b: '2' }]);
  });

  it('returns nothing for a header-only file', () => {
    expect(parseCsvDicts('a,b\r\n')).toEqual([]);
  });
});

describe('write then read', () => {
  it('round-trips every awkward field verbatim', () => {
    const rows = [
      ['plain', 'has,comma', 'say "hi"'],
      ['', 'multi\nline', 'trailing space '],
    ];
    expect(parseCsvRows(writeCsv(['a', 'b', 'c'], rows)).slice(1)).toEqual(rows);
  });
});
