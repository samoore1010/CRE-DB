import type { Transaction, Lead, PipelineStage, LeadStage } from './types';

export function processTransactionCSV(data: any[]): Transaction[] {
  const newTransactions: Transaction[] = [];
  data.forEach((row, index) => {
    const parseCurrency = (str: string) => {
      if (!str) return 0;
      return Number(str.replace(/[^0-9.-]+/g, ''));
    };
    const parsePercent = (str: string) => {
      if (!str) return 0;
      return Number(str.replace(/[^0-9.-]+/g, ''));
    };
    const parseDate = (str: string) => {
      if (!str) return '';
      try {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.toISOString();
        return '';
      } catch (e) { return ''; }
    };
    let stage: PipelineStage = 'LOI';
    const rawStage = row['Stage:']?.trim();
    if (rawStage === 'Closed') stage = 'Closed';
    else if (rawStage === 'Escrow') stage = 'Escrow';
    else if (rawStage === 'Contract') stage = 'Contract';
    else if (rawStage === 'Option') stage = 'Option';
    const sellerBuyerRaw = row['Seller/Buyer:'] || '';
    const slashIdx = sellerBuyerRaw.indexOf('/');
    const sellerEntity = slashIdx >= 0 ? sellerBuyerRaw.slice(0, slashIdx).trim() : sellerBuyerRaw.trim();
    const buyerEntity  = slashIdx >= 0 ? sellerBuyerRaw.slice(slashIdx + 1).trim() : '';
    const sellerContact = row['Seller Contact'] || '';
    const buyerContact  = row['Buyer Contact'] || '';
    const t: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      dealName: sellerBuyerRaw || `Deal ${index + 1}`,
      stage,
      price: parseCurrency(row['Price:']),
      grossCommissionPercent: parsePercent(row['Base Commission']),
      treyLaoPercent: parsePercent(row['Trey LAO']) || 35,
      kirkLaoPercent: parsePercent(row['Kirk LAO']) || 30,
      treySplitPercent: parsePercent(row['Trey Commission']),
      kirkSplitPercent: parsePercent(row['Kirk Commission']),
      earnestMoney: 0,
      psaDate: '',
      feasibilityDate: parseDate(row['Feasability End Date']),
      coeDate: parseDate(row['Close of Escrow']),
      address: '',
      acreage: 0,
      zoning: '',
      clientContact: '',
      clientPhone: '',
      clientEmail: '',
      coBroker: '',
      titleCompany: '',
      referralSource: '',
      notes: '',
      notesLog: [],
      buyer: { role: 'Buyer', name: buyerContact, entity: buyerEntity },
      seller: { role: 'Seller', name: sellerContact, entity: sellerEntity },
      otherParties: [],
      customDates: [],
      documents: [],
      apn: row['PID'] || '',
      pid: row['PID'] || '',
      projectYear: row['Year'] || new Date().getFullYear().toString(),
      county: '',
      isDeleted: false
    };
    newTransactions.push(t);
  });
  return newTransactions;
}

// --- Shared helpers for lead CSV parsing ---

function parseLeadDate(str: string): string {
  if (!str) return '';
  try {
    // Handle Excel serial date numbers
    if (!isNaN(Number(str)) && Number(str) > 20000) {
      const date = new Date((Number(str) - 25569) * 86400 * 1000);
      return date.toISOString();
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
    return '';
  } catch { return ''; }
}

function parseLeadNumber(str: string): number | undefined {
  if (!str) return undefined;
  const n = Number(String(str).replace(/[^0-9.-]+/g, ''));
  return isNaN(n) ? undefined : n;
}

// Map legacy and variant lead type names to canonical LeadStage values
const LEAD_TYPE_MAP: Record<string, LeadStage> = {
  // Canonical names
  'Buyer Lead': 'Buyer Lead',
  'Listing Lead': 'Listing Lead',
  'Active Listing': 'Active Listing',
  'Dead Lead': 'Dead Lead',
  'Dead Listing': 'Dead Listing',
  // Legacy names from old spreadsheets
  'True Lead': 'Buyer Lead',
  'Live Contract': 'Active Listing',
  'Converted Lead (Escrow)': 'Buyer Lead',
  'Dead Deal': 'Dead Lead',
  // Alternate names from listing spreadsheet
  'Signed Listing': 'Active Listing',
  'Trusted Listing': 'Active Listing',
  // Previous app stage name
  'Listing': 'Active Listing',
};

// Try multiple column name variations for a value
function getField(row: any, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
}

export function processLeadCSV(data: any[]): Lead[] {
  const newLeads: Lead[] = [];
  data.forEach((row, index) => {
    // Determine lead stage from whichever column name is present
    const rawType = getField(row, 'Lead Type', 'Stage Name', 'Stage');
    const mappedStage: LeadStage = LEAD_TYPE_MAP[rawType] || 'Buyer Lead';

    // Determine listing sub-stage if present
    let listingStage: 'Trusted' | 'Signed' | undefined;
    if (rawType === 'Trusted Listing') listingStage = 'Trusted';
    else if (rawType === 'Signed Listing') listingStage = 'Signed';
    else {
      const rawListingStage = getField(row, 'Listing Stage');
      if (rawListingStage === 'Trusted' || rawListingStage === 'Signed') {
        listingStage = rawListingStage;
      }
    }

    // Project name: try multiple column names
    const projectName = getField(row, 'Project Name', 'Deal Name') || `Lead ${index + 1}`;

    // Contact: try multiple column names
    const contactName = getField(row, 'Contact', 'Name');

    // Description: try multiple column names; "Details" and "Inquiry" map here
    const description = getField(row, 'Description', 'Details', 'Inquiry');

    // Notes: try multiple column names
    const notes = getField(row, 'Notes', 'Summary of Discussion', 'Response');

    // Build initial notesLog from imported notes text
    const notesLog = notes ? [{
      id: Math.random().toString(36).substr(2, 9),
      content: notes,
      date: parseLeadDate(getField(row, 'Last Spoke')) || new Date().toISOString(),
    }] : [];

    const l: Lead = {
      id: Math.random().toString(36).substr(2, 9),
      stage: mappedStage,
      projectName,
      contactName,
      contactRole: getField(row, 'Contact Role'),
      contactPhone: getField(row, 'Contact Phone'),
      contactEmail: getField(row, 'Contact Email'),
      description,
      estValue: parseLeadNumber(getField(row, 'Est Value', 'List Price')),
      assignedAgent: getField(row, 'Assigned Agent'),
      lastSpokeDate: parseLeadDate(getField(row, 'Last Spoke')),
      isDeleted: false,
      notesLog,
      // Listing-specific fields
      pid: getField(row, 'PID'),
      acreage: parseLeadNumber(getField(row, 'Acreage', 'Acres')),
      listDate: parseLeadDate(getField(row, 'List Date')),
      listingExpirationDate: parseLeadDate(getField(row, 'Listing Expiration', 'Listing Expiration Date')),
      listPrice: parseLeadNumber(getField(row, 'List Price')),
      listingStage,
    };
    newLeads.push(l);
  });
  return newLeads;
}
