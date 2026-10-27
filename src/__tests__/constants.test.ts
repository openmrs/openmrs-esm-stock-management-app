import { describe, expect, it } from 'vitest';
import { extractErrorMessagesFromResponse } from '../constants';

describe('extractErrorMessagesFromResponse', () => {
  it('extracts the server error message from the response body', () => {
    const error = { responseBody: { error: { message: 'Stock operation requires a destination' } } };
    expect(extractErrorMessagesFromResponse(error)).toEqual(['Stock operation requires a destination']);
  });

  it('never returns a null or blank message when the server sends one', () => {
    expect(extractErrorMessagesFromResponse({ responseBody: { error: { message: null } } })).not.toContain(null);
    expect(extractErrorMessagesFromResponse({ responseBody: { error: { message: '' } } })[0].trim()).not.toBe('');
    expect(extractErrorMessagesFromResponse({})).not.toContain(undefined);
    expect(extractErrorMessagesFromResponse(null)[0].trim()).not.toBe('');
  });

  it('extracts field errors when present', () => {
    const error = {
      responseBody: {
        error: {
          message: 'Validation failed',
          fieldErrors: { sourceUuid: [{ message: 'Source is required' }] },
        },
      },
    };
    expect(extractErrorMessagesFromResponse(error)).toEqual(['Source is required']);
  });

  it('falls back when field errors contain only blank messages', () => {
    const error = {
      responseBody: { error: { fieldErrors: { sourceUuid: [{ message: null }] } } },
    };
    const messages = extractErrorMessagesFromResponse(error);
    expect(messages).toHaveLength(1);
    expect(messages[0].trim()).not.toBe('');
  });

  it('uses an action-neutral fallback by default and honors a caller-supplied one', () => {
    expect(extractErrorMessagesFromResponse({})[0]).not.toContain('saving');
    expect(extractErrorMessagesFromResponse(null, 'Could not print the document')[0]).toBe(
      'Could not print the document',
    );
    expect(
      extractErrorMessagesFromResponse(
        { responseBody: { error: { fieldErrors: { batchNo: [{ message: '' }] } } } },
        'Could not delete the reference',
      )[0],
    ).toBe('Could not delete the reference');
  });
});
