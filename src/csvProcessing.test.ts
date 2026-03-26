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
  it('parses a basic buyer lead row', () => {
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
      'Last Spoke': '2025-01-15',
      'Notes': 'Initial meeting',
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
    expect(l.isDeleted).toBe(false);
  });

  it('parses a listing row with property data', () => {
    const data = [{
      'Lead Type': 'Active Listing',
      'Project Name': 'Brady Land - Burris & Clayton Rds',
      'PID': 'AZPinal186844',
      'Acreage': '27.31',
      'List Date': '6/5/2024',
      'Listing Expiration': '6/5/2026',
      'List Price': '9516988.8',
      'Listing Stage': 'Signed',
    }];

    const result = processLeadCSV(data);
    const l = result[0];
    expect(l.stage).toBe('Active Listing');
    expect(l.pid).toBe('AZPinal186844');
    expect(l.acreage).toBe(27.31);
    expect(l.listPrice).toBe(9516988.8);
    expect(l.listingStage).toBe('Signed');
    expect(l.listDate).toBeTruthy();
    expect(l.listingExpirationDate).toBeTruthy();
  });

  it('maps legacy lead types correctly', () => {
    const mappings: Record<string, string> = {
      'True Lead': 'Buyer Lead',
      'Live Contract': 'Active Listing',
      'Dead Deal': 'Dead Lead',
      'Converted Lead (Escrow)': 'Buyer Lead',
      'Signed Listing': 'Active Listing',
      'Trusted Listing': 'Active Listing',
      'Listing': 'Active Listing',
    };

    Object.entries(mappings).forEach(([input, expected]) => {
      const result = processLeadCSV([{ 'Lead Type': input }]);
      expect(result[0].stage).toBe(expected);
    });
  });

  it('maps standard lead types correctly', () => {
    const types = ['Buyer Lead', 'Listing Lead', 'Active Listing', 'Dead Lead', 'Dead Listing'];
    types.forEach(type => {
      const result = processLeadCSV([{ 'Lead Type': type }]);
      expect(result[0].stage).toBe(type);
    });
  });

  it('reads Stage Name column as lead type (listing spreadsheet format)', () => {
    const result = processLeadCSV([{ 'Stage Name': 'Signed Listing' }]);
    expect(result[0].stage).toBe('Active Listing');
    expect(result[0].listingStage).toBe('Signed');
  });

  it('reads Trusted Listing and sets listingStage', () => {
    const result = processLeadCSV([{ 'Lead Type': 'Trusted Listing' }]);
    expect(result[0].stage).toBe('Active Listing');
    expect(result[0].listingStage).toBe('Trusted');
  });

  it('reads Deal Name as project name fallback', () => {
    const result = processLeadCSV([{ 'Deal Name': 'Illinois Road & 15.3 Ac' }]);
    expect(result[0].projectName).toBe('Illinois Road & 15.3 Ac');
  });

  it('reads Name column as contact (dead leads format)', () => {
    const result = processLeadCSV([{ 'Name': 'Tanner Ferandi', 'Inquiry': 'Pinal County Tech Park' }]);
    expect(result[0].contactName).toBe('Tanner Ferandi');
    expect(result[0].description).toBe('Pinal County Tech Park');
  });

  it('reads Inquiry and Response columns (dead leads format)', () => {
    const result = processLeadCSV([{
      'Name': 'John',
      'Inquiry': 'Looking for land',
      'Response': 'Almost to contract but died',
      'Last Spoke': '7/18/2022',
    }]);
    expect(result[0].description).toBe('Looking for land');
    expect(result[0].notesLog).toHaveLength(1);
    expect(result[0].notesLog![0].content).toBe('Almost to contract but died');
  });

  it('reads Acres column as acreage', () => {
    const result = processLeadCSV([{ 'Acres': '320' }]);
    expect(result[0].acreage).toBe(320);
  });

  it('reads Summary of Discussion as notes fallback', () => {
    const result = processLeadCSV([{
      'Summary of Discussion': 'Waiting on contract feedback',
      'Last Spoke': '5/16/2025',
    }]);
    expect(result[0].notesLog).toHaveLength(1);
    expect(result[0].notesLog![0].content).toBe('Waiting on contract feedback');
  });

  it('uses List Price as estValue fallback', () => {
    const result = processLeadCSV([{ 'List Price': '1500000' }]);
    expect(result[0].estValue).toBe(1500000);
    expect(result[0].listPrice).toBe(1500000);
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
    const result = processLeadCSV([{ 'Last Spoke': '45672' }]);
    expect(result[0].lastSpokeDate).toBeTruthy();
    expect(new Date(result[0].lastSpokeDate!).getTime()).not.toBeNaN();
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

  it('handles rows with only some fields populated', () => {
    const result = processLeadCSV([{
      'Lead Type': 'Buyer Lead',
      'Project Name': 'Partial Data',
    }]);
    const l = result[0];
    expect(l.projectName).toBe('Partial Data');
    expect(l.contactName).toBe('');
    expect(l.description).toBe('');
    expect(l.pid).toBe('');
    expect(l.acreage).toBeUndefined();
    expect(l.listPrice).toBeUndefined();
    expect(l.assignedAgent).toBe('');
  });

  it('creates notesLog entry when notes are present, empty when not', () => {
    const withNotes = processLeadCSV([{ 'Notes': 'Some note', 'Last Spoke': '2025-01-01' }]);
    expect(withNotes[0].notesLog).toHaveLength(1);

    const withoutNotes = processLeadCSV([{ 'Project Name': 'No notes' }]);
    expect(withoutNotes[0].notesLog).toEqual([]);
  });
});
