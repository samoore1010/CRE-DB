import { describe, it, expect } from 'vitest';
import { processTransactionCSV, processLeadCSV } from './csvProcessing';

describe('processTransactionCSV', () => {
  it('parses a basic transaction row', () => {
    const data = [{
      'Stage:': 'Escrow',
      'Seller/Buyer:': 'Smith Corp/Jones LLC',
      'Seller Contact': 'Bob Smith',
      'Buyer Contact': 'Alice Jones',
      'Price:': '$1,500,000',
      'Base Commission': '3',
      'Trey Commission': '60',
      'Kirk Commission': '40',
      'Trey LAO': '35',
      'Kirk LAO': '30',
      'Close of Escrow': '2025-06-15',
      'Feasability End Date': '2025-04-01',
      'PID': '123-456',
      'Year': '2025',
    }];

    const result = processTransactionCSV(data);
    expect(result).toHaveLength(1);

    const t = result[0];
    expect(t.stage).toBe('Escrow');
    expect(t.price).toBe(1500000);
    expect(t.grossCommissionPercent).toBe(3);
    expect(t.treySplitPercent).toBe(60);
    expect(t.kirkSplitPercent).toBe(40);
    expect(t.treyLaoPercent).toBe(35);
    expect(t.kirkLaoPercent).toBe(30);
    expect(t.buyer.name).toBe('Alice Jones');
    expect(t.buyer.entity).toBe('Jones LLC');
    expect(t.seller.name).toBe('Bob Smith');
    expect(t.seller.entity).toBe('Smith Corp');
    expect(t.pid).toBe('123-456');
    expect(t.apn).toBe('123-456');
    expect(t.projectYear).toBe('2025');
    expect(t.isDeleted).toBe(false);
  });

  it('maps pipeline stages correctly', () => {
    const stages = ['LOI', 'Contract', 'Escrow', 'Closed', 'Option'];
    stages.forEach(stage => {
      const result = processTransactionCSV([{ 'Stage:': stage }]);
      expect(result[0].stage).toBe(stage);
    });
  });

  it('defaults to LOI for unknown stage', () => {
    const result = processTransactionCSV([{ 'Stage:': 'Unknown' }]);
    expect(result[0].stage).toBe('LOI');
  });

  it('defaults to LOI for missing stage', () => {
    const result = processTransactionCSV([{}]);
    expect(result[0].stage).toBe('LOI');
  });

  it('handles missing price gracefully', () => {
    const result = processTransactionCSV([{}]);
    expect(result[0].price).toBe(0);
  });

  it('generates unique IDs', () => {
    const result = processTransactionCSV([{}, {}, {}]);
    const ids = result.map(t => t.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('uses Seller/Buyer as dealName', () => {
    const result = processTransactionCSV([{ 'Seller/Buyer:': 'Acme/BuyerCo' }]);
    expect(result[0].dealName).toBe('Acme/BuyerCo');
  });

  it('falls back to Deal N for missing dealName', () => {
    const result = processTransactionCSV([{}, {}]);
    expect(result[0].dealName).toBe('Deal 1');
    expect(result[1].dealName).toBe('Deal 2');
  });

  it('handles Seller/Buyer without slash', () => {
    const result = processTransactionCSV([{ 'Seller/Buyer:': 'Single Entity' }]);
    expect(result[0].seller.entity).toBe('Single Entity');
    expect(result[0].buyer.entity).toBe('');
  });

  it('defaults LAO percentages when missing', () => {
    const result = processTransactionCSV([{}]);
    expect(result[0].treyLaoPercent).toBe(35);
    expect(result[0].kirkLaoPercent).toBe(30);
  });

  it('parses dates correctly', () => {
    const result = processTransactionCSV([{ 'Close of Escrow': '2025-12-25' }]);
    expect(result[0].coeDate).toContain('2025-12-25');
  });

  it('handles invalid dates gracefully', () => {
    const result = processTransactionCSV([{ 'Close of Escrow': 'not-a-date' }]);
    expect(result[0].coeDate).toBe('');
  });

  it('handles multiple rows', () => {
    const result = processTransactionCSV([
      { 'Stage:': 'LOI', 'Price:': '100000' },
      { 'Stage:': 'Closed', 'Price:': '200000' },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].price).toBe(100000);
    expect(result[1].price).toBe(200000);
  });
});

describe('processLeadCSV', () => {
  it('parses a basic lead row', () => {
    const data = [{
      'Lead Type': 'Buyer Lead',
      'Project Name': 'Test Project',
      'Contact': 'John Doe',
      'Contact Role': 'Owner',
      'Contact Phone': '555-1234',
      'Contact Email': 'john@example.com',
      'Description': 'Interested in land purchase',
      'Est Value': '500000',
      'Assigned Agent': 'Trey',
      'Details': 'Looking in north area',
      'Last Spoke': '2025-01-15',
      'Summary of Discussion': 'Initial meeting',
    }];

    const result = processLeadCSV(data);
    expect(result).toHaveLength(1);

    const l = result[0];
    expect(l.stage).toBe('Buyer Lead');
    expect(l.projectName).toBe('Test Project');
    expect(l.contactName).toBe('John Doe');
    expect(l.contactRole).toBe('Owner');
    expect(l.contactPhone).toBe('555-1234');
    expect(l.contactEmail).toBe('john@example.com');
    expect(l.description).toBe('Interested in land purchase');
    expect(l.estValue).toBe(500000);
    expect(l.assignedAgent).toBe('Trey');
    expect(l.details).toBe('Looking in north area');
    expect(l.summary).toBe('Initial meeting');
    expect(l.isDeleted).toBe(false);
  });

  it('maps legacy lead types correctly', () => {
    const mappings: Record<string, string> = {
      'True Lead': 'Buyer Lead',
      'Live Contract': 'Listing',
      'Dead Deal': 'Dead Lead',
      'Converted Lead (Escrow)': 'Buyer Lead',
    };

    Object.entries(mappings).forEach(([input, expected]) => {
      const result = processLeadCSV([{ 'Lead Type': input }]);
      expect(result[0].stage).toBe(expected);
    });
  });

  it('maps standard lead types correctly', () => {
    const types = ['Buyer Lead', 'Listing Lead', 'Listing', 'Dead Lead', 'Dead Listing'];
    types.forEach(type => {
      const result = processLeadCSV([{ 'Lead Type': type }]);
      expect(result[0].stage).toBe(type);
    });
  });

  it('defaults to Buyer Lead for unknown type', () => {
    const result = processLeadCSV([{ 'Lead Type': 'SomeWeirdType' }]);
    expect(result[0].stage).toBe('Buyer Lead');
  });

  it('defaults to Buyer Lead for missing type', () => {
    const result = processLeadCSV([{}]);
    expect(result[0].stage).toBe('Buyer Lead');
  });

  it('handles Excel serial date numbers', () => {
    // Excel serial number for 2025-01-15 is approximately 45672
    const result = processLeadCSV([{ 'Last Spoke': '45672' }]);
    expect(result[0].lastSpokeDate).toBeTruthy();
    // Verify it parsed to a valid ISO date
    expect(new Date(result[0].lastSpokeDate).getTime()).not.toBeNaN();
  });

  it('handles standard date strings', () => {
    const result = processLeadCSV([{ 'Last Spoke': '2025-06-15' }]);
    expect(result[0].lastSpokeDate).toContain('2025-06-15');
  });

  it('handles empty date', () => {
    const result = processLeadCSV([{ 'Last Spoke': '' }]);
    expect(result[0].lastSpokeDate).toBe('');
  });

  it('generates unique IDs', () => {
    const result = processLeadCSV([{}, {}, {}]);
    const ids = result.map(l => l.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('falls back to Lead N for missing project name', () => {
    const result = processLeadCSV([{}, {}]);
    expect(result[0].projectName).toBe('Lead 1');
    expect(result[1].projectName).toBe('Lead 2');
  });

  it('initializes with empty notesLog', () => {
    const result = processLeadCSV([{}]);
    expect(result[0].notesLog).toEqual([]);
  });
});
