import { describe, expect, it } from 'vitest';

import { getErrorMessage } from '../utils/getErrorMessage';

describe('getErrorMessage', () => {
  it('returns string messages from error-like objects', () => {
    expect(getErrorMessage({ message: 'boom' })).toBe('boom');
  });

  it('stringifies primitive message values', () => {
    expect(getErrorMessage({ message: 42 })).toBe('42');
    expect(getErrorMessage({ message: false })).toBe('false');
    expect(getErrorMessage({ message: 10n })).toBe('10');
  });

  it('returns Error when message is nullish', () => {
    expect(getErrorMessage({ message: null })).toBe('Error');
    expect(getErrorMessage({ message: undefined })).toBe('Error');
  });

  it('stringifies serializable nested messages', () => {
    expect(getErrorMessage({ message: { code: 500, detail: 'bad' } })).toBe(
      JSON.stringify({ code: 500, detail: 'bad' })
    );
  });

  it('falls back to Error when nested message cannot be stringified', () => {
    const circular: { message?: unknown; self?: unknown } = { message: {} };
    circular.message = circular;
    circular.self = circular;

    expect(getErrorMessage(circular)).toBe('Error');
  });

  it('handles non-object inputs consistently', () => {
    expect(getErrorMessage('plain')).toBe('plain');
    expect(getErrorMessage(null)).toBe('Error');
    expect(getErrorMessage(undefined)).toBe('Error');
    expect(getErrorMessage(true)).toBe('true');
    expect(getErrorMessage(7n)).toBe('7');
    expect(getErrorMessage({ code: 1 })).toBe(JSON.stringify({ code: 1 }));
  });

  it('returns Error when a non-message value cannot be stringified', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;

    expect(getErrorMessage(circular)).toBe('Error');
  });
});
