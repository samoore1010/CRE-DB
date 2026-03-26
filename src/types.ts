// --- Types & Interfaces ---

export type PipelineStage = 'LOI' | 'Contract' | 'Escrow' | 'Closed' | 'Option';
export type LeadStage = 'Buyer Lead' | 'Listing Lead' | 'Active Listing' | 'Dead Lead' | 'Dead Listing';

export interface Party {
  id?: string;
  role: string;
  side?: 'buyer' | 'seller' | 'third-party';
  name: string;
  entity?: string;
  email?: string;
  phone?: string;
}

export interface Note {
  id: string;
  content: string;
  date: string;
}

export interface CustomDate {
  id: string;
  label: string;
  date: string;
  completed: boolean;
  type?: 'reminder' | 'event';
}

export interface TransactionDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  dateUploaded: string;
  url?: string;
  sourceEmailId?: string;
  emailBodyText?: string;
  emailBodyHtml?: string;
}

export interface InboxAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  data: string; // base64
}

export interface InboxItem {
  id: string;
  from: string;
  fromName: string;
  fromRaw?: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  receivedAt: string;
  isRead: boolean;
  attachments: InboxAttachment[];
  avatarColor?: string;
  assignedTo?: {
    type: 'transaction' | 'lead';
    id: string;
    name: string;
  } | null;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface LeadContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface LeadReminder {
  id: string;
  date: string; // ISO Date
  description: string;
  completed: boolean;
}

export interface BulletinItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  transactionId?: string;
  assignedTo?: 'Trey' | 'Kirk' | 'Pete';
}

export interface ContactSource {
  type: 'transaction-buyer' | 'transaction-seller' | 'transaction-party' | 'lead' | 'standalone';
  id: string;
  label: string;
  role?: string;
  stage?: PipelineStage;
  coeDate?: string;
}

export interface DerivedContact {
  id: string;
  name: string;
  entity?: string;
  email?: string;
  phone?: string;
  primaryRole: string;
  sources: ContactSource[];
  lastActiveDate?: string;
}

export interface StandaloneContact {
  id: string;
  name: string;
  entity?: string;
  email?: string;
  phone?: string;
  primaryRole?: string;
  notes?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  stage: LeadStage;
  projectName: string;
  contactName: string;
  contactRole?: string;
  contactPhone?: string;
  contactEmail?: string;
  description?: string;
  estValue?: number;
  assignedAgent?: string;
  details?: string;
  lastSpokeDate?: string;
  summary?: string;
  isDeleted: boolean;
  deletedAt?: string;
  notesLog?: Note[];
  followUpDate?: string;
  contacts?: LeadContact[];
  reminders?: LeadReminder[];
  convertedToTransactionId?: string;
  convertedAt?: string;
  // Listing-specific fields
  pid?: string;
  acreage?: number;
  listDate?: string;
  listingExpirationDate?: string;
  listPrice?: number;
  listingStage?: 'Trusted' | 'Signed';
}

export type ActionType =
  | 'transaction_update'
  | 'transaction_create'
  | 'transaction_delete'
  | 'transaction_restore'
  | 'lead_update'
  | 'lead_create'
  | 'lead_delete'
  | 'lead_restore';

export interface ActionLogEntry {
  id: string;
  timestamp: string; // ISO
  type: ActionType;
  entityId: string;
  entityType: 'transaction' | 'lead';
  entityName: string;
  description: string;
  changedFields?: string[];
  previousState?: Transaction | Lead;
}

export interface Transaction {
  id: string;
  dealName: string;
  stage: PipelineStage;
  price: number;
  grossCommissionPercent: number;
  treyLaoPercent: number;
  kirkLaoPercent: number;
  treySplitPercent: number;
  kirkSplitPercent: number;
  earnestMoney: number;
  psaDate: string; // ISO Date
  feasibilityDate: string; // ISO Date
  coeDate: string; // ISO Date
  address: string;
  acreage: number;
  zoning: string;
  clientContact: string;
  clientPhone: string;
  clientEmail: string;
  coBroker: string;
  titleCompany: string;
  referralSource: string;
  notes: string;
  notesLog: Note[];
  reminders?: LeadReminder[];
  buyer: Party;
  seller: Party;
  otherParties: Party[];
  customDates: CustomDate[];
  documents: TransactionDocument[];
  apn?: string;
  county?: string;
  projectYear?: string;
  pid?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface AppPreferences {
  teamName: string;
  agent1Name: string;
  agent2Name: string;
  defaultTreySplit: number;
  defaultKirkSplit: number;
  defaultTreyLaoPercent: number;
  defaultKirkLaoPercent: number;
  defaultGrossCommissionPercent: number;
}
