import { describe, it, expect } from 'vitest';
import { isValidISODate } from '../src/utils.js';
import { formatEventsResponse } from '../src/formatters.js';

describe('isValidISODate', () => {
  it('returns true for valid ISO date', () => {
    expect(isValidISODate('2024-01-01T00:00:00.000Z')).toBe(true);
  });

  it('returns false for invalid date', () => {
    expect(isValidISODate('not-a-date')).toBe(false);
  });
});

describe('formatEventsResponse', () => {
  it('formats events response', () => {
    const events = {
      count: 1,
      items: [
        {
          id: 123,
          action_name: 'pushed',
          author: { name: 'Alice' },
          created_at: '2024-01-01T00:00:00Z',
          target_type: 'commit',
          target_title: 'Initial commit',
          push_data: null
        }
      ]
    };

    const formatted = formatEventsResponse(events as any);
    expect(formatted.content[0].text).toBe('Found 1 events');
    const parsed = JSON.parse(formatted.content[1].text);
    expect(parsed[0]).toEqual({
      id: 123,
      action: 'pushed',
      author: 'Alice',
      created_at: '2024-01-01T00:00:00Z',
      target_type: 'commit',
      target_title: 'Initial commit',
      push_data: null
    });
  });
});
