import { describe, it, expect } from 'vitest';
import {
  calculateCommission,
  formatCurrency,
  formatPercent,
  getMissingTransactionFields,
  getMissingLeadFields,
  getLeadSummary,
  generateICS,
  DEFAULT_PREFERENCES,
} from './utils';
import type { Transaction } from './types';

// --- Commission Math ---

describe('calculateCommission', () => {
  const baseTransaction = {
    price: 1_000_000,
    grossCommissionPercent: 3,
    treySplitPercent: 60,
    kirkSplitPercent: 40,
    treyLaoPercent: 35,
    kirkLaoPercent: 30,
  };

  it('calculates gross commission correctly', () => {
    const result = calculateCommission(baseTransaction);
    expect(result.grossCommission).toBe(30_000); // 3% of 1M
  });

  it('calculates agent gross cuts correctly', () => {
    const result = calculateCommission(baseTransaction);
    expect(result.treyGrossCut).toBe(18_000); // 60% of 30k
    expect(result.kirkGrossCut).toBe(12_000); // 40% of 30k
  });

  it('calculates LAO cuts correctly', () => {
    const result = calculateCommission(baseTransaction);
    expect(result.laoFromTrey).toBe(6_300); // 35% of 18k
    expect(result.laoFromKirk).toBe(3_600); // 30% of 12k
    expect(result.laoTotal).toBe(9_900);
  });

  it('calculates net agent take correctly', () => {
    const result = calculateCommission(baseTransaction);
    expect(result.treyNet).toBe(11_700); // 18k - 6.3k
    expect(result.kirkNet).toBe(8_400); // 12k - 3.6k
  });

  it('provides legacy aliases', () => {
    const result = calculateCommission(baseTransaction);
    expect(result.treyTake).toBe(result.treyNet);
    expect(result.kirkTake).toBe(result.kirkNet);
  });

  it('handles zero price', () => {
    const result = calculateCommission({ ...baseTransaction, price: 0 });
    expect(result.grossCommission).toBe(0);
    expect(result.treyNet).toBe(0);
    expect(result.kirkNet).toBe(0);
    expect(result.laoTotal).toBe(0);
  });

  it('handles zero commission percent', () => {
    const result = calculateCommission({ ...baseTransaction, grossCommissionPercent: 0 });
    expect(result.grossCommission).toBe(0);
  });

  it('handles 100% split to one agent', () => {
    const result = calculateCommission({
      ...baseTransaction,
      treySplitPercent: 100,
      kirkSplitPercent: 0,
    });
    expect(result.treyGrossCut).toBe(30_000);
    expect(result.kirkGrossCut).toBe(0);
  });

  it('handles large deal values', () => {
    const result = calculateCommission({
      ...baseTransaction,
      price: 50_000_000,
    });
    expect(result.grossCommission).toBe(1_500_000);
    expect(result.treyGrossCut).toBe(900_000);
    expect(result.kirkGrossCut).toBe(600_000);
  });
});

// --- Formatting ---

describe('formatCurrency', () => {
  it('formats positive amounts', () => {
    expect(formatCurrency(1000)).toBe('$1,000');
    expect(formatCurrency(1234567)).toBe('$1,234,567');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-5000)).toBe('-$5,000');
  });

  it('rounds to no decimals', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235');
  });
});

describe('formatPercent', () => {
  it('formats standard percentages', () => {
    expect(formatPercent(50)).toBe('50.0%');
    expect(formatPercent(3)).toBe('3.0%');
  });

  it('formats decimal percentages', () => {
    expect(formatPercent(2.5)).toBe('2.5%');
    expect(formatPercent(33.33)).toBe('33.33%');
  });

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });
});

// --- Validation Helpers ---

