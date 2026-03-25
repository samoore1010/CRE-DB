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
    // Column C ("Seller/Buyer:") contains "SellerEntity/BuyerEntity" — split on "/" to get each entity.
    // Column D ("Seller Contact") is the Seller contact person.
    // Column E ("Buyer Contact") is the Buyer contact person.
    const sellerBuyerRaw = row['Seller/Buyer:'] || '';
    const slashIdx = sellerBuyerRaw.indexOf('/');
    const sellerEntity = slashIdx >= 0 ? sellerBuyerRaw.slice(0, slashIdx).trim() : sellerBuyerRaw.trim();
    const buyerEntity  = slashIdx >= 0 ? sellerBuyerRaw.slice(slashIdx + 1).trim() : '';
    const sellerContact = row['Seller Contact'] || '';    // Column D = Seller contact
    const buyerContact  = row['Buyer Contact'] || '';     // Column E = Buyer contact
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

export function processLeadCSV(data: any[]): Lead[] {
  const newLeads: Lead[] = [];
  data.forEach((row, index) => {
    const parseDate = (str: string) => {
      if (!str) return '';
      try {
        if (!isNaN(Number(str)) && Number(str) > 20000) {
          const date = new Date((Number(str) - 25569) * 86400 * 1000);
          return date.toISOString();
        }
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.toISOString();
        return '';
      } catch (e) { return ''; }
    };
    const rawType = row['Lead Type']?.trim() || '';
    // Map legacy CSV lead type values to new LeadStage
    const legacyTypeMap: Record<string, LeadStage> = {
      'True Lead': 'Buyer Lead',
      'Live Contract': 'Listing',
      'Converted Lead (Escrow)': 'Buyer Lead',
      'Dead Deal': 'Dead Lead',
      'Buyer Lead': 'Buyer Lead',
      'Listing Lead': 'Listing Lead',
      'Listing': 'Listing',
      'Dead Lead': 'Dead Lead',
      'Dead Listing': 'Dead Listing',
    };
    const mappedStage: LeadStage = legacyTypeMap[rawType] || 'Buyer Lead';
    const l: Lead = {
      id: Math.random().toString(36).substr(2, 9),
      stage: mappedStage,
      projectName: row['Project Name'] || `Lead ${index + 1}`,
      contactName: row['Contact'] || '',
      contactRole: row['Contact Role'] || '',
      contactPhone: row['Contact Phone'] || '',
      contactEmail: row['Contact Email'] || '',
      description: row['Description'] || '',
      estValue: row['Est Value'] ? Number(row['Est Value']) : undefined,
      assignedAgent: row['Assigned Agent'] || '',
      details: row['Details'] || '',
      lastSpokeDate: parseDate(row['Last Spoke']),
      summary: row['Summary of Discussion'] || '',
      isDeleted: false,
      notesLog: [],
      followUpDate: undefined
    };
    newLeads.push(l);
  });
  return newLeads;
}
