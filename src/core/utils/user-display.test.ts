import { describe, expect, it } from 'vitest';
import { getUserName, getUserOptionLabel } from './user-display';

describe('getUserOptionLabel', () => {
  it('shows the person name and the username', () => {
    expect(
      getUserOptionLabel({ username: 'bokonkwo', display: 'bokonkwo', person: { display: 'Betty Okonkwo' } }),
    ).toBe('Betty Okonkwo (bokonkwo)');
  });

  it('shows only the username when there is no person name', () => {
    expect(getUserOptionLabel({ username: 'bokonkwo', display: 'bokonkwo' })).toBe('bokonkwo');
  });

  it('shows only the name when there is no username', () => {
    expect(getUserOptionLabel({ person: { display: 'Other' } })).toBe('Other');
  });

  it('returns an empty string for a missing user', () => {
    expect(getUserOptionLabel(null)).toBe('');
    expect(getUserName(undefined)).toBe('');
  });

  it('falls back to display as the identifier when there is no username', () => {
    expect(getUserOptionLabel({ display: '1', person: { display: 'Super User' } })).toBe('Super User (1)');
  });
});