describe('getMissingTransactionFields', () => {
  const completeTransaction = {
    buyer: { name: 'John', role: 'Buyer' },
    seller: { name: 'Jane', role: 'Seller' },
    coeDate: '2025-06-01',
    price: 500000,
    grossCommissionPercent: 3,
    treyLaoPercent: 35,
    kirkLaoPercent: 30,
    treySplitPercent: 60,
    kirkSplitPercent: 40,
  } as Transaction;

  it('returns empty array for complete transaction', () => {
    expect(getMissingTransactionFields(completeTransaction)).toEqual([]);
  });

  it('detects missing buyer', () => {
    const t = { ...completeTransaction, buyer: { name: '', role: 'Buyer' } } as Transaction;
    const missing = getMissingTransactionFields(t);
    expect(missing.some(m => m.key === 'buyer.name')).toBe(true);
  });

  it('detects missing price', () => {
    const t = { ...completeTransaction, price: 0 } as Transaction;
    const missing = getMissingTransactionFields(t);
    expect(missing.some(m => m.key === 'price')).toBe(true);
  });

  it('detects missing COE date', () => {
    const t = { ...completeTransaction, coeDate: '' } as Transaction;
    const missing = getMissingTransactionFields(t);
    expect(missing.some(m => m.key === 'coeDate')).toBe(true);
  });
});

describe('getMissingLeadFields', () => {
  it('returns empty for complete lead', () => {
    expect(getMissingLeadFields({ projectName: 'Test', contactName: 'John' })).toEqual([]);
  });

  it('detects missing project name', () => {
    const missing = getMissingLeadFields({ projectName: '', contactName: 'John' });
    expect(missing.some(m => m.key === 'projectName')).toBe(true);
  });

  it('detects missing contact name', () => {
    const missing = getMissingLeadFields({ projectName: 'Test', contactName: '' });
    expect(missing.some(m => m.key === 'contactName')).toBe(true);
  });

  it('does not require lastSpokeDate', () => {
    const missing = getMissingLeadFields({ projectName: 'Test', contactName: 'John' });
    expect(missing.some(m => m.key === 'lastSpokeDate')).toBe(false);
  });
});

// --- Lead Summary ---

describe('getLeadSummary', () => {
  it('returns empty string for lead with no notes', () => {
    expect(getLeadSummary({ notesLog: [] })).toBe('');
    expect(getLeadSummary({})).toBe('');
  });

  it('returns most recent note content', () => {
    const lead = {
      notesLog: [
        { date: '2025-01-01', content: 'Old note' },
        { date: '2025-06-15', content: 'Latest note' },
        { date: '2025-03-10', content: 'Middle note' },
      ],
    };
    expect(getLeadSummary(lead)).toBe('Latest note');
  });
});

// --- ICS Generation ---

describe('generateICS', () => {
  it('generates valid ICS structure', () => {
    const ics = generateICS([
      { title: 'Close of Escrow', start: new Date('2025-06-01T00:00:00Z') },
    ]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Close of Escrow');
    expect(ics).toContain('END:VEVENT');
  });

  it('includes description when provided', () => {
    const ics = generateICS([
      { title: 'Test', start: new Date('2025-06-01'), description: 'Important event' },
    ]);
    expect(ics).toContain('DESCRIPTION:Important event');
  });

  it('handles multiple events', () => {
    const ics = generateICS([
      { title: 'Event 1', start: new Date('2025-06-01') },
      { title: 'Event 2', start: new Date('2025-07-01') },
    ]);
    const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(2);
  });

  it('handles empty events array', () => {
    const ics = generateICS([]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});

// --- DEFAULT_PREFERENCES ---

describe('DEFAULT_PREFERENCES', () => {
  it('has correct default values', () => {
    expect(DEFAULT_PREFERENCES.teamName).toBe('LAO Team');
    expect(DEFAULT_PREFERENCES.agent1Name).toBe('Trey');
    expect(DEFAULT_PREFERENCES.agent2Name).toBe('Kirk');
    expect(DEFAULT_PREFERENCES.defaultTreySplit + DEFAULT_PREFERENCES.defaultKirkSplit).toBe(100);
  });
});
