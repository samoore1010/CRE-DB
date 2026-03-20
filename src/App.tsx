import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  List, 
  DollarSign, 
  Calendar as CalendarIcon, 
  Users, 
  Building2, 
  ChevronRight, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Briefcase, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Save, 
  X, 
  Menu,
  TrendingUp,
  PieChart,
  Phone,
  Mail,
  FileText,
  Plus,
  MessageSquare,
  Upload,
  File,
  Download,
  Bot,
  Send,
  Sparkles,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Bell,
  Edit2,
  Check,
  History,
  Calendar,
  Moon,
  Sun,
  AlertTriangle,
  GripVertical,
  Columns3,
  RotateCcw,
  Target,
  Eye,
  BookUser,
  ChevronLeft,
  GitMerge,
  Inbox,
  AtSign,
  Paperclip,
  ExternalLink,
  Tag,
  MailOpen,
  MailCheck,
  Reply,
  ChevronDown,
  Settings,
  Monitor,
  Info,
  Lock,
  LogOut,
  LogIn,
  UserCog,
  ShieldCheck,
  Loader2,
  CheckCheck,
  XCircle,
  PartyPopper,
  ChevronUp,
  Sliders,
  HelpCircle,
  BarChart2,
  FileDown,
  Printer,
  CheckSquare
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth, 
  addMonths, 
  subMonths, 
  parseISO, 
  isWithinInterval,
  addDays,
  subDays,
  isAfter,
  isBefore,
  parse
} from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI, Type } from "@google/genai";
import Papa from 'papaparse';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  Legend,
  AreaChart,
  Area
} from 'recharts';

// --- Utility Functions ---

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Haptic feedback — triggers device vibration on supported mobile browsers
function haptic(pattern: number | number[] = 50) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

// Pull-to-refresh hook — detects downward swipe from top of page
function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const THRESHOLD = 72;

  const stableRefresh = useCallback(onRefresh, [onRefresh]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) startYRef.current = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 0 && window.scrollY === 0) {
        setPullDistance(Math.min(delta * 0.5, THRESHOLD + 20));
        setIsPulling(delta > THRESHOLD);
      }
    };
    let pulling = false;
    const handleTouchMoveRef = (e: TouchEvent) => {
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 0 && window.scrollY === 0) {
        const dist = Math.min(delta * 0.5, THRESHOLD + 20);
        setPullDistance(dist);
        pulling = dist * 2 > THRESHOLD;
        setIsPulling(pulling);
      }
    };
    const handleTouchEnd = async () => {
      if (pulling) {
        setIsRefreshing(true);
        haptic(30);
        await stableRefresh();
        setIsRefreshing(false);
      }
      setPullDistance(0);
      setIsPulling(false);
      pulling = false;
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMoveRef, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMoveRef);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [stableRefresh]);

  return { isPulling, isRefreshing, pullDistance };
}

// --- Shared Animation Variants ---

const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 28, stiffness: 320 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.12 } },
};

const drawerVariants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { type: 'spring' as const, damping: 30, stiffness: 300 } },
  exit: { x: '100%', transition: { type: 'spring' as const, damping: 36, stiffness: 380 } },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const modalVariants = {
  hidden: { scale: 0.96, opacity: 0, y: 10 },
  visible: { scale: 1, opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 26, stiffness: 320 } },
  exit: { scale: 0.96, opacity: 0, y: 8, transition: { duration: 0.12 } },
};

const listContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

const listItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 300 } },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function generateICS(events: { title: string, start: Date, description?: string }[]) {
  let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//LAO Pipeline Pro//NONSGML v1.0//EN\n";
  
  events.forEach(event => {
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    icsContent += "BEGIN:VEVENT\n";
    icsContent += `UID:${Math.random().toString(36).substr(2)}@laopipeline.com\n`;
    icsContent += `DTSTAMP:${formatDate(new Date())}\n`;
    icsContent += `DTSTART:${formatDate(event.start)}\n`;
    icsContent += `DTEND:${formatDate(addDays(event.start, 1))}\n`; // All day event usually, or 1 hour
    icsContent += `SUMMARY:${event.title}\n`;
    if (event.description) icsContent += `DESCRIPTION:${event.description}\n`;
    icsContent += "END:VEVENT\n";
  });
  
  icsContent += "END:VCALENDAR";
  return icsContent;
}

// --- Types & Interfaces ---

type PipelineStage = 'LOI' | 'Contract' | 'Escrow' | 'Closed' | 'Option';
type LeadStage = 'Buyer Lead' | 'Listing Lead' | 'Listing' | 'Dead Lead' | 'Dead Listing';

interface Party {
  id?: string;
  role: string;
  side?: 'buyer' | 'seller' | 'third-party';
  name: string;
  entity?: string;
  email?: string;
  phone?: string;
}

const mkParty = (role: string, side?: Party['side']): Party => ({
  id: Math.random().toString(36).substr(2, 9),
  role,
  side,
  name: '',
  entity: '',
  email: '',
  phone: '',
});

interface Note {
  id: string;
  content: string;
  date: string;
}

interface CustomDate {
  id: string;
  label: string;
  date: string;
  completed: boolean;
  type?: 'reminder' | 'event';
}

interface TransactionDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  dateUploaded: string;
  url?: string;
  // Set when this document was created from an email
  sourceEmailId?: string;
  emailBodyText?: string;
  emailBodyHtml?: string;
}

interface InboxAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  data: string; // base64
}

interface InboxItem {
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

interface LeadContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

interface LeadReminder {
  id: string;
  date: string; // ISO Date
  description: string;
  completed: boolean;
}

interface BulletinItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  transactionId?: string;
  assignedTo?: 'Trey' | 'Kirk' | 'Pete';
}

interface ContactSource {
  type: 'transaction-buyer' | 'transaction-seller' | 'transaction-party' | 'lead' | 'standalone';
  id: string;
  label: string;
  role?: string;
  stage?: PipelineStage;
  coeDate?: string;
}

interface DerivedContact {
  id: string;
  name: string;
  entity?: string;
  email?: string;
  phone?: string;
  primaryRole: string;
  sources: ContactSource[];
  lastActiveDate?: string;
}

interface StandaloneContact {
  id: string;
  name: string;
  entity?: string;
  email?: string;
  phone?: string;
  primaryRole?: string;
  notes?: string;
  createdAt: string;
}

interface Lead {
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
  details: string;
  lastSpokeDate: string;
  summary: string;
  isDeleted: boolean;
  deletedAt?: string;
  notesLog?: Note[];
  followUpDate?: string;
  contacts?: LeadContact[];
  reminders?: LeadReminder[];
  convertedToTransactionId?: string;
  convertedAt?: string;
}

type ActionType =
  | 'transaction_update'
  | 'transaction_create'
  | 'transaction_delete'
  | 'transaction_restore'
  | 'lead_update'
  | 'lead_create'
  | 'lead_delete'
  | 'lead_restore';

interface ActionLogEntry {
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

interface Transaction {
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
  // New Fields
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

// --- Toast & Preference Types ---

interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppPreferences {
  teamName: string;
  agent1Name: string;
  agent2Name: string;
  defaultTreySplit: number;
  defaultKirkSplit: number;
  defaultTreyLaoPercent: number;
  defaultKirkLaoPercent: number;
  defaultGrossCommissionPercent: number;
}

const DEFAULT_PREFERENCES: AppPreferences = {
  teamName: 'LAO Team',
  agent1Name: 'Trey',
  agent2Name: 'Kirk',
  defaultTreySplit: 60,
  defaultKirkSplit: 40,
  defaultTreyLaoPercent: 35,
  defaultKirkLaoPercent: 30,
  defaultGrossCommissionPercent: 3,
};

function loadPrefsFromStorage(): AppPreferences {
  try {
    const raw = localStorage.getItem('lao_preferences');
    if (raw) return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_PREFERENCES };
}

// --- Validation Helpers ---

function getMissingTransactionFields(t: Transaction): { key: string; label: string }[] {
  const missing: { key: string; label: string }[] = [];
  if (!t.buyer?.name) missing.push({ key: 'buyer.name', label: 'Buyer' });
  if (!t.seller?.name) missing.push({ key: 'seller.name', label: 'Seller' });
  if (!t.coeDate) missing.push({ key: 'coeDate', label: 'COE Date' });
  if (!t.price) missing.push({ key: 'price', label: 'Price' });
  if (t.grossCommissionPercent === undefined || t.grossCommissionPercent === null) missing.push({ key: 'grossCommissionPercent', label: 'Gross Comm %' });
  if (t.treyLaoPercent === undefined || t.treyLaoPercent === null) missing.push({ key: 'treyLaoPercent', label: 'Trey LAO %' });
  if (t.kirkLaoPercent === undefined || t.kirkLaoPercent === null) missing.push({ key: 'kirkLaoPercent', label: 'Kirk LAO %' });
  if (t.treySplitPercent === undefined || t.treySplitPercent === null) missing.push({ key: 'treySplitPercent', label: 'Trey Split %' });
  if (t.kirkSplitPercent === undefined || t.kirkSplitPercent === null) missing.push({ key: 'kirkSplitPercent', label: 'Kirk Split %' });
  return missing;
}

function getMissingLeadFields(l: Lead): { key: string; label: string }[] {
  const missing: { key: string; label: string }[] = [];
  if (!l.projectName) missing.push({ key: 'projectName', label: 'Project Name' });
  if (!l.contactName) missing.push({ key: 'contactName', label: 'Contact' });
  if (!l.lastSpokeDate) missing.push({ key: 'lastSpokeDate', label: 'Last Spoke' });
  return missing;
}

// --- Mock Data ---

const INITIAL_TRANSACTIONS: Transaction[] = [];

const INITIAL_LEADS: Lead[] = [];

// Returns the content of the most recent activity log entry for a lead
function getLeadSummary(lead: Lead): string {
  if (!lead.notesLog || lead.notesLog.length === 0) return '';
  const sorted = [...lead.notesLog].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return sorted[0]?.content || '';
}

// --- Business Logic Hook ---

function useCommissionMath(transaction: Transaction) {
  return useMemo(() => {
    const grossCommission = transaction.price * (transaction.grossCommissionPercent / 100);
    const treyGrossCut = grossCommission * (transaction.treySplitPercent / 100);
    const kirkGrossCut = grossCommission * (transaction.kirkSplitPercent / 100);
    const laoFromTrey = treyGrossCut * (transaction.treyLaoPercent / 100);
    const laoFromKirk = kirkGrossCut * (transaction.kirkLaoPercent / 100);
    const treyNet = treyGrossCut - laoFromTrey;
    const kirkNet = kirkGrossCut - laoFromKirk;
    const laoTotal = laoFromTrey + laoFromKirk;

    return {
      grossCommission,
      treyGrossCut,
      kirkGrossCut,
      laoFromTrey,
      laoFromKirk,
      treyNet,
      kirkNet,
      laoTotal,
      // legacy aliases kept for any remaining display references
      treyTake: treyNet,
      kirkTake: kirkNet,
    };
  }, [transaction.price, transaction.grossCommissionPercent, transaction.treyLaoPercent, transaction.kirkLaoPercent, transaction.treySplitPercent, transaction.kirkSplitPercent]);
}

// --- Components ---

const StatusBadge = ({ stage }: { stage: PipelineStage }) => {
  const colors: Record<string, string> = {
    'LOI': 'bg-slate-100 text-slate-700 border-slate-200',
    'Contract': 'bg-blue-50 text-blue-700 border-blue-200',
    'Escrow': 'bg-amber-50 text-amber-700 border-amber-200',
    'Closed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Option': 'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", colors[stage])}>
      {stage}
    </span>
  );
};

const MetricCard = ({ title, value, subtext, icon: Icon, trend }: any) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
        <Icon className="w-5 h-5 text-slate-600" />
      </div>
      {trend && (
        <span className={cn("text-xs font-medium px-2 py-1 rounded-full", 
          trend > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        )}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
    <div className="text-2xl font-bold text-slate-900">{value}</div>
    {subtext && <p className="text-slate-400 text-xs mt-1">{subtext}</p>}
  </div>
);

// --- Views ---

// --- New Components ---

const EmailDocumentRow = ({ doc, onDelete }: { doc: TransactionDocument; onDelete: (id: string) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const isBodyDoc = doc.type === 'email';
  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/30 overflow-hidden group">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-white rounded-lg border border-indigo-200 flex items-center justify-center text-indigo-500 shrink-0">
            <AtSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{doc.name}</p>
            <p className="text-xs text-slate-500">{format(parseISO(doc.dateUploaded), 'MMM d, yyyy')} • Via Email</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isBodyDoc && doc.emailBodyText && (
            <button onClick={() => setExpanded(e => !e)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all" title={expanded ? 'Collapse' : 'Preview'}>
              <ChevronRight className={cn("w-4 h-4 transition-transform", expanded && "rotate-90")} />
            </button>
          )}
          {doc.url && !isBodyDoc && (
            <a href={doc.url} download={doc.name} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all" title="Download">
              <Download className="w-4 h-4" />
            </a>
          )}
          <button onClick={() => onDelete(doc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {expanded && doc.emailBodyText && (
        <div className="px-4 pb-4 border-t border-indigo-100">
          <p className="text-xs text-slate-600 mt-3 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{doc.emailBodyText}</p>
        </div>
      )}
    </div>
  );
};

const DocumentSection = ({
  documents,
  onUpload,
  onDelete
}: {
  documents: TransactionDocument[],
  onUpload: (docs: TransactionDocument[]) => void,
  onDelete: (id: string) => void
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const newDocs: TransactionDocument[] = files.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        size: file.size,
        dateUploaded: new Date().toISOString(),
        url: URL.createObjectURL(file)
      }));
      onUpload(newDocs);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" /> Documents
          </h3>
          <label className="cursor-pointer px-4 py-2 bg-indigo-50 text-indigo-600 font-medium rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload
            <input type="file" multiple className="hidden" onChange={handleFileChange} />
          </label>
        </div>

        {(documents || []).length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
            <File className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No documents uploaded</p>
            <p className="text-xs text-slate-400 mt-1">Upload PSAs, LOIs, and other deal docs here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(documents || []).map(doc => (
              doc.sourceEmailId ? (
                // Email-sourced document
                <EmailDocumentRow key={doc.id} doc={doc} onDelete={onDelete} />
              ) : (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 group hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-indigo-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{doc.name}</p>
                      <p className="text-xs text-slate-500">
                        {format(parseISO(doc.dateUploaded), 'MMM d, yyyy')} • {(doc.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.url && (
                      <a
                        href={doc.url}
                        download={doc.name}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => onDelete(doc.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AIAssistant = ({ 
  transaction, 
  onUpdateTransaction 
}: { 
  transaction: Transaction, 
  onUpdateTransaction: (updates: Partial<Transaction>) => void 
}) => {
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: "Hi! I'm your deal assistant. I can help you update transaction details, draft notes, or create calendar reminders. What would you like to do?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Array<{field: string, value: any, reason: string}>>([]);
  const [pendingCalendarEvents, setPendingCalendarEvents] = useState<Array<{title: string, start: string, description: string}>>([]);

  const handleSend = async (textOverride?: string) => {
    const userMsg = textOverride || input;
    if (!userMsg.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);
    setPendingUpdates([]);
    setPendingCalendarEvents([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Provide context
      const context = `
        Current Transaction Context:
        ${JSON.stringify(transaction, null, 2)}
        
        You are a helpful real estate transaction assistant. 
        If the user asks to update details, use the 'propose_updates' tool.
        If the user asks for calendar events, use the 'create_calendar_export' tool.
        If the user asks to add a follow-up or reminder, use the 'add_timeline_event' tool.
        
        For 'add_timeline_event', use type='reminder' for reminders/follow-ups, and type='custom' for other custom events. Use type='critical' only for PSA, Feasibility, and COE.
        
        For dates, use ISO format YYYY-MM-DD.
        Today is ${new Date().toISOString().split('T')[0]}.
      `;

      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: context,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "propose_updates",
                  description: "Propose updates to the transaction fields based on user request. Use this to suggest date changes or note additions.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      updates: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            field: { type: Type.STRING, description: "Field name (e.g., psaDate, price, notes, buyer.name, notesLog)" },
                            value: { type: Type.STRING, description: "New value for the field. For notesLog, provide the note content." },
                            reason: { type: Type.STRING, description: "Reason for the change" }
                          },
                          required: ["field", "value", "reason"]
                        }
                      }
                    },
                    required: ["updates"]
                  }
                },
                {
                  name: "review_documents",
                  description: "Review the documents attached to the transaction and suggest key dates or notes.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      documentName: { type: Type.STRING, description: "Name of the document to review (optional)" }
                    }
                  }
                },
                {
                  name: "add_timeline_event",
                  description: "Add a new event or date to the transaction timeline.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING, description: "Name/Label of the event (e.g., 'Inspection', 'Closing')" },
                      date: { type: Type.STRING, description: "ISO Date string (YYYY-MM-DD)" },
                      type: { type: Type.STRING, enum: ["critical", "custom", "reminder"], description: "Type of event" }
                    },
                    required: ["label", "date"]
                  }
                },
                {
                  name: "create_calendar_export",
                  description: "Generate calendar events for export.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      events: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            title: { type: Type.STRING },
                            start: { type: Type.STRING, description: "ISO Date string" },
                            description: { type: Type.STRING }
                          },
                          required: ["title", "start"]
                        }
                      }
                    },
                    required: ["events"]
                  }
                }
              ]
            }
          ]
        },
        history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      });

      const result = await chat.sendMessage({ message: userMsg });
      const response = result; // In new SDK, result IS the response object mostly, or result.response
      const text = response.text;
      
      if (text) {
        setMessages(prev => [...prev, { role: 'model', text }]);
      }

      // Handle Function Calls
      const calls = response.functionCalls;
      if (calls) {
        calls.forEach(call => {
          if (call.name === 'propose_updates') {
            const args = call.args as any;
            setPendingUpdates(args.updates);
            setMessages(prev => [...prev, { role: 'model', text: "I've drafted some updates for you to review below." }]);
          } else if (call.name === 'create_calendar_export') {
            const args = call.args as any;
            setPendingCalendarEvents(args.events);
            setMessages(prev => [...prev, { role: 'model', text: "I've prepared a calendar export file based on your request." }]);
          } else if (call.name === 'add_timeline_event') {
            const args = call.args as any;
            // Treat adding timeline event as a special update
            setPendingUpdates(prev => [...prev, {
                field: 'customDates',
                value: { 
                  label: args.label, 
                  date: args.date, 
                  completed: false, 
                  id: Math.random().toString(36).substr(2, 9),
                  type: args.type === 'reminder' ? 'reminder' : 'event'
                },
                reason: `User requested to add ${args.label} on ${args.date}`
            }]);
            setMessages(prev => [...prev, { role: 'model', text: `I've proposed adding "${args.label}" to the timeline.` }]);
          } else if (call.name === 'review_documents') {
             // Mock document review logic
             const docs = transaction.documents || [];
             if (docs.length === 0) {
                setMessages(prev => [...prev, { role: 'model', text: "I couldn't find any documents to review." }]);
             } else {
                // Simulate finding dates/notes based on filenames
                const findings = docs.map(d => {
                    if (d.name.toLowerCase().includes('psa')) return `Found in ${d.name}: PSA Date appears to be ${format(addDays(new Date(), 5), 'yyyy-MM-dd')}.`;
                    if (d.name.toLowerCase().includes('amendment')) return `Found in ${d.name}: Extension granted until ${format(addDays(new Date(), 30), 'yyyy-MM-dd')}.`;
                    return `Reviewed ${d.name}, no critical dates found.`;
                }).join('\n');
                
                setMessages(prev => [...prev, { role: 'model', text: `I've reviewed the documents:\n${findings}\n\nWould you like me to propose these updates?` }]);
             }
          }
        });
      }

    } catch (error: any) {
      console.error("AI Error:", error);
      let errorMessage = "Sorry, I encountered an error processing your request.";
      if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('quota')) {
        errorMessage = "AI service quota exceeded. Please try again later.";
      }
      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyUpdate = (update: {field: string, value: any}) => {
    // Handle nested fields like 'buyer.name'
    if (update.field === 'notesLog') {
        const newNote: Note = {
            id: Math.random().toString(36).substr(2, 9),
            content: update.value,
            date: new Date().toISOString()
        };
        onUpdateTransaction({
            notesLog: [newNote, ...(transaction.notesLog || [])]
        });
    } else if (update.field === 'customDates') {
        // Handle adding to customDates array
        onUpdateTransaction({
            customDates: [...(transaction.customDates || []), update.value]
        });
    } else if (update.field.includes('.')) {
      const [parent, child] = update.field.split('.');
      // This is a simplified handler. In a real app, use deep merge or specific handlers.
      // For now, we'll assume it's one level deep as per our schema (buyer, seller)
      const currentParent = (transaction as any)[parent] || {};
      onUpdateTransaction({
        [parent]: { ...currentParent, [child]: update.value }
      });
    } else {
      onUpdateTransaction({ [update.field]: update.value });
    }
    // Remove from pending
    setPendingUpdates(prev => prev.filter(u => u.field !== update.field));
  };

  const downloadCalendar = () => {
    const ics = generateICS(pendingCalendarEvents.map(e => ({
      title: e.title,
      start: parseISO(e.start),
      description: e.description
    })));
    
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${transaction.dealName.replace(/\s+/g, '_')}_schedule.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-4 h-[600px]">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-900">AI Deal Assistant</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 1 && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button 
                onClick={() => handleSend("Review the notes and details, then suggest 3 important follow-ups or reminders for this deal.")}
                className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium text-left transition-colors border border-indigo-100"
              >
                <Sparkles className="w-3 h-3 mb-1" />
                Suggest Follow Ups
              </button>
              <button 
                onClick={() => handleSend("Add a reminder to check in with the client in 3 days.")}
                className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium text-left transition-colors border border-emerald-100"
              >
                <Clock className="w-3 h-3 mb-1" />
                Add Reminder
              </button>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-3 max-w-[80%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === 'user' ? "bg-slate-200 text-slate-600" : "bg-indigo-100 text-indigo-600"
              )}>
                {msg.role === 'user' ? <Users className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={cn(
                "p-3 rounded-2xl text-sm",
                msg.role === 'user' ? "bg-slate-100 text-slate-800 rounded-tr-none" : "bg-indigo-50 text-indigo-900 rounded-tl-none"
              )}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 rounded-tl-none flex items-center gap-1">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask to update details or create calendar events..."
              className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button 
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Actions Sidebar */}
      <div className="space-y-4 overflow-y-auto shrink-0 max-h-[200px]">
        {pendingUpdates.length > 0 && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-4">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-indigo-600" /> Proposed Updates
            </h4>
            <div className="space-y-3">
              {pendingUpdates.map((update, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">{update.field}</span>
                    <button 
                      onClick={() => applyUpdate(update)}
                      className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition-colors"
                    >
                      Accept
                    </button>
                  </div>
                  <div className="text-sm font-medium text-slate-900 mb-1">{String(update.value)}</div>
                  <div className="text-xs text-slate-500 italic">"{update.reason}"</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingCalendarEvents.length > 0 && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-4">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-600" /> Calendar Export
            </h4>
            <div className="space-y-3 mb-4">
              {pendingCalendarEvents.slice(0, 3).map((event, i) => (
                <div key={i} className="text-xs p-2 bg-emerald-50 text-emerald-800 rounded border border-emerald-100">
                  <span className="font-bold">{format(parseISO(event.start), 'MMM d')}:</span> {event.title}
                </div>
              ))}
              {pendingCalendarEvents.length > 3 && (
                <p className="text-xs text-slate-400 text-center">+ {pendingCalendarEvents.length - 3} more events</p>
              )}
            </div>
            <button 
              onClick={downloadCalendar}
              className="w-full py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" /> Download .ics
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Module-level CSV processing functions (used by DataManagementView and startup auto-load) ---

function processTransactionCSV(data: any[]): Transaction[] {
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
    const t: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      dealName: row['Seller(s):'] || `Deal ${index + 1}`,
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
      buyer: { role: 'Buyer', name: row['Buyer:'] || '', entity: '' },
      seller: { role: 'Seller', name: row['Seller(s):'] || '', entity: '' },
      otherParties: [],
      customDates: [],
      documents: [],
      apn: row['PID'] || '',
      pid: row['PID'] || '',
      projectYear: row['Year'] || new Date().getFullYear().toString(),
      county: '',
      isDeleted: false
    };
    if (row['Buyer:2']) {
      t.otherParties.push({ id: Math.random().toString(36).substr(2, 9), role: 'Co-Buyer', side: 'buyer', name: row['Buyer:2'], entity: '' });
    }
    newTransactions.push(t);
  });
  return newTransactions;
}

function processLeadCSV(data: any[]): Lead[] {
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

const DataManagementView = ({ 
  transactions, 
  leads,
  onUpdateTransaction,
  onUpdateLead,
  onImport,
  onImportLeads
}: { 
  transactions: Transaction[], 
  leads: Lead[],
  onUpdateTransaction: (t: Transaction) => void,
  onUpdateLead: (l: Lead) => void,
  onImport: (newTransactions: Transaction[]) => void,
  onImportLeads: (newLeads: Lead[]) => void
}) => {
  const [dataType, setDataType] = useState<'transactions' | 'leads'>('transactions');
  const [isDragging, setIsDragging] = useState(false);

  // Preview State
  const [previewData, setPreviewData] = useState<Transaction[]>([]);
  const [previewLeads, setPreviewLeads] = useState<Lead[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPreviewIds, setSelectedPreviewIds] = useState<Set<string>>(new Set());

  const handleFileUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (dataType === 'transactions') {
            const parsed = processTransactionCSV(results.data);
            setPreviewData(parsed);
            setSelectedPreviewIds(new Set(parsed.map(t => t.id)));
        } else {
            const parsed = processLeadCSV(results.data);
            setPreviewLeads(parsed);
            setSelectedPreviewIds(new Set(parsed.map(l => l.id)));
        }
        setShowPreview(true);
      },
      error: (error: any) => {
        console.error('CSV Error:', error);
        alert('Failed to parse CSV file.');
      }
    });
  };

  const handleConfirmImport = () => {
    if (dataType === 'transactions') {
        const toImport = previewData.filter(t => selectedPreviewIds.has(t.id));
        onImport(toImport);
        setPreviewData([]);
    } else {
        const toImport = previewLeads.filter(l => selectedPreviewIds.has(l.id));
        onImportLeads(toImport);
        setPreviewLeads([]);
    }
    setShowPreview(false);
    setSelectedPreviewIds(new Set());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      handleFileUpload(file);
    } else {
        alert('Please upload a CSV file.');
    }
  };

  // Render Cell Helper
  const EditableCell = ({ 
    value, 
    onChange, 
    type = "text", 
    placeholder = "-",
    className = ""
  }: { 
    value: any, 
    onChange: (val: any) => void, 
    type?: "text" | "number" | "date" | "select",
    options?: string[],
    placeholder?: string,
    className?: string
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);

    // Update local value when prop changes
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleBlur = () => {
        setIsEditing(false);
        if (localValue !== value) {
            onChange(localValue);
        }
    };

    if (type === 'select') {
        return (
            <select 
                value={localValue} 
                onChange={(e) => {
                    setLocalValue(e.target.value);
                    onChange(e.target.value);
                }}
                className={cn("w-full bg-transparent border-none focus:ring-0 p-0 text-xs", className)}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {['LOI', 'Contract', 'Escrow', 'Closed', 'Option'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        );
    }

    return (
        <input
            type={type}
            value={localValue || ''}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onFocus={() => setIsEditing(true)}
            placeholder={placeholder}
            className={cn(
                "w-full bg-transparent border-none focus:ring-1 focus:ring-indigo-500 rounded px-1 py-0.5 text-xs transition-all",
                !value && "bg-amber-50/50 italic placeholder:text-amber-400/50",
                className
            )}
        />
    );
  };

  if (showPreview) {
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Import Preview ({dataType === 'transactions' ? 'Transactions' : 'Leads'})</h1>
                    <p className="text-slate-500">Review and confirm data to import.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => {
                            setShowPreview(false);
                            setPreviewData([]);
                            setPreviewLeads([]);
                        }}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirmImport}
                        disabled={selectedPreviewIds.size === 0}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
                    >
                        Confirm Import ({selectedPreviewIds.size})
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    {dataType === 'transactions' ? (
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedPreviewIds.size === previewData.length && previewData.length > 0}
                                            onChange={() => {
                                                if (selectedPreviewIds.size === previewData.length) {
                                                    setSelectedPreviewIds(new Set());
                                                } else {
                                                    setSelectedPreviewIds(new Set(previewData.map(t => t.id)));
                                                }
                                            }}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </th>
                                    <th className="px-3 py-2">Year</th>
                                    <th className="px-3 py-2">Stage</th>
                                    <th className="px-3 py-2">Deal Name</th>
                                    <th className="px-3 py-2">Buyer</th>
                                    <th className="px-3 py-2 text-right">Price</th>
                                    <th className="px-3 py-2">PID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {previewData.map(t => (
                                    <tr key={t.id} className={cn("hover:bg-slate-50", selectedPreviewIds.has(t.id) && "bg-indigo-50/30")}>
                                        <td className="px-4 py-3">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedPreviewIds.has(t.id)}
                                                onChange={() => {
                                                    const newSet = new Set(selectedPreviewIds);
                                                    if (newSet.has(t.id)) newSet.delete(t.id);
                                                    else newSet.add(t.id);
                                                    setSelectedPreviewIds(newSet);
                                                }}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td className="px-3 py-2">{t.projectYear}</td>
                                        <td className="px-3 py-2"><StatusBadge stage={t.stage} /></td>
                                        <td className="px-3 py-2 font-medium">{t.dealName}</td>
                                        <td className="px-3 py-2">{t.buyer.name}</td>
                                        <td className="px-3 py-2 text-right">{formatCurrency(t.price)}</td>
                                        <td className="px-3 py-2 font-mono text-[10px]">{t.pid}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedPreviewIds.size === previewLeads.length && previewLeads.length > 0}
                                            onChange={() => {
                                                if (selectedPreviewIds.size === previewLeads.length) {
                                                    setSelectedPreviewIds(new Set());
                                                } else {
                                                    setSelectedPreviewIds(new Set(previewLeads.map(l => l.id)));
                                                }
                                            }}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </th>
                                    <th className="px-3 py-2">Type</th>
                                    <th className="px-3 py-2">Project</th>
                                    <th className="px-3 py-2">Contact</th>
                                    <th className="px-3 py-2">Details</th>
                                    <th className="px-3 py-2">Last Spoke</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {previewLeads.map(l => (
                                    <tr key={l.id} className={cn("hover:bg-slate-50", selectedPreviewIds.has(l.id) && "bg-indigo-50/30")}>
                                        <td className="px-4 py-3">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedPreviewIds.has(l.id)}
                                                onChange={() => {
                                                    const newSet = new Set(selectedPreviewIds);
                                                    if (newSet.has(l.id)) newSet.delete(l.id);
                                                    else newSet.add(l.id);
                                                    setSelectedPreviewIds(newSet);
                                                }}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td className="px-3 py-2">{l.stage}</td>
                                        <td className="px-3 py-2 font-medium">{l.projectName}</td>
                                        <td className="px-3 py-2">{l.contactName}</td>
                                        <td className="px-3 py-2 truncate max-w-[200px]">{l.details}</td>
                                        <td className="px-3 py-2">{l.lastSpokeDate ? format(parseISO(l.lastSpokeDate), 'MM/dd/yy') : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Management</h1>
          <p className="text-slate-500">Import your pipeline data.</p>
        </div>
      </div>

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Select Data Type</h3>
                  <div className="flex gap-4 mb-6">
                      <label className={cn(
                          "flex-1 border rounded-xl p-4 cursor-pointer transition-all hover:border-indigo-300",
                          dataType === 'transactions' ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500" : "border-slate-200"
                      )}>
                          <input 
                              type="radio" 
                              name="dataType" 
                              value="transactions" 
                              checked={dataType === 'transactions'} 
                              onChange={() => setDataType('transactions')}
                              className="sr-only"
                          />
                          <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-lg", dataType === 'transactions' ? "bg-indigo-200 text-indigo-700" : "bg-slate-100 text-slate-500")}>
                                  <DollarSign className="w-5 h-5" />
                              </div>
                              <div>
                                  <p className="font-semibold text-slate-900">Transactions</p>
                                  <p className="text-xs text-slate-500">Import deal pipeline data</p>
                              </div>
                          </div>
                      </label>

                      <label className={cn(
                          "flex-1 border rounded-xl p-4 cursor-pointer transition-all hover:border-indigo-300",
                          dataType === 'leads' ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500" : "border-slate-200"
                      )}>
                          <input 
                              type="radio" 
                              name="dataType" 
                              value="leads" 
                              checked={dataType === 'leads'} 
                              onChange={() => setDataType('leads')}
                              className="sr-only"
                          />
                          <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-lg", dataType === 'leads' ? "bg-indigo-200 text-indigo-700" : "bg-slate-100 text-slate-500")}>
                                  <Users className="w-5 h-5" />
                              </div>
                              <div>
                                  <p className="font-semibold text-slate-900">Leads</p>
                                  <p className="text-xs text-slate-500">Import potential leads data</p>
                              </div>
                          </div>
                      </label>
                  </div>

                  <div 
                    className={cn(
                        "border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-colors cursor-pointer",
                        isDragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload')?.click()}
                >
                    <input 
                        id="file-upload" 
                        type="file" 
                        accept=".csv" 
                        className="hidden" 
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    />
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                        <Upload className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Upload {dataType === 'transactions' ? 'Transactions' : 'Leads'} CSV</h3>
                    <p className="text-slate-500 text-sm mt-2">Drag and drop or click to browse</p>
                </div>
              </div>

              {/* Import Format Instructions — spreadsheet preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 rounded-lg">
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h4 className="font-semibold text-slate-800 text-sm">CSV Format Guide</h4>
                </div>
                <p className="text-xs text-slate-500">
                  Your spreadsheet must match the column layout below exactly. Row 1 is the header row — copy these column names as-is. Each row after is one {dataType === 'transactions' ? 'transaction' : 'lead'}.
                </p>

                {dataType === 'transactions' ? (() => {
                  const cols = ['Year','Stage:','Seller(s):','Buyer:','Buyer:2','Price:','Base Commission','LAO Split','Trey Commission','Kirk Commission','Feasability End Date','Close of Escrow','PID'];
                  const letters = ['A','B','C','D','E','F','G','H','I','J','K','L','M'];
                  const rows = [
                    ['2026','Contract','Smith Ranch','John Buyer','','$3,500,000','4.00%','20','50','50','6/15/2026','9/30/2026','AZPinal001'],
                    ['2026','Escrow','Mesa Land Co.','Jane Davis','Bob Ellis','$1,200,000','3.00%','20','50','50','','8/15/2026',''],
                    ['2026','LOI','Sunrise Farms','Carlos Reyes','','$875,000','5.00%','20','50','50','','',''],
                  ];
                  return (
                    <div className="space-y-2">
                      <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm">
                        <table className="text-[11px] border-collapse min-w-full">
                          <thead>
                            {/* Column letter row */}
                            <tr>
                              <td className="w-7 bg-emerald-100 border border-slate-300 px-1.5 py-1 text-center text-emerald-700 font-bold sticky left-0 z-10" />
                              {letters.map(l => (
                                <td key={l} className="bg-emerald-100 border border-slate-300 px-2 py-1 text-center text-emerald-700 font-bold whitespace-nowrap min-w-[80px]">{l}</td>
                              ))}
                            </tr>
                            {/* Header row (row 1) */}
                            <tr>
                              <td className="bg-emerald-100 border border-slate-300 px-1.5 py-1.5 text-center text-emerald-700 font-bold text-[10px] sticky left-0 z-10">1</td>
                              {cols.map(c => (
                                <td key={c} className="bg-slate-100 border border-slate-300 px-2 py-1.5 font-bold text-slate-800 whitespace-nowrap">{c}</td>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r, ri) => (
                              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="bg-emerald-50 border border-slate-300 px-1.5 py-1.5 text-center text-emerald-700 font-semibold text-[10px] sticky left-0 z-10">{ri + 2}</td>
                                {r.map((cell, ci) => (
                                  <td key={ci} className="border border-slate-200 px-2 py-1.5 text-slate-700 whitespace-nowrap">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <p className="text-xs text-amber-800"><span className="font-semibold">Note:</span> Column headers must match exactly (including colons and capitalization). Stage must be one of: <span className="font-semibold">LOI, Contract, Escrow, Closed, Option</span>. Dates can be in any standard format (e.g. 6/15/2026 or 2026-06-15).</p>
                      </div>
                    </div>
                  );
                })() : (() => {
                  const cols = ['Lead Type','Project Name','Contact','Details','Last Spoke','Summary of Discussion'];
                  const letters = ['A','B','C','D','E','F'];
                  const rows = [
                    ['Buyer Lead','Greenfield Acres','Tom Wilson','40 acres irrigated farmland','3/1/2026','Referred by Kirk — motivated buyer, wants to close by Q3'],
                    ['Listing Lead','Sunny Valley Farms','Sarah Chen','120 acres raw land','2/15/2026','Owner interested in listing — waiting on survey results'],
                    ['Listing','Riverside Parcel','Mike Torres','65 acres, mixed zoning','1/20/2026','Active listing — follow up on marketing plan next week'],
                  ];
                  return (
                    <div className="space-y-2">
                      <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm">
                        <table className="text-[11px] border-collapse min-w-full">
                          <thead>
                            {/* Column letter row */}
                            <tr>
                              <td className="w-7 bg-emerald-100 border border-slate-300 px-1.5 py-1 text-center text-emerald-700 font-bold sticky left-0 z-10" />
                              {letters.map(l => (
                                <td key={l} className="bg-emerald-100 border border-slate-300 px-2 py-1 text-center text-emerald-700 font-bold whitespace-nowrap min-w-[110px]">{l}</td>
                              ))}
                            </tr>
                            {/* Header row */}
                            <tr>
                              <td className="bg-emerald-100 border border-slate-300 px-1.5 py-1.5 text-center text-emerald-700 font-bold text-[10px] sticky left-0 z-10">1</td>
                              {cols.map(c => (
                                <td key={c} className="bg-slate-100 border border-slate-300 px-2 py-1.5 font-bold text-slate-800 whitespace-nowrap">{c}</td>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r, ri) => (
                              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="bg-emerald-50 border border-slate-300 px-1.5 py-1.5 text-center text-emerald-700 font-semibold text-[10px] sticky left-0 z-10">{ri + 2}</td>
                                {r.map((cell, ci) => (
                                  <td key={ci} className="border border-slate-200 px-2 py-1.5 text-slate-700 whitespace-nowrap max-w-[240px] truncate">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <p className="text-xs text-amber-800"><span className="font-semibold">Note:</span> Lead Type must be one of: <span className="font-semibold">Buyer Lead, Listing Lead, Listing, Dead Lead, Dead Listing</span>. Legacy values (True Lead, Live Contract, Dead Deal) are auto-mapped. Dates can be in any standard format (e.g. 3/1/2026).</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
          </div>
    </div>
  );
};

const DashboardView = ({ transactions, leads, actionLog, onSelectDeal, onSelectLead, onAddReminder, onNavigate, onNavigateToInbox, inboxItems, darkMode, bulletinItems, onAddBulletinItem, onToggleBulletinItem, onDeleteBulletinItem, onUpdateTransaction }: { transactions: Transaction[], leads: Lead[], actionLog?: ActionLogEntry[], onSelectDeal: (id: string) => void, onSelectLead: (id: string) => void, onAddReminder?: (targetId: string, targetType: 'transaction' | 'lead', reminder: LeadReminder) => void, onNavigate?: (view: 'pipeline' | 'leads') => void, onNavigateToInbox?: () => void, inboxItems?: InboxItem[], darkMode?: boolean, bulletinItems?: BulletinItem[], onAddBulletinItem?: (text: string, transactionId?: string, assignedTo?: 'Trey' | 'Kirk' | 'Pete') => void, onToggleBulletinItem?: (id: string) => void, onDeleteBulletinItem?: (id: string) => void, onUpdateTransaction?: (t: Transaction) => void }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() => new Date().getFullYear());
  const [showICSModal, setShowICSModal] = useState(false);
  const [icsScope, setICSScope] = useState<'all' | 'future' | 'months'>('all');
  const [icsSelectedMonths, setICSSelectedMonths] = useState<string[]>([]);
  const [showQuickReminder, setShowQuickReminder] = useState(false);
  const [quickReminderTarget, setQuickReminderTarget] = useState<{ id: string, type: 'transaction' | 'lead' }>({ id: '', type: 'transaction' });
  const [quickReminderDate, setQuickReminderDate] = useState('');
  const [quickReminderDesc, setQuickReminderDesc] = useState('');
  const [comboSearch, setComboSearch] = useState('');
  const [comboOpen, setComboOpen] = useState(false);
  const [notesSearch, setNotesSearch] = useState('');
  const [bulletinInput, setBulletinInput] = useState('');
  const [bulletinDeal, setBulletinDeal] = useState('');
  const [bulletinPerson, setBulletinPerson] = useState<'Trey' | 'Kirk' | 'Pete' | ''>('');

  // Dashboard Metrics & Derived Data
  const { metrics, actionItems, recentActivity, pipelineHealth, leadHealth } = useMemo(() => {
    const activeDeals = transactions.filter(t => t.stage !== 'Closed' && !t.isDeleted);
    const closedDeals = transactions.filter(t => t.stage === 'Closed' && !t.isDeleted);
    const activeLeads = leads.filter(l => !l.isDeleted);
    
    // Financials
    const ytdGross = closedDeals.reduce((sum, t) => sum + (t.price * (t.grossCommissionPercent / 100)), 0);
    const totalAcresSold = closedDeals.reduce((sum, t) => sum + (t.acreage || 0), 0);
    const totalSoldVolume = closedDeals.reduce((sum, t) => sum + t.price, 0);
    const avgPricePerAcre = totalAcresSold > 0 ? totalSoldVolume / totalAcresSold : 0;
    
    // Active Pipeline Value
    const activePipelineValue = activeDeals.reduce((sum, t) => sum + (t.price * (t.grossCommissionPercent / 100)), 0);

    // Projected Commission
    const projectedTrey = activeDeals.reduce((sum, t) => {
      const gross = t.price * (t.grossCommissionPercent / 100);
      const treyGross = gross * (t.treySplitPercent / 100);
      return sum + treyGross * (1 - (t.treyLaoPercent ?? 35) / 100);
    }, 0);

    const projectedKirk = activeDeals.reduce((sum, t) => {
      const gross = t.price * (t.grossCommissionPercent / 100);
      const kirkGross = gross * (t.kirkSplitPercent / 100);
      return sum + kirkGross * (1 - (t.kirkLaoPercent ?? 30) / 100);
    }, 0);
    
    // Monthly Forecast
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthlyDeals = transactions.filter(t => {
      if (!t.coeDate || t.isDeleted) return false;
      const coe = parseISO(t.coeDate);
      return isWithinInterval(coe, { start: monthStart, end: monthEnd });
    });
    const monthlyGross = monthlyDeals.reduce((sum, t) => sum + (t.price * (t.grossCommissionPercent / 100)), 0);
    const monthlyTrey = monthlyDeals.reduce((sum, t) => {
      const gross = t.price * (t.grossCommissionPercent / 100);
      const treyGross = gross * (t.treySplitPercent / 100);
      return sum + treyGross * (1 - (t.treyLaoPercent ?? 35) / 100);
    }, 0);

    // Pipeline Health
    const health = {
        LOI: activeDeals.filter(t => t.stage === 'LOI').length,
        Contract: activeDeals.filter(t => t.stage === 'Contract').length,
        Escrow: activeDeals.filter(t => t.stage === 'Escrow').length,
        Option: activeDeals.filter(t => t.stage === 'Option').length,
    };

    // Lead Health
    const leadHealth = {
        'Buyer Lead': activeLeads.filter(l => l.stage === 'Buyer Lead').length,
        'Listing Lead': activeLeads.filter(l => l.stage === 'Listing Lead').length,
        'Listing': activeLeads.filter(l => l.stage === 'Listing').length,
        'Dead Lead': activeLeads.filter(l => l.stage === 'Dead Lead' || l.stage === 'Dead Listing').length,
    };

    // Action Items (AI Insights)
    const items: { id: string, title: string, subtitle: string, type: 'urgent' | 'warning' | 'info', isLead: boolean }[] = [];
    const today = new Date();
    const sevenDaysAgo = subDays(today, 7);

    // 1. Stale Leads
    activeLeads.forEach(l => {
        const lastSpoke = l.lastSpokeDate ? parseISO(l.lastSpokeDate) : null;
        if (!lastSpoke || isBefore(lastSpoke, sevenDaysAgo)) {
            items.push({
                id: l.id,
                title: `Stale Lead: ${l.projectName}`,
                subtitle: lastSpoke ? `Last spoke ${format(lastSpoke, 'MMM d')}` : 'Never contacted',
                type: 'warning',
                isLead: true
            });
        }
    });

    // 2. Urgent Escrows
    activeDeals.filter(t => t.stage === 'Escrow').forEach(t => {
        if (t.coeDate) {
            const coe = parseISO(t.coeDate);
            if (isBefore(coe, addDays(today, 10)) && isAfter(coe, subDays(today, 1))) {
                items.push({
                    id: t.id,
                    title: `Closing Soon: ${t.dealName}`,
                    subtitle: `COE on ${format(coe, 'MMM d')}`,
                    type: 'urgent',
                    isLead: false
                });
            }
        }
    });

    // 3. Overdue Reminders
    [...activeDeals, ...activeLeads].forEach(obj => {
        const isLead = 'projectName' in obj;
        obj.reminders?.forEach(r => {
            if (!r.completed) {
                const date = parseISO(r.date);
                if (isBefore(date, today)) {
                    items.push({
                        id: obj.id,
                        title: `Overdue: ${r.description}`,
                        subtitle: isLead ? (obj as Lead).projectName : (obj as Transaction).dealName,
                        type: 'urgent',
                        isLead
                    });
                } else if (isSameDay(date, today)) {
                    items.push({
                        id: obj.id,
                        title: `Due Today: ${r.description}`,
                        subtitle: isLead ? (obj as Lead).projectName : (obj as Transaction).dealName,
                        type: 'info',
                        isLead
                    });
                }
            }
        });
    });

    // Recent Activity Feed
    const activity: { id: string, sourceId: string, sourceName: string, content: string, date: string, isLead: boolean }[] = [];
    [...activeDeals, ...activeLeads].forEach(obj => {
        const isLead = 'projectName' in obj;
        obj.notesLog?.forEach(note => {
            activity.push({
                id: note.id,
                sourceId: obj.id,
                sourceName: isLead ? (obj as Lead).projectName : (obj as Transaction).dealName,
                content: note.content,
                date: note.date,
                isLead
            });
        });
    });

    return {
      metrics: {
        activeCount: activeDeals.length,
        ytdGross,
        monthlyGross,
        monthlyTrey,
        monthlyDeals,
        totalAcresSold,
        avgPricePerAcre,
        leadCount: activeLeads.length,
        activePipelineValue,
        projectedTrey,
        projectedKirk
      },
      actionItems: items.sort((a, b) => (a.type === 'urgent' ? -1 : 1)).slice(0, 6),
      recentActivity: activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8),
      pipelineHealth: health,
      leadHealth
    };
  }, [transactions, leads, currentDate]);

  // Upcoming Deadlines (Keep existing logic but scoped)
  const upcomingDeadlines = useMemo(() => {
    const allDates: { id: string, dealName: string, label: string, date: Date, type: 'critical' | 'custom' | 'reminder', isLead?: boolean }[] = [];
    const today = new Date();
    
    transactions.filter(t => t.stage !== 'Closed' && !t.isDeleted).forEach(t => {
      if (t.psaDate) allDates.push({ id: t.id, dealName: t.dealName, label: 'PSA Date', date: parseISO(t.psaDate), type: 'critical' });
      if (t.feasibilityDate) allDates.push({ id: t.id, dealName: t.dealName, label: 'Feasibility', date: parseISO(t.feasibilityDate), type: 'critical' });
      if (t.coeDate) allDates.push({ id: t.id, dealName: t.dealName, label: 'COE', date: parseISO(t.coeDate), type: 'critical' });
      t.customDates.forEach(d => {
        if (!d.completed) allDates.push({ id: t.id, dealName: t.dealName, label: d.label, date: parseISO(d.date), type: 'custom' });
      });
    });

    // Include reminders from ALL transactions (including Closed)
    transactions.filter(t => !t.isDeleted).forEach(t => {
      t.reminders?.forEach(r => {
        if (!r.completed) allDates.push({ id: t.id, dealName: t.dealName, label: r.description || 'Follow Up', date: parseISO(r.date), type: 'reminder', isLead: false });
      });
    });

    leads.filter(l => !l.isDeleted).forEach(l => {
        l.reminders?.forEach(r => {
            if (!r.completed) {
                allDates.push({ 
                    id: l.id, 
                    dealName: l.projectName, 
                    label: r.description || 'Follow Up', 
                    date: parseISO(r.date), 
                    type: 'reminder',
                    isLead: true
                });
            }
        });
    });

    const overdue = allDates
      .filter(d => d.date < today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const upcoming = allDates
      .filter(d => d.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);

    return { upcoming, overdue };
  }, [transactions, leads]);

  // Commission Forecast by Month (next 6 months based on COE dates)
  const commissionForecast = useMemo(() => {
    const today = new Date();
    const months: { month: string, trey: number, kirk: number, total: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const m = addMonths(today, i);
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      let trey = 0, kirk = 0;
      transactions.filter(t => !t.isDeleted && t.coeDate).forEach(t => {
        const coe = parseISO(t.coeDate);
        if (isWithinInterval(coe, { start: mStart, end: mEnd })) {
          const gross = t.price * (t.grossCommissionPercent / 100);
          const treyGross = gross * (t.treySplitPercent / 100);
          const kirkGross = gross * (t.kirkSplitPercent / 100);
          trey += treyGross * (1 - (t.treyLaoPercent ?? 35) / 100);
          kirk += kirkGross * (1 - (t.kirkLaoPercent ?? 30) / 100);
        }
      });
      months.push({ month: format(m, 'MMM'), trey: Math.round(trey), kirk: Math.round(kirk), total: Math.round(trey + kirk) });
    }
    return months;
  }, [transactions]);

  // Pipeline value by stage (for pie chart)
  const pipelineByStage = useMemo(() => {
    const stages: Record<string, number> = {};
    transactions.filter(t => t.stage !== 'Closed' && !t.isDeleted).forEach(t => {
      const gross = t.price * (t.grossCommissionPercent / 100);
      stages[t.stage] = (stages[t.stage] || 0) + gross;
    });
    return Object.entries(stages).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [transactions]);

  // Commission breakdown per deal (for bar chart, top 5 active deals)
  const commissionByDeal = useMemo(() => {
    return transactions
      .filter(t => t.stage !== 'Closed' && !t.isDeleted)
      .map(t => {
        const gross = t.price * (t.grossCommissionPercent / 100);
        const treyGross = gross * (t.treySplitPercent / 100);
        const kirkGross = gross * (t.kirkSplitPercent / 100);
        const laoFromTrey = treyGross * ((t.treyLaoPercent ?? 35) / 100);
        const laoFromKirk = kirkGross * ((t.kirkLaoPercent ?? 30) / 100);
        return {
          name: t.dealName.length > 15 ? t.dealName.substring(0, 15) + '...' : t.dealName,
          trey: Math.round(treyGross - laoFromTrey),
          kirk: Math.round(kirkGross - laoFromKirk),
          lao: Math.round(laoFromTrey + laoFromKirk),
        };
      })
      .sort((a, b) => (b.trey + b.kirk + b.lao) - (a.trey + a.kirk + a.lao))
      .slice(0, 6);
  }, [transactions]);

  // Lead conversion funnel
  const leadFunnel = useMemo(() => {
    const allLeads = leads.filter(l => !l.isDeleted);
    return [
      { name: 'Buyer Lead', count: allLeads.filter(l => l.stage === 'Buyer Lead').length, color: '#3b82f6' },
      { name: 'Listing Lead', count: allLeads.filter(l => l.stage === 'Listing Lead').length, color: '#f59e0b' },
      { name: 'Listing', count: allLeads.filter(l => l.stage === 'Listing').length, color: '#8b5cf6' },
      { name: 'Dead', count: allLeads.filter(l => l.stage === 'Dead Lead' || l.stage === 'Dead Listing').length, color: '#94a3b8' },
    ];
  }, [leads]);

  const STAGE_COLORS: Record<string, string> = { LOI: '#94a3b8', Contract: '#6366f1', Escrow: '#f59e0b', Option: '#f97316' };

  // Quick reminder submit handler
  const handleQuickReminderSubmit = () => {
    if (!quickReminderTarget.id || !quickReminderDate || !quickReminderDesc.trim()) return;
    const reminder: LeadReminder = {
      id: Math.random().toString(36).substr(2, 9),
      date: quickReminderDate,
      description: quickReminderDesc,
      completed: false
    };
    onAddReminder?.(quickReminderTarget.id, quickReminderTarget.type, reminder);
    setShowQuickReminder(false);
    setQuickReminderDate('');
    setQuickReminderDesc('');
    setQuickReminderTarget({ id: '', type: 'transaction' });
    setComboSearch('');
    setComboOpen(false);
  };

  // Sorted options for Quick Add Reminder combobox
  const sortedDealOptions = useMemo(() =>
    transactions.filter(t => !t.isDeleted).sort((a, b) => a.dealName.localeCompare(b.dealName)),
    [transactions]
  );
  const sortedLeadOptions = useMemo(() =>
    leads.filter(l => !l.isDeleted).sort((a, b) => a.projectName.localeCompare(b.projectName)),
    [leads]
  );

  // Filtered recent activity (for notes search)
  const filteredActivity = useMemo(() => {
    if (!notesSearch) return recentActivity;
    const lower = notesSearch.toLowerCase();
    return recentActivity.filter(a =>
      a.content.toLowerCase().includes(lower) ||
      a.sourceName.toLowerCase().includes(lower)
    );
  }, [recentActivity, notesSearch]);

  // All notes across all deals/leads for global search
  const allNotes = useMemo(() => {
    if (!notesSearch) return [];
    const lower = notesSearch.toLowerCase();
    const notes: typeof recentActivity = [];
    [...transactions.filter(t => !t.isDeleted), ...leads.filter(l => !l.isDeleted)].forEach(obj => {
      const isLead = 'projectName' in obj;
      obj.notesLog?.forEach(note => {
        if (note.content.toLowerCase().includes(lower) || (isLead ? (obj as Lead).projectName : (obj as Transaction).dealName).toLowerCase().includes(lower)) {
          notes.push({
            id: note.id,
            sourceId: obj.id,
            sourceName: isLead ? (obj as Lead).projectName : (obj as Transaction).dealName,
            content: note.content,
            date: note.date,
            isLead
          });
        }
      });
    });
    return notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);
  }, [transactions, leads, notesSearch]);

  const displayedActivity = notesSearch ? allNotes : filteredActivity;

  const getEventsForDay = (date: Date) => {
    const events: { id: string, dealName: string, type: string, label: string, isLead?: boolean }[] = [];
    transactions.filter(t => !t.isDeleted).forEach(t => {
      if (t.coeDate && isSameDay(parseISO(t.coeDate), date)) events.push({ id: t.id, dealName: t.dealName, type: 'critical', label: 'COE' });
      if (t.feasibilityDate && isSameDay(parseISO(t.feasibilityDate), date)) events.push({ id: t.id, dealName: t.dealName, type: 'critical', label: 'Feas' });
      if (t.psaDate && isSameDay(parseISO(t.psaDate), date)) events.push({ id: t.id, dealName: t.dealName, type: 'critical', label: 'PSA' });
      t.customDates.forEach(d => { if (d.date && isSameDay(parseISO(d.date), date)) events.push({ id: t.id, dealName: t.dealName, type: 'custom', label: d.label }); });
      t.reminders?.forEach(r => { if (r.date && isSameDay(parseISO(r.date), date)) events.push({ id: t.id, dealName: t.dealName, type: 'reminder', label: r.description || 'Follow Up', isLead: false }); });
    });
    leads.filter(l => !l.isDeleted).forEach(l => {
        l.reminders?.forEach(r => { if (r.date && isSameDay(parseISO(r.date), date)) events.push({ id: l.id, dealName: l.projectName, type: 'reminder', label: r.description || 'Follow Up', isLead: true }); });
    });
    return events;
  };

  // Compute all calendar events for ICS export
  const getAllCalendarEventsForICS = (): { title: string, start: Date, description?: string }[] => {
    const events: { title: string, start: Date, description?: string }[] = [];
    transactions.filter(t => !t.isDeleted).forEach(t => {
      if (t.coeDate) events.push({ title: `COE: ${t.dealName}`, start: parseISO(t.coeDate), description: t.address || '' });
      if (t.psaDate) events.push({ title: `PSA: ${t.dealName}`, start: parseISO(t.psaDate), description: t.address || '' });
      if (t.feasibilityDate) events.push({ title: `Feasibility: ${t.dealName}`, start: parseISO(t.feasibilityDate), description: t.address || '' });
      t.customDates.forEach(d => { if (d.date) events.push({ title: `${d.label}: ${t.dealName}`, start: parseISO(d.date) }); });
      t.reminders?.forEach(r => { if (r.date && !r.completed) events.push({ title: `${r.description || 'Follow Up'}: ${t.dealName}`, start: parseISO(r.date) }); });
    });
    leads.filter(l => !l.isDeleted).forEach(l => {
      l.reminders?.forEach(r => { if (r.date && !r.completed) events.push({ title: `${r.description || 'Follow Up'}: ${l.projectName}`, start: parseISO(r.date) }); });
    });
    return events;
  };

  const handleICSExport = () => {
    const today = new Date();
    const allEvents = getAllCalendarEventsForICS();
    let filtered = allEvents;
    if (icsScope === 'future') {
      filtered = allEvents.filter(e => !isBefore(e.start, today) || isSameDay(e.start, today));
    } else if (icsScope === 'months') {
      filtered = allEvents.filter(e => icsSelectedMonths.includes(format(e.start, 'yyyy-MM')));
    }
    if (filtered.length === 0) return;
    const ics = generateICS(filtered);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lao-pipeline-calendar.ics';
    a.click();
    URL.revokeObjectURL(url);
    setShowICSModal(false);
    setICSSelectedMonths([]);
  };

  // Months that have events (for "Select Specific Months" option)
  const monthsWithEvents = useMemo(() => {
    const allEvents = getAllCalendarEventsForICS();
    const monthSet = new Set<string>();
    allEvents.forEach(e => monthSet.add(format(e.start, 'yyyy-MM')));
    return Array.from(monthSet).sort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, leads]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Bento Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => onNavigate?.('pipeline')} className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between min-h-[160px] cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all">
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Active Pipeline Value</p>
                <h3 className="text-3xl font-bold tracking-tight">{formatCurrency(metrics.activePipelineValue)}</h3>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mt-4">
                <TrendingUp className="w-4 h-4" />
                <span>Gross Potential Commission</span>
            </div>
        </div>

        <div onClick={() => onNavigate?.('pipeline')} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[160px] cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all">
            <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Active Pipeline</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-slate-900">{metrics.activeCount}</h3>
                    <span className="text-slate-400 text-sm font-medium">Deals</span>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-1 mt-4">
                {Object.entries(pipelineHealth).map(([stage, count]) => (
                    <div key={stage} className="flex flex-col">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full",
                                    stage === 'Escrow' ? "bg-emerald-500" : stage === 'Contract' ? "bg-indigo-500" : "bg-amber-500"
                                )}
                                style={{ width: `${((count as number) / metrics.activeCount) * 100}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 truncate">{stage}</span>
                    </div>
                ))}
            </div>
        </div>

        <div onClick={() => onNavigate?.('leads')} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[160px] cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all">
            <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Lead Engagement</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-slate-900">{metrics.leadCount}</h3>
                    <span className="text-slate-400 text-sm font-medium">Active Leads</span>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-1 mt-4">
                {Object.entries(leadHealth).map(([stage, count]) => (
                    <div key={stage} className="flex flex-col">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full",
                                    stage === 'Listing' ? "bg-purple-500" : stage === 'Listing Lead' ? "bg-amber-500" : stage === 'Buyer Lead' ? "bg-blue-500" : "bg-slate-400"
                                )}
                                style={{ width: `${metrics.leadCount > 0 ? ((count as number) / metrics.leadCount) * 100 : 0}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 truncate">{stage === 'Listing' ? 'Listing' : stage === 'Listing Lead' ? 'Lst Lead' : stage === 'Buyer Lead' ? 'Buyer' : 'Dead'}</span>
                    </div>
                ))}
            </div>
        </div>

        <div onClick={() => onNavigate?.('pipeline')} className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between min-h-[160px] cursor-pointer hover:bg-indigo-700 transition-all">
            <div>
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Projected Commission</p>
                <h3 className="text-3xl font-bold tracking-tight">{formatCurrency(metrics.projectedTrey + metrics.projectedKirk)}</h3>
            </div>
            <div className="flex items-end gap-4 mt-4 h-12">
                <div className="flex-1 flex flex-col justify-end gap-1">
                    <div className="w-full bg-indigo-400/50 rounded-t relative" style={{ height: `${(metrics.projectedKirk / (metrics.projectedKirk + metrics.projectedTrey)) * 100}%`, minHeight: '4px' }} />
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-indigo-200 font-bold uppercase">Kirk</span>
                        <span className="text-[10px] font-bold text-white">{formatCurrency(metrics.projectedKirk).split('.')[0]}</span>
                    </div>
                </div>
                <div className="flex-1 flex flex-col justify-end gap-1">
                    <div className="w-full bg-emerald-400/80 rounded-t relative" style={{ height: `${(metrics.projectedTrey / (metrics.projectedKirk + metrics.projectedTrey)) * 100}%`, minHeight: '4px' }} />
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-indigo-200 font-bold uppercase">Trey</span>
                        <span className="text-[10px] font-bold text-white">{formatCurrency(metrics.projectedTrey).split('.')[0]}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Closing in [Month] — synced with calendar below */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-500" />
                Closing in
                <div className="flex items-center gap-1 ml-1">
                  <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-0.5 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronRight className="w-3.5 h-3.5 rotate-180 text-slate-500" />
                  </button>
                  <span className="font-bold text-indigo-600 w-24 text-center">{format(currentDate, 'MMMM yyyy')}</span>
                  <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-0.5 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">{metrics.monthlyDeals.length} {metrics.monthlyDeals.length === 1 ? 'Deal' : 'Deals'}</span>
            </div>
            {metrics.monthlyDeals.length === 0 ? (
              <div className="flex items-center justify-center text-slate-400 text-sm py-6 gap-2">
                <CalendarIcon className="w-5 h-5 opacity-30" />
                <span className="italic">No deals closing in {format(currentDate, 'MMMM')}.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.monthlyDeals.map(deal => {
                  const gross = deal.price * (deal.grossCommissionPercent / 100);
                  const percentOfTotal = metrics.monthlyGross > 0 ? (gross / metrics.monthlyGross) * 100 : 0;
                  return (
                    <div key={deal.id} className="group cursor-pointer" onClick={() => onSelectDeal(deal.id)}>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-700 group-hover:text-indigo-600 transition-colors truncate pr-2">{deal.dealName}</span>
                        <span className="text-slate-900 shrink-0">{formatCurrency(gross)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${percentOfTotal}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">
                        <span>COE {format(parseISO(deal.coeDate), 'MMM d')}</span>
                        <span>{Math.round(percentOfTotal)}% of month</span>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 border-t border-slate-100 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Projected</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(metrics.monthlyGross)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Trey's Take</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(metrics.monthlyTrey)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Deadlines Widget — mobile only, shown between Closing in Month and Calendar */}
          <div className="block lg:hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Clock className="w-4 h-4 text-slate-500" /> Deadlines
              </h3>
              <button
                onClick={() => setShowQuickReminder(true)}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase tracking-wider"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {upcomingDeadlines.overdue.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Overdue ({upcomingDeadlines.overdue.length})
                </p>
                <div className="space-y-2">
                  {upcomingDeadlines.overdue.slice(0, 3).map((item, i) => (
                    <div
                      key={`mobile-overdue-${i}`}
                      className="flex items-start gap-3 p-2.5 bg-red-50 rounded-xl border border-red-100 cursor-pointer hover:bg-red-100 transition-all"
                      onClick={() => item.isLead ? onSelectLead(item.id) : onSelectDeal(item.id)}
                    >
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-red-500" />
                      <div>
                        <p className="text-xs font-bold text-red-800 leading-tight">{item.label}</p>
                        <p className="text-[10px] text-red-600 font-medium">{item.dealName} — {format(item.date, 'MMM d')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-3">
              {upcomingDeadlines.upcoming.length === 0 && upcomingDeadlines.overdue.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No upcoming deadlines.</p>
              ) : (
                upcomingDeadlines.upcoming.map((item, i) => (
                  <div
                    key={`mobile-upcoming-${i}`}
                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all hover:translate-x-1"
                    onClick={() => item.isLead ? onSelectLead(item.id) : onSelectDeal(item.id)}
                  >
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                      item.type === 'critical' ? "bg-red-500" : item.type === 'reminder' ? "bg-purple-500" : "bg-amber-500"
                    )} />
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-tight">{item.label}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">{item.dealName}</p>
                      <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        <CalendarIcon className="w-3 h-3" />
                        {format(item.date, 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Deal Calendar — month nav is shared with widget above */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <CalendarIcon className="w-4 h-4 text-slate-500" /> Deal Calendar
              </h2>
              <div className="flex items-center gap-2">
                {/* Month/Year navigation with popup picker */}
                <div className="flex items-center gap-1 relative">
                  <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setShowMonthPicker(v => !v); setMonthPickerYear(currentDate.getFullYear()); }}
                    className="text-xs font-bold w-28 text-center uppercase tracking-tighter hover:text-indigo-600 hover:bg-indigo-50 rounded-md px-2 py-1 transition-colors"
                  >
                    {format(currentDate, 'MMMM yyyy')}
                  </button>
                  <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {/* Month Picker Popup */}
                  {showMonthPicker && (
                    <div className="absolute top-full right-0 mt-1 z-50 bg-white rounded-xl border border-slate-200 shadow-xl p-3 w-64">
                      <div className="flex items-center justify-between mb-2">
                        <button onClick={() => setMonthPickerYear(y => y - 1)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                          <ChevronLeft className="w-4 h-4 text-slate-500" />
                        </button>
                        <span className="text-sm font-bold text-slate-800">{monthPickerYear}</span>
                        <button onClick={() => setMonthPickerYear(y => y + 1)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => {
                          const isSelected = currentDate.getMonth() === i && currentDate.getFullYear() === monthPickerYear;
                          return (
                            <button
                              key={m}
                              onClick={() => { setCurrentDate(new Date(monthPickerYear, i, 1)); setShowMonthPicker(false); }}
                              className={cn(
                                "py-1.5 rounded-lg text-xs font-semibold transition-colors",
                                isSelected ? "bg-indigo-600 text-white" : "hover:bg-indigo-50 text-slate-700"
                              )}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {/* Export ICS button */}
                <button
                  onClick={() => setShowICSModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export .ics
                </button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-7 gap-px bg-slate-100">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-slate-50 p-2 text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
                  {day}
                </div>
              ))}
              {eachDayOfInterval({
                start: startOfMonth(currentDate),
                end: endOfMonth(currentDate)
              }).map((day) => {
                const events = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                return (
                  <div key={day.toISOString()} className={cn(
                    "bg-white min-h-[110px] p-2 flex flex-col gap-1 transition-colors border border-slate-50",
                    !isCurrentMonth && "bg-slate-50/50 opacity-40"
                  )}>
                    <span className={cn(
                      "text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full mb-1",
                      isToday ? "bg-indigo-600 text-white" : "text-slate-400"
                    )}>
                      {format(day, 'd')}
                    </span>
                    <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                      {events.map((event, idx) => (
                        <button
                          key={`${event.id}-${idx}`}
                          onClick={() => event.isLead ? onSelectLead(event.id) : onSelectDeal(event.id)}
                          className={cn(
                            "text-[9px] p-1 rounded border truncate w-full text-left transition-all hover:scale-[1.02] font-medium",
                            event.type === 'critical'
                              ? (event.label === 'COE' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100")
                              : event.type === 'reminder'
                                ? "bg-purple-50 text-purple-700 border-purple-100"
                                : "bg-indigo-50 text-indigo-700 border-indigo-100"
                          )}
                        >
                          <span className="font-bold opacity-70">{event.label}:</span> {event.dealName}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Commission Forecast Timeline Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-slate-500" /> Commission Forecast (6 Months)
              </h2>
            </div>
            <div className="p-4" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={commissionForecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="kirk" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} name="Kirk" />
                  <Area type="monotone" dataKey="trey" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Trey" />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider shrink-0">
                <History className="w-4 h-4 text-slate-500" /> {(actionLog && actionLog.length > 0) ? 'Recent Actions' : (notesSearch ? 'Notes Search' : 'Recent Developments')}
              </h2>
              {!(actionLog && actionLog.length > 0) && (
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search all notes..."
                    value={notesSearch}
                    onChange={(e) => setNotesSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {actionLog && actionLog.length > 0 ? (
                actionLog.slice(0, 8).map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => entry.entityType === 'lead' ? onSelectLead(entry.entityId) : onSelectDeal(entry.entityId)}
                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter", ACTION_COLORS[entry.type])}>{ACTION_LABELS[entry.type]}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{format(parseISO(entry.timestamp), 'MMM d, h:mm a')}</span>
                      </div>
                      <div className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter", entry.entityType === 'lead' ? "bg-purple-100 text-purple-700" : "bg-indigo-100 text-indigo-700")}>
                        {entry.entityType === 'lead' ? 'Lead' : 'Deal'}
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2 group-hover:text-slate-900 transition-colors font-medium">{entry.entityName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{entry.description}</p>
                  </div>
                ))
              ) : displayedActivity.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-sm">{notesSearch ? 'No notes matching your search.' : 'No recent activity logged.'}</div>
              ) : (
                displayedActivity.map((act, i) => (
                  <div
                    key={i}
                    onClick={() => act.isLead ? onSelectLead(act.sourceId) : onSelectDeal(act.sourceId)}
                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight">{act.sourceName}</span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[10px] text-slate-400 font-medium">{format(parseISO(act.date), 'MMM d, h:mm a')}</span>
                      </div>
                      <div className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter",
                        act.isLead ? "bg-purple-100 text-purple-700" : "bg-indigo-100 text-indigo-700"
                      )}>
                        {act.isLead ? 'Lead' : 'Deal'}
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2 group-hover:text-slate-900 transition-colors">{act.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="hidden lg:flex flex-col gap-6">
          {/* Deadlines Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Clock className="w-4 h-4 text-slate-500" /> Deadlines
              </h3>
              <button
                onClick={() => setShowQuickReminder(true)}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase tracking-wider"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {/* Overdue Items */}
            {upcomingDeadlines.overdue.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Overdue ({upcomingDeadlines.overdue.length})
                </p>
                <div className="space-y-2">
                  {upcomingDeadlines.overdue.slice(0, 3).map((item, i) => (
                    <div
                      key={`overdue-${i}`}
                      className="flex items-start gap-3 p-2.5 bg-red-50 rounded-xl border border-red-100 cursor-pointer hover:bg-red-100 transition-all"
                      onClick={() => item.isLead ? onSelectLead(item.id) : onSelectDeal(item.id)}
                    >
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-red-500" />
                      <div>
                        <p className="text-xs font-bold text-red-800 leading-tight">{item.label}</p>
                        <p className="text-[10px] text-red-600 font-medium">{item.dealName} — {format(item.date, 'MMM d')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Items */}
            <div className="space-y-3">
              {upcomingDeadlines.upcoming.length === 0 && upcomingDeadlines.overdue.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No upcoming deadlines.</p>
              ) : (
                upcomingDeadlines.upcoming.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all hover:translate-x-1"
                    onClick={() => item.isLead ? onSelectLead(item.id) : onSelectDeal(item.id)}
                  >
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                      item.type === 'critical' ? "bg-red-500" : item.type === 'reminder' ? "bg-purple-500" : "bg-amber-500"
                    )} />
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-tight">{item.label}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">{item.dealName}</p>
                      <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        <CalendarIcon className="w-3 h-3" />
                        {format(item.date, 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Inbox Preview Widget */}
          {inboxItems && inboxItems.filter(i => !i.isDeleted).length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Inbox className="w-4 h-4 text-slate-500" /> Inbox
                  {inboxItems.filter(i => !i.isRead && !i.isDeleted).length > 0 && (
                    <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                      {inboxItems.filter(i => !i.isRead && !i.isDeleted).length}
                    </span>
                  )}
                </h3>
                {onNavigateToInbox && (
                  <button onClick={onNavigateToInbox} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase tracking-wider">
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {inboxItems.filter(i => !i.isDeleted).slice(0, 4).map(email => (
                  <div key={email.id} onClick={onNavigateToInbox} className={cn("flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer hover:bg-slate-50 transition-all", email.isRead ? "border-slate-100" : "border-indigo-100 bg-indigo-50/40")}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: email.avatarColor || '#6366f1' }}>
                      {(email.fromName || email.from).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={cn("text-xs leading-tight truncate", email.isRead ? "text-slate-600" : "font-bold text-slate-900")}>{email.fromName || email.from}</p>
                        {!email.isRead && <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{email.subject}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bulletin Board / Global Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <CheckSquare className="w-4 h-4 text-slate-500" /> Bulletin Board
              </h3>
              {(bulletinItems || []).filter(i => i.completed).length > 0 && (
                <button
                  onClick={() => (bulletinItems || []).filter(i => i.completed).forEach(i => onDeleteBulletinItem?.(i.id))}
                  className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-wider transition-colors"
                >
                  Clear Done
                </button>
              )}
            </div>

            {/* Add item input */}
            <form
              onSubmit={e => {
                e.preventDefault();
                const text = bulletinInput.trim();
                if (text && onAddBulletinItem) {
                  onAddBulletinItem(text, bulletinDeal || undefined, (bulletinPerson as 'Trey' | 'Kirk' | 'Pete') || undefined);
                  setBulletinInput('');
                  setBulletinDeal('');
                  setBulletinPerson('');
                }
              }}
              className="space-y-2 mb-4"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bulletinInput}
                  onChange={e => setBulletinInput(e.target.value)}
                  placeholder="Add a to-do item..."
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!bulletinInput.trim()}
                  className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  value={bulletinDeal}
                  onChange={e => setBulletinDeal(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-600"
                >
                  <option value="">Assign to deal (optional)</option>
                  {transactions.filter(t => !t.isDeleted).map(t => (
                    <option key={t.id} value={t.id}>{t.dealName}</option>
                  ))}
                </select>
                <select
                  value={bulletinPerson}
                  onChange={e => setBulletinPerson(e.target.value as 'Trey' | 'Kirk' | 'Pete' | '')}
                  className="w-28 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-600"
                >
                  <option value="">Assignee</option>
                  <option value="Trey">Trey</option>
                  <option value="Kirk">Kirk</option>
                  <option value="Pete">Pete</option>
                </select>
              </div>
            </form>

            {/* Items list */}
            {(bulletinItems || []).length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No items yet. Add something above.</p>
            ) : (
              <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {(bulletinItems || []).map(item => {
                  const assignedTxn = item.transactionId ? transactions.find(t => t.id === item.transactionId) : null;
                  return (
                  <li key={item.id} className="flex items-start gap-2 group">
                    <button
                      onClick={() => onToggleBulletinItem?.(item.id)}
                      className={cn(
                        "mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
                        item.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-indigo-400"
                      )}
                    >
                      {item.completed && <Check className="w-2.5 h-2.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-xs leading-relaxed break-words block", item.completed ? "line-through text-slate-400" : "text-slate-700")}>
                        {item.text}
                      </span>
                      {(assignedTxn || item.assignedTo) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {assignedTxn && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 truncate max-w-[120px]" title={assignedTxn.dealName}>
                              🏢 {assignedTxn.dealName}
                            </span>
                          )}
                          {item.assignedTo && (
                            <span className={cn(
                              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border",
                              item.assignedTo === 'Trey' ? "bg-amber-50 text-amber-700 border-amber-100" :
                              item.assignedTo === 'Kirk' ? "bg-sky-50 text-sky-700 border-sky-100" :
                              "bg-emerald-50 text-emerald-700 border-emerald-100"
                            )}>
                              👤 {item.assignedTo}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteBulletinItem?.(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 text-slate-300 transition-all shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                  );
                })}
              </ul>
            )}

            {/* Summary footer */}
            {(bulletinItems || []).length > 0 && (
              <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-100 font-medium">
                {(bulletinItems || []).filter(i => i.completed).length} / {(bulletinItems || []).length} completed
              </p>
            )}
          </div>
        </div>
      </div>

    {/* Quick Add Reminder Modal */}
    {showQuickReminder && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { setShowQuickReminder(false); setComboSearch(''); setComboOpen(false); setQuickReminderTarget({ id: '', type: 'transaction' }); }}>
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Add Reminder</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Deal or Lead</label>
              <div className="relative">
                <input
                  type="text"
                  value={comboSearch}
                  onChange={e => { setComboSearch(e.target.value); setComboOpen(true); }}
                  onFocus={() => setComboOpen(true)}
                  onBlur={() => setTimeout(() => setComboOpen(false), 150)}
                  placeholder="Search deals and leads..."
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  autoComplete="off"
                />
                {comboOpen && (() => {
                  const q = comboSearch.toLowerCase();
                  const filtDeals = sortedDealOptions.filter(t => t.dealName.toLowerCase().includes(q));
                  const filtLeads = sortedLeadOptions.filter(l => l.projectName.toLowerCase().includes(q));
                  if (filtDeals.length === 0 && filtLeads.length === 0) return (
                    <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 px-3 py-2 text-sm text-slate-400">No matches found</div>
                  );
                  return (
                    <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                      {filtDeals.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 sticky top-0">Deals</div>
                          {filtDeals.map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onMouseDown={() => { setQuickReminderTarget({ type: 'transaction', id: t.id }); setComboSearch(t.dealName); setComboOpen(false); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                            >{t.dealName}</button>
                          ))}
                        </>
                      )}
                      {filtLeads.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 sticky top-0">Leads</div>
                          {filtLeads.map(l => (
                            <button
                              key={l.id}
                              type="button"
                              onMouseDown={() => { setQuickReminderTarget({ type: 'lead', id: l.id }); setComboSearch(l.projectName); setComboOpen(false); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                            >{l.projectName}</button>
                          ))}
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
              <input type="date" value={quickReminderDate} onChange={e => setQuickReminderDate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
              <input type="text" value={quickReminderDesc} onChange={e => setQuickReminderDesc(e.target.value)} placeholder="e.g. Call buyer re: LOI" className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => { setShowQuickReminder(false); setComboSearch(''); setComboOpen(false); setQuickReminderTarget({ id: '', type: 'transaction' }); }} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">Cancel</button>
            <button onClick={handleQuickReminderSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors" disabled={!quickReminderTarget.id || !quickReminderDate || !quickReminderDesc.trim()}>Add Reminder</button>
          </div>
        </div>
      </div>
    )}

    {/* Month picker backdrop */}
    {showMonthPicker && (
      <div className="fixed inset-0 z-40" onClick={() => setShowMonthPicker(false)} />
    )}

    {/* ICS Export Modal */}
    {showICSModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-600" /> Export Calendar (.ics)
            </h3>
            <button onClick={() => { setShowICSModal(false); setICSSelectedMonths([]); }} className="p-1 hover:bg-slate-100 rounded-full">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <p className="text-sm text-slate-500 mb-4">Choose which events to include in the export.</p>
          <div className="space-y-2 mb-5">
            {([
              { value: 'all', label: 'Entire Calendar', desc: 'All events across all transactions and leads' },
              { value: 'future', label: 'Future Dates Only', desc: 'Only events on or after today' },
              { value: 'months', label: 'Select Specific Months', desc: 'Choose individual months to export' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => setICSScope(opt.value)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-colors",
                  icsScope === opt.value ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn("w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0", icsScope === opt.value ? "border-indigo-600" : "border-slate-300")}>
                    {icsScope === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
                    <p className="text-xs text-slate-500">{opt.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {icsScope === 'months' && (
            <div className="mb-5">
              {monthsWithEvents.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No events found in any month.</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {monthsWithEvents.map(ym => {
                    const [y, m] = ym.split('-');
                    const label = format(new Date(parseInt(y), parseInt(m) - 1, 1), 'MMM yyyy');
                    const isSelected = icsSelectedMonths.includes(ym);
                    return (
                      <button
                        key={ym}
                        onClick={() => setICSSelectedMonths(prev => isSelected ? prev.filter(x => x !== ym) : [...prev, ym])}
                        className={cn(
                          "py-2 px-1 text-xs font-semibold rounded-lg border transition-colors",
                          isSelected ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowICSModal(false); setICSSelectedMonths([]); }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
            <button
              onClick={handleICSExport}
              disabled={icsScope === 'months' && icsSelectedMonths.length === 0}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

const LEAD_STAGE_COLORS: Record<LeadStage, string> = {
  'Buyer Lead': 'border-blue-300 bg-blue-50',
  'Listing Lead': 'border-amber-300 bg-amber-50',
  'Listing': 'border-purple-300 bg-purple-50',
  'Dead Lead': 'border-slate-300 bg-slate-50',
  'Dead Listing': 'border-red-200 bg-red-50',
};
const LEAD_STAGE_CARD_ACCENT: Record<LeadStage, string> = {
  'Buyer Lead': 'border-l-blue-400',
  'Listing Lead': 'border-l-amber-400',
  'Listing': 'border-l-purple-400',
  'Dead Lead': 'border-l-slate-400',
  'Dead Listing': 'border-l-red-300',
};
const LEAD_STAGE_BADGE: Record<LeadStage, string> = {
  'Buyer Lead': 'bg-blue-100 text-blue-700',
  'Listing Lead': 'bg-amber-100 text-amber-700',
  'Listing': 'bg-purple-100 text-purple-700',
  'Dead Lead': 'bg-slate-100 text-slate-600',
  'Dead Listing': 'bg-red-100 text-red-600',
};
// Which stages a lead can be dragged into from a given stage
const LEAD_VALID_TRANSITIONS: Record<LeadStage, LeadStage[]> = {
  'Buyer Lead': ['Dead Lead'],
  'Listing Lead': ['Listing', 'Dead Listing'],
  'Listing': ['Listing Lead', 'Dead Listing'],
  'Dead Lead': ['Buyer Lead'],
  'Dead Listing': ['Listing Lead', 'Listing'],
};

const LeadsView = ({
  leads,
  onSelectLead,
  onDeleteLead,
  onBatchDelete,
  onUpdateLead,
  onConvertLeadToTransaction,
}: {
  leads: Lead[],
  onSelectLead: (id: string) => void,
  onDeleteLead: (id: string) => void,
  onBatchDelete: (ids: string[]) => void,
  onUpdateLead?: (l: Lead) => void,
  onConvertLeadToTransaction?: (lead: Lead) => void,
}) => {
  const [search, setSearch] = useState('');
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [isDragOverLOI, setIsDragOverLOI] = useState(false);
  const [drawerLeads, setDrawerLeads] = useState<Lead[] | null>(null);

  const kanbanStages: LeadStage[] = ['Buyer Lead', 'Listing Lead', 'Listing', 'Dead Lead', 'Dead Listing'];

  const handleDragStart = (leadId: string) => setDragLeadId(leadId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDragEnd = () => { setDragLeadId(null); setIsDragOverLOI(false); };

  const handleDrop = (targetStage: LeadStage) => {
    if (!dragLeadId || !onUpdateLead) return;
    const lead = leads.find(l => l.id === dragLeadId);
    if (lead && lead.stage !== targetStage && LEAD_VALID_TRANSITIONS[lead.stage]?.includes(targetStage)) {
      onUpdateLead({ ...lead, stage: targetStage });
    }
    setDragLeadId(null);
    setIsDragOverLOI(false);
  };

  const handleDropLOI = () => {
    if (!dragLeadId || !onConvertLeadToTransaction) return;
    const lead = leads.find(l => l.id === dragLeadId);
    if (lead) onConvertLeadToTransaction(lead);
    setDragLeadId(null);
    setIsDragOverLOI(false);
  };

  const activeLeads = useMemo(() => leads.filter(l => !l.convertedToTransactionId), [leads]);
  const convertedLeads = useMemo(() => leads.filter(l => !!l.convertedToTransactionId), [leads]);
  const draggedLead = dragLeadId ? leads.find(l => l.id === dragLeadId) : null;

  const filteredActiveLeads = useMemo(() => {
    if (!search) return activeLeads;
    const lower = search.toLowerCase();
    return activeLeads.filter(l =>
      l.projectName.toLowerCase().includes(lower) ||
      l.contactName.toLowerCase().includes(lower) ||
      (l.description || '').toLowerCase().includes(lower) ||
      getLeadSummary(l).toLowerCase().includes(lower)
    );
  }, [activeLeads, search]);

  const exportCSV = () => {
    const headers = ['Lead Stage', 'Project Name', 'Contact', 'Contact Role', 'Contact Phone', 'Contact Email', 'Description', 'Est Value', 'Assigned Agent', 'Last Spoke', 'Summary of Discussion'];
    const rows = filteredActiveLeads.map(l => [l.stage, l.projectName, l.contactName, l.contactRole || '', l.contactPhone || '', l.contactEmail || '', l.description || '', l.estValue ?? '', l.assignedAgent || '', l.lastSpokeDate || '', getLeadSummary(l) || '']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_export.csv';
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads Tracker</h1>
          <p className="text-slate-500">Drag leads between stages, or drop into the LOI zone to convert to a transaction.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={exportCSV}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200 shrink-0"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* LOI Conversion Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOverLOI(true); }}
        onDragLeave={() => setIsDragOverLOI(false)}
        onDrop={handleDropLOI}
        className={cn(
          "rounded-xl border-2 border-dashed p-4 flex items-center gap-3 transition-all select-none",
          isDragOverLOI
            ? "border-indigo-500 bg-indigo-100 shadow-lg scale-[1.01]"
            : dragLeadId
            ? "border-indigo-300 bg-indigo-50 animate-pulse"
            : "border-slate-200 bg-slate-50"
        )}
      >
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
          isDragOverLOI ? "bg-indigo-600" : "bg-indigo-100"
        )}>
          <GitMerge className={cn("w-5 h-5", isDragOverLOI ? "text-white" : "text-indigo-500")} />
        </div>
        <div>
          <p className={cn("font-semibold text-sm", isDragOverLOI ? "text-indigo-700" : "text-slate-600")}>
            {isDragOverLOI ? "Release to Convert → Pipeline (LOI)" : "Drop Here to Convert Lead → Pipeline (LOI)"}
          </p>
          <p className="text-xs text-slate-400">Creates a new transaction at LOI stage and marks the lead as converted.</p>
        </div>
        {!dragLeadId && onConvertLeadToTransaction && (
          <div className="ml-auto text-[10px] text-slate-400 hidden sm:block">Drag any lead card here</div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kanbanStages.map(stage => {
          const stageLeads = filteredActiveLeads.filter(l => l.stage === stage);
          const isValidDragTarget = !!(draggedLead && draggedLead.stage !== stage && LEAD_VALID_TRANSITIONS[draggedLead.stage]?.includes(stage));
          return (
            <div
              key={stage}
              className={cn(
                "rounded-xl border-2 border-dashed p-3 min-h-[200px] transition-colors",
                LEAD_STAGE_COLORS[stage],
                isValidDragTarget ? "border-indigo-400 shadow-md" : ""
              )}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={cn("px-2 py-1 rounded-full text-xs font-bold", LEAD_STAGE_BADGE[stage])}>{stage}</span>
                <span className="text-[10px] font-bold text-slate-400">{stageLeads.length}</span>
              </div>
              <motion.div
                className="space-y-2"
                variants={listContainerVariants}
                initial="hidden"
                animate="visible"
                key={stageLeads.map(l => l.id).join(',')}
              >
                {stageLeads.map(lead => {
                  const daysSince = lead.lastSpokeDate
                    ? Math.floor((Date.now() - parseISO(lead.lastSpokeDate).getTime()) / 86400000)
                    : null;
                  const contactAgeColor = daysSince === null
                    ? 'text-slate-400'
                    : daysSince <= 7 ? 'text-emerald-600'
                    : daysSince <= 30 ? 'text-amber-600'
                    : 'text-red-600';
                  return (
                    <motion.div
                      variants={listItemVariants}
                      key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectLead(lead.id)}
                      className={cn(
                        "bg-white rounded-lg border border-slate-200 border-l-4 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group",
                        LEAD_STAGE_CARD_ACCENT[lead.stage]
                      )}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-900 leading-tight truncate">{lead.projectName}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteLead(lead.id); }}
                          className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 text-slate-300 hover:text-red-500 transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="ml-5 space-y-1">
                        {lead.contactName && <p className="text-[10px] text-slate-600 truncate">{lead.contactName}</p>}
                        {lead.description && <p className="text-[10px] text-slate-400 truncate" title={lead.description}>{lead.description}</p>}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {daysSince !== null ? (
                            <span className={cn("text-[10px] font-semibold flex items-center gap-0.5", contactAgeColor)}>
                              <Clock className="w-2.5 h-2.5" />
                              {daysSince === 0 ? 'Today' : `${daysSince}d ago`}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Never contacted</span>
                          )}
                          {lead.assignedAgent && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">{lead.assignedAgent}</span>
                          )}
                          {lead.estValue ? (
                            <span className="text-[10px] text-emerald-600 font-semibold">{formatCurrency(lead.estValue)}</span>
                          ) : null}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {stageLeads.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center py-6 italic">
                    {isValidDragTarget ? "Drop here" : "No leads"}
                  </p>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Converted Leads Section */}
      {convertedLeads.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Converted to Pipeline ({convertedLeads.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {convertedLeads.map(lead => (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                className="bg-white rounded-lg border border-emerald-200 p-3 cursor-pointer hover:shadow-sm transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{lead.projectName}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {lead.contactName}
                    {lead.convertedAt ? ` · Converted ${format(parseISO(lead.convertedAt), 'MMM d, yyyy')}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Edit Drawer */}
      <AnimatePresence>
        {drawerLeads && onUpdateLead && (
          <QuickEditLeadDrawer
            leads={drawerLeads}
            onSave={(updated) => updated.forEach(l => onUpdateLead(l))}
            onClose={() => setDrawerLeads(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const LeadDetailView = ({
  lead,
  onSave,
  onClose,
  onSelectContact,
}: {
  lead: Lead,
  onSave: (l: Lead) => void,
  onClose: () => void,
  onSelectContact?: (contactId: string) => void,
}) => {
  const [formData, setFormData] = useState<Lead>(lead);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newNoteDate, setNewNoteDate] = useState(new Date().toISOString().slice(0, 16));
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [editingNoteDate, setEditingNoteDate] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState<LeadContact>({ id: '', name: '', role: '', phone: '', email: '' });
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newReminder, setNewReminder] = useState<LeadReminder>({ id: '', date: '', description: '', completed: false });

  // On load: migrate legacy fields
  // - details → description (not an activity log entry)
  // - summary → notesLog (Discussion Summary note, if not already there)
  // - Remove any "Details & Context" notes previously created by old migration
  useEffect(() => {
    let migrated = { ...lead };

    // Remove any "Details & Context" migration notes from notesLog
    const cleanedNotes = (migrated.notesLog || []).filter(n =>
      !n.id.startsWith('mig-d-') && !n.content.startsWith('Details & Context:\n')
    );

    // If description is empty, try to recover it from a "Details & Context" note before removing
    if (!migrated.description?.trim()) {
      const detailsNote = (migrated.notesLog || []).find(n =>
        n.id.startsWith('mig-d-') || n.content.startsWith('Details & Context:\n')
      );
      if (detailsNote) {
        const extracted = detailsNote.content.replace(/^Details & Context:\n/, '');
        migrated = { ...migrated, description: extracted };
      }
    }

    migrated = { ...migrated, notesLog: cleanedNotes };

    // Migrate legacy details field → description (not activity log)
    if (migrated.details?.trim()) {
      if (!migrated.description?.trim()) {
        migrated = { ...migrated, description: migrated.details.trim() };
      }
      migrated = { ...migrated, details: '' };
    }

    // Migrate legacy summary field → notesLog (Discussion Summary note)
    if (migrated.summary?.trim()) {
      const alreadyMigrated = (migrated.notesLog || []).some(n => n.id === `mig-s-${migrated.id}`);
      if (!alreadyMigrated) {
        const summaryNote: Note = {
          id: `mig-s-${migrated.id}`,
          content: `Discussion Summary:\n${migrated.summary.trim()}`,
          date: migrated.lastSpokeDate || new Date().toISOString(),
        };
        migrated = { ...migrated, notesLog: [summaryNote, ...(migrated.notesLog || [])], summary: '' };
      } else {
        migrated = { ...migrated, summary: '' };
      }
    }

    setFormData(migrated);
  }, [lead]);

  const handleInputChange = (field: keyof Lead, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const note: Note = { id: Math.random().toString(36).substr(2, 9), content: newNote, date: new Date(newNoteDate).toISOString() };
    setFormData(prev => ({ ...prev, notesLog: [note, ...(prev.notesLog || [])], lastSpokeDate: new Date(newNoteDate).toISOString() }));
    setNewNote('');
    setNewNoteDate(new Date().toISOString().slice(0, 16));
  };

  const deleteNote = (noteId: string) => {
    setFormData(prev => ({ ...prev, notesLog: prev.notesLog?.filter(n => n.id !== noteId) || [] }));
  };

  const startEditingNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
    setEditingNoteDate(new Date(note.date).toISOString().slice(0, 16));
  };

  const saveEditedNote = () => {
    if (!editingNoteId) return;
    setFormData(prev => ({
      ...prev,
      notesLog: prev.notesLog?.map(n => n.id === editingNoteId ? { ...n, content: editingNoteContent, date: new Date(editingNoteDate).toISOString() } : n) || []
    }));
    setEditingNoteId(null);
  };

  const addContact = () => {
    if (!newContact.name) return;
    const contact: LeadContact = { ...newContact, id: Math.random().toString(36).substr(2, 9) };
    setFormData(prev => ({ ...prev, contacts: [...(prev.contacts || []), contact] }));
    setNewContact({ id: '', name: '', role: '', phone: '', email: '' });
    setIsAddingContact(false);
  };

  const deleteContact = (id: string) => {
    setFormData(prev => ({ ...prev, contacts: prev.contacts?.filter(c => c.id !== id) || [] }));
  };

  const addReminder = () => {
    if (!newReminder.date || !newReminder.description) return;
    const reminder: LeadReminder = { ...newReminder, id: Math.random().toString(36).substr(2, 9) };
    setFormData(prev => ({ ...prev, reminders: [...(prev.reminders || []), reminder] }));
    setNewReminder({ id: '', date: '', description: '', completed: false });
    setIsAddingReminder(false);
  };

  const toggleReminder = (id: string) => {
    setFormData(prev => ({ ...prev, reminders: prev.reminders?.map(r => r.id === id ? { ...r, completed: !r.completed } : r) || [] }));
  };

  const deleteReminder = (id: string) => {
    setFormData(prev => ({ ...prev, reminders: prev.reminders?.filter(r => r.id !== id) || [] }));
  };

  // Derived values
  const sortedNotes = [...(formData.notesLog || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const lastContactedDate = sortedNotes.length > 0
    ? new Date(sortedNotes[0].date)
    : formData.lastSpokeDate ? parseISO(formData.lastSpokeDate) : null;
  const daysSince = lastContactedDate ? Math.floor((Date.now() - lastContactedDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const typeColor = formData.stage === 'Buyer Lead' ? 'bg-blue-100 text-blue-700 border-blue-200' :
    formData.stage === 'Listing Lead' ? 'bg-amber-100 text-amber-700 border-amber-200' :
    formData.stage === 'Listing' ? 'bg-purple-100 text-purple-700 border-purple-200' :
    formData.stage === 'Dead Lead' || formData.stage === 'Dead Listing' ? 'bg-slate-100 text-slate-500 border-slate-200' :
    'bg-slate-100 text-slate-600 border-slate-200';
  const goToContact = (name: string, email?: string) => {
    if (!onSelectContact || !name.trim()) return;
    onSelectContact(email?.trim().toLowerCase() || name.trim().toLowerCase());
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header Card ─────────────────────────────── */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 mt-1">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-slate-900 truncate">{formData.projectName || 'Untitled Lead'}</h1>
                <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full border shrink-0", typeColor)}>{formData.stage}</span>
                {formData.assignedAgent && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">{formData.assignedAgent}</span>
                )}
              </div>
              <p className="text-slate-500 text-sm mb-2 leading-snug">
                {formData.description || <span className="italic text-slate-400">No description — add one in Lead Details</span>}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {daysSince !== null && (
                  <span className={cn("flex items-center gap-1", daysSince > 14 ? "text-amber-600 font-medium" : "text-slate-500")}>
                    <Clock className="w-3 h-3" />
                    {daysSince === 0 ? 'Contacted today' : `${daysSince}d since last contact`}
                  </span>
                )}
                {formData.estValue ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <DollarSign className="w-3 h-3" /> Est. {formatCurrency(formData.estValue)}
                  </span>
                ) : null}
                {formData.contactPhone && (
                  <a href={`tel:${formData.contactPhone}`} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium">
                    <Phone className="w-3 h-3" /> {formData.contactPhone}
                  </a>
                )}
                {formData.contactEmail && (
                  <a href={`mailto:${formData.contactEmail}`} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700">
                    <Mail className="w-3 h-3" /> {formData.contactEmail}
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showSaveSuccess && <span className="text-sm text-emerald-600 font-medium animate-in fade-in">Saved!</span>}
            <button onClick={handleSave} className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm">
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* ── Two-column body ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Sidebar (contact info + details) — left on desktop */}
        <div className="lg:col-span-2 space-y-5 order-1 lg:order-1">

          {/* Lead Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" /> Lead Details
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Lead Stage</label>
              <select value={formData.stage} onChange={e => handleInputChange('stage', e.target.value as LeadStage)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                {(['Buyer Lead', 'Listing Lead', 'Listing', 'Dead Lead', 'Dead Listing'] as LeadStage[]).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Assigned Agent</label>
              <select value={formData.assignedAgent || ''} onChange={e => handleInputChange('assignedAgent', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">Unassigned</option>
                <option value="Trey">Trey</option>
                <option value="Kirk">Kirk</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Project Name</label>
              <input type="text" value={formData.projectName} onChange={e => handleInputChange('projectName', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
              <textarea value={formData.description || ''} onChange={e => handleInputChange('description', e.target.value)} rows={3} placeholder="Brief description of the opportunity..." className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Est. Deal Value</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" value={formData.estValue || ''} onChange={e => handleInputChange('estValue', e.target.value ? Number(e.target.value) : undefined)} min={0} placeholder="0" className="w-full pl-6 p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            </div>
            {lastContactedDate && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Last Contacted</label>
                <p className="text-sm text-slate-700">{format(lastContactedDate, 'MMM d, yyyy')}</p>
              </div>
            )}
          </div>

          {/* Primary Contact */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" /> Primary Contact
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
              <input type="text" value={formData.contactName} onChange={e => handleInputChange('contactName', e.target.value)} placeholder="Full name" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Role / Title</label>
              <input type="text" value={formData.contactRole || ''} onChange={e => handleInputChange('contactRole', e.target.value)} placeholder="e.g. Owner, Broker, CEO" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
              <div className="flex items-center gap-1">
                <input type="tel" value={formData.contactPhone || ''} onChange={e => handleInputChange('contactPhone', e.target.value)} placeholder="(555) 000-0000" className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                {formData.contactPhone && (
                  <a href={`tel:${formData.contactPhone}`} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Call"><Phone className="w-4 h-4" /></a>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
              <div className="flex items-center gap-1">
                <input type="email" value={formData.contactEmail || ''} onChange={e => handleInputChange('contactEmail', e.target.value)} placeholder="email@example.com" className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                {formData.contactEmail && (
                  <a href={`mailto:${formData.contactEmail}`} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Email"><Mail className="w-4 h-4" /></a>
                )}
              </div>
            </div>
          </div>

          {/* Additional Contacts */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Users className="w-4 h-4" /> Additional Contacts</h3>
              <button onClick={() => setIsAddingContact(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
            </div>
            <div className="p-4 space-y-3">
              {isAddingContact && (
                <div className="bg-slate-50 p-3 rounded-lg border border-indigo-200 space-y-2 animate-in fade-in">
                  <input placeholder="Name" className="w-full p-1.5 text-sm border border-slate-200 rounded-lg" value={newContact.name} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))} />
                  <input placeholder="Role (e.g. CEO)" className="w-full p-1.5 text-sm border border-slate-200 rounded-lg" value={newContact.role} onChange={e => setNewContact(p => ({ ...p, role: e.target.value }))} />
                  <input placeholder="Phone" type="tel" className="w-full p-1.5 text-sm border border-slate-200 rounded-lg" value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} />
                  <input placeholder="Email" type="email" className="w-full p-1.5 text-sm border border-slate-200 rounded-lg" value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} />
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => setIsAddingContact(false)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                    <button onClick={addContact} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700">Add</button>
                  </div>
                </div>
              )}
              {formData.contacts?.map(contact => (
                <div key={contact.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white group relative">
                  <button onClick={() => deleteContact(contact.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>
                  <div className="min-w-0 flex-1">
                    {onSelectContact && contact.name
                      ? <button onClick={() => goToContact(contact.name, contact.email)} className="font-medium text-sm text-slate-900 hover:text-indigo-600 transition-colors text-left">{contact.name}</button>
                      : <div className="font-medium text-sm text-slate-900">{contact.name}</div>}
                    {contact.role && <div className="text-xs text-slate-500">{contact.role}</div>}
                    <div className="mt-1.5 space-y-0.5">
                      {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700"><Phone className="w-3 h-3" /> {contact.phone}</a>}
                      {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700"><Mail className="w-3 h-3" /> {contact.email}</a>}
                    </div>
                  </div>
                </div>
              ))}
              {(!formData.contacts || formData.contacts.length === 0) && !isAddingContact && (
                <p className="text-xs text-slate-400 text-center py-3">No additional contacts.</p>
              )}
            </div>
          </div>

          {/* Reminders */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Bell className="w-4 h-4" /> Follow-Up Reminders</h3>
              <button onClick={() => setIsAddingReminder(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
            </div>
            <div className="p-4 space-y-3">
              {isAddingReminder && (
                <div className="bg-slate-50 p-3 rounded-lg border border-indigo-200 space-y-2 animate-in fade-in">
                  <input type="date" className="w-full p-1.5 text-sm border border-slate-200 rounded-lg" value={newReminder.date} onChange={e => setNewReminder(p => ({ ...p, date: e.target.value }))} />
                  <input placeholder="Description (e.g. Call back)" className="w-full p-1.5 text-sm border border-slate-200 rounded-lg" value={newReminder.description} onChange={e => setNewReminder(p => ({ ...p, description: e.target.value }))} />
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => setIsAddingReminder(false)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                    <button onClick={addReminder} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700">Set Reminder</button>
                  </div>
                </div>
              )}
              {formData.reminders?.map(reminder => (
                <div key={reminder.id} className={cn("flex items-start gap-3 p-3 rounded-lg border transition-all", reminder.completed ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-200 shadow-sm")}>
                  <input type="checkbox" checked={reminder.completed} onChange={() => toggleReminder(reminder.id)} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", reminder.completed ? "text-slate-500 line-through" : "text-slate-900")}>{reminder.description}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" /> {format(parseISO(reminder.date), 'MMM d, yyyy')}</p>
                  </div>
                  <button onClick={() => deleteReminder(reminder.id)} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {(!formData.reminders || formData.reminders.length === 0) && !isAddingReminder && (
                <p className="text-xs text-slate-400 text-center py-3">No active reminders.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Activity Log (right sidebar, 1/3 width on desktop) */}
        <div className="lg:col-span-1 order-2 lg:order-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4" /> Activity Log
              </h3>
              <span className="text-xs text-slate-400">{sortedNotes.length} {sortedNotes.length === 1 ? 'entry' : 'entries'}</span>
            </div>
            <div className="p-6 space-y-6">
              {/* Quick-add */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                <input type="datetime-local" value={newNoteDate} onChange={e => setNewNoteDate(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }}
                  placeholder="Log a call, meeting, site visit, or update..."
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px] bg-white resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">⌘↵ to submit</span>
                  <button onClick={addNote} disabled={!newNote.trim()} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors">
                    <Plus className="w-3 h-3" /> Log Activity
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-4 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                {sortedNotes.map(note => (
                  <div key={note.id} className="relative pl-8 group">
                    <div className="absolute left-0 top-3 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-400 z-10" />
                    {editingNoteId === note.id ? (
                      <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-sm space-y-2">
                        <input type="datetime-local" value={editingNoteDate} onChange={e => setEditingNoteDate(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1" />
                        <textarea value={editingNoteContent} onChange={e => setEditingNoteContent(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm min-h-[60px] resize-none" />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingNoteId(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                          <button onClick={saveEditedNote} className="p-1 text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-xs font-medium text-slate-500">{format(parseISO(note.date), 'MMM d, yyyy h:mm a')}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEditingNote(note)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => deleteNote(note.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                      </div>
                    )}
                  </div>
                ))}
                {sortedNotes.length === 0 && (
                  <div className="pl-8 text-sm text-slate-400 italic py-4">No activity logged yet. Use the form above to log calls, meetings, or updates.</div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const getDealHealth = (deal: Transaction): 'green' | 'yellow' | 'red' => {
  if (deal.stage === 'Closed') return 'green';
  const today = new Date();
  const issues: string[] = [];
  // Overdue reminders
  deal.reminders?.forEach(r => {
    if (!r.completed && isBefore(parseISO(r.date), today)) issues.push('overdue');
  });
  // Missing critical dates
  if (!deal.coeDate) issues.push('no-coe');
  if (!deal.feasibilityDate) issues.push('no-feas');
  // Approaching deadlines (< 7 days)
  if (deal.coeDate && isBefore(parseISO(deal.coeDate), addDays(today, 7)) && isAfter(parseISO(deal.coeDate), today)) issues.push('approaching');
  if (deal.feasibilityDate && isBefore(parseISO(deal.feasibilityDate), addDays(today, 7)) && isAfter(parseISO(deal.feasibilityDate), today)) issues.push('approaching');

  if (issues.includes('overdue')) return 'red';
  if (issues.length > 0) return 'yellow';
  return 'green';
};

const DealHealthBadge = ({ health }: { health: 'green' | 'yellow' | 'red' }) => {
  const styles = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-400',
    red: 'bg-red-500 animate-pulse',
  };
  return <div className={cn("w-2 h-2 rounded-full shrink-0", styles[health])} title={health === 'green' ? 'Healthy' : health === 'yellow' ? 'Needs attention' : 'Overdue items'} />;
};

// --- Quick Edit Drawer ---

const QuickEditTransactionDrawer = ({
  transactions,
  onSave,
  onClose,
}: {
  transactions: Transaction[];
  onSave: (updated: Transaction[]) => void;
  onClose: () => void;
}) => {
  const isBulk = transactions.length > 1;
  const t0 = transactions[0];

  // Pre-populate from t0 for single edit; empty strings for bulk
  const [buyerName, setBuyerName] = useState(isBulk ? '' : (t0.buyer?.name || ''));
  const [sellerName, setSellerName] = useState(isBulk ? '' : (t0.seller?.name || ''));
  const [price, setPrice] = useState(isBulk ? '' : (t0.price ? String(t0.price) : ''));
  const [coeDate, setCoeDate] = useState(isBulk ? '' : (t0.coeDate || ''));
  const [projectYear, setProjectYear] = useState(isBulk ? '' : (t0.projectYear || ''));
  const [grossCommPct, setGrossCommPct] = useState(isBulk ? '' : (t0.grossCommissionPercent != null ? String(t0.grossCommissionPercent) : ''));
  const [treyLaoPct, setTreyLaoPct] = useState(isBulk ? '' : (t0.treyLaoPercent != null ? String(t0.treyLaoPercent) : ''));
  const [kirkLaoPct, setKirkLaoPct] = useState(isBulk ? '' : (t0.kirkLaoPercent != null ? String(t0.kirkLaoPercent) : ''));
  const [treySplit, setTreySplit] = useState<number>(isBulk ? 60 : (t0.treySplitPercent ?? 60));
  const [kirkSplit, setKirkSplit] = useState<number>(isBulk ? 40 : (t0.kirkSplitPercent ?? 40));
  const [splitsModified, setSplitsModified] = useState(false);

  const [overrideWarnings, setOverrideWarnings] = useState<{ label: string; deals: string[] }[]>([]);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);

  const missingKeys = useMemo(
    () => new Set(getMissingTransactionFields(t0).map(f => f.key)),
    [t0]
  );

  const handleTreyChange = (val: number) => {
    setSplitsModified(true);
    setTreySplit(val);
    setKirkSplit(Number((100 - val).toFixed(2)));
  };
  const handleKirkChange = (val: number) => {
    setSplitsModified(true);
    setKirkSplit(val);
    setTreySplit(Number((100 - val).toFixed(2)));
  };

  // For bulk: detect fields that would override existing values
  const detectOverrides = () => {
    const fieldChecks: { label: string; hasValue: (t: Transaction) => boolean; newValFilled: boolean }[] = [
      { label: 'Buyer', hasValue: t => !!(t.buyer?.name), newValFilled: !!buyerName },
      { label: 'Seller', hasValue: t => !!(t.seller?.name), newValFilled: !!sellerName },
      { label: 'Price', hasValue: t => !!(t.price), newValFilled: !!price },
      { label: 'COE Date', hasValue: t => !!(t.coeDate), newValFilled: !!coeDate },
      { label: 'Origination Year', hasValue: t => !!(t.projectYear), newValFilled: !!projectYear },
      { label: 'Gross Commission %', hasValue: t => t.grossCommissionPercent != null, newValFilled: !!grossCommPct },
      { label: 'Trey LAO %', hasValue: t => t.treyLaoPercent != null, newValFilled: !!treyLaoPct },
      { label: 'Kirk LAO %', hasValue: t => t.kirkLaoPercent != null, newValFilled: !!kirkLaoPct },
      { label: 'Trey / Kirk Split', hasValue: t => t.treySplitPercent != null, newValFilled: splitsModified },
    ];
    return fieldChecks
      .filter(fc => fc.newValFilled)
      .map(fc => ({
        label: fc.label,
        deals: transactions.filter(t => fc.hasValue(t)).map(t => t.dealName),
      }))
      .filter(w => w.deals.length > 0);
  };

  const handleSaveClick = () => {
    if (isBulk) {
      const warnings = detectOverrides();
      if (warnings.length > 0) {
        setOverrideWarnings(warnings);
        setShowOverrideConfirm(true);
        return;
      }
    }
    applySave();
  };

  const applySave = () => {
    const updated = transactions.map(t => {
      let next = { ...t };
      // Single edit: apply all fields (form is pre-populated; user sees what they're setting)
      // Bulk edit: only apply fields the user actually filled in / modified
      if (!isBulk || buyerName) next = { ...next, buyer: { ...next.buyer, name: buyerName || next.buyer?.name || '' } };
      if (!isBulk || sellerName) next = { ...next, seller: { ...next.seller, name: sellerName || next.seller?.name || '' } };
      if (!isBulk || price) next = { ...next, price: parseFloat(price) || next.price };
      if (!isBulk || coeDate) next = { ...next, coeDate: coeDate || next.coeDate };
      if (!isBulk || projectYear) next = { ...next, projectYear: projectYear || next.projectYear };
      if (!isBulk || grossCommPct) next = { ...next, grossCommissionPercent: grossCommPct !== '' ? parseFloat(grossCommPct) : next.grossCommissionPercent };
      if (!isBulk || treyLaoPct) next = { ...next, treyLaoPercent: treyLaoPct !== '' ? parseFloat(treyLaoPct) : next.treyLaoPercent };
      if (!isBulk || kirkLaoPct) next = { ...next, kirkLaoPercent: kirkLaoPct !== '' ? parseFloat(kirkLaoPct) : next.kirkLaoPercent };
      if (!isBulk || splitsModified) next = { ...next, treySplitPercent: treySplit, kirkSplitPercent: kirkSplit };
      return next;
    });
    onSave(updated);
    onClose();
  };

  const inputClass = (missing: boolean) => cn(
    "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
    missing ? "border-amber-300 bg-amber-50/50" : "border-slate-200"
  );

  // Override confirmation screen
  if (showOverrideConfirm) {
    return (
      <>
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
        <motion.div
          className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
          variants={drawerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-200">
            <div>
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Confirm Overrides
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Some deals already have values for these fields.</p>
            </div>
            <button onClick={() => setShowOverrideConfirm(false)} className="p-1.5 min-w-[44px] min-h-[44px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {overrideWarnings.map(w => (
              <div key={w.label} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-800 mb-1.5">Override <span className="font-bold">{w.label}</span> for:</p>
                <ul className="space-y-0.5">
                  {w.deals.map(d => (
                    <li key={d} className="text-xs text-amber-700 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="p-5 border-t border-slate-200 flex gap-3">
            <button onClick={() => setShowOverrideConfirm(false)} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
              Go Back
            </button>
            <button onClick={applySave} className="flex-1 px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium">
              Confirm & Save
            </button>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <motion.div
        className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
        variants={drawerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-900">
              {isBulk ? `Bulk Edit — ${transactions.length} deals` : transactions[0].dealName}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isBulk ? 'Values applied to all selected deals. Leave blank to skip.' : 'Edit fields below. Amber fields are currently missing.'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 min-w-[44px] min-h-[44px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Parties */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Parties</p>
            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
                  Buyer Name
                  {!isBulk && missingKeys.has('buyer.name') && <span className="text-amber-500">*</span>}
                </label>
                <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)}
                  className={inputClass(!isBulk && missingKeys.has('buyer.name'))} placeholder="e.g. John Smith" />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
                  Seller Name
                  {!isBulk && missingKeys.has('seller.name') && <span className="text-amber-500">*</span>}
                </label>
                <input type="text" value={sellerName} onChange={e => setSellerName(e.target.value)}
                  className={inputClass(!isBulk && missingKeys.has('seller.name'))} placeholder="e.g. Jane Doe" />
              </div>
            </div>
          </div>

          {/* Financials */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Financials</p>
            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
                  Price ($)
                  {!isBulk && missingKeys.has('price') && <span className="text-amber-500">*</span>}
                </label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                  className={inputClass(!isBulk && missingKeys.has('price'))} placeholder="0" min="0" />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
                  COE Date
                  {!isBulk && missingKeys.has('coeDate') && <span className="text-amber-500">*</span>}
                </label>
                <input type="date" value={coeDate} onChange={e => setCoeDate(e.target.value)}
                  className={inputClass(!isBulk && missingKeys.has('coeDate'))} />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
                  Origination Year
                </label>
                <input type="number" value={projectYear} onChange={e => setProjectYear(e.target.value)}
                  className={inputClass(false)} placeholder={String(new Date().getFullYear())} min="2000" max="2100" />
              </div>
            </div>
          </div>

          {/* Commission */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Commission</p>
            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
                  Gross Commission %
                  {!isBulk && missingKeys.has('grossCommissionPercent') && <span className="text-amber-500">*</span>}
                </label>
                <input type="number" value={grossCommPct} onChange={e => setGrossCommPct(e.target.value)}
                  className={inputClass(!isBulk && missingKeys.has('grossCommissionPercent'))} placeholder="0" min="0" max="100" step="0.5" />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
                  Trey LAO %
                  {!isBulk && missingKeys.has('treyLaoPercent') && <span className="text-amber-500">*</span>}
                </label>
                <input type="number" value={treyLaoPct} onChange={e => setTreyLaoPct(e.target.value)}
                  className={inputClass(!isBulk && missingKeys.has('treyLaoPercent'))} placeholder="35" min="0" max="100" step="0.5" />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
                  Kirk LAO %
                  {!isBulk && missingKeys.has('kirkLaoPercent') && <span className="text-amber-500">*</span>}
                </label>
                <input type="number" value={kirkLaoPct} onChange={e => setKirkLaoPct(e.target.value)}
                  className={inputClass(!isBulk && missingKeys.has('kirkLaoPercent'))} placeholder="30" min="0" max="100" step="0.5" />
              </div>

              {/* Trey / Kirk Split Sliders */}
              <div className={cn("rounded-lg p-3 space-y-3", splitsModified || !isBulk ? "bg-slate-50 border border-slate-200" : "bg-slate-50 border border-slate-200")}>
                <p className="text-xs font-medium text-slate-700 mb-1">
                  Trey / Kirk Split
                  {!isBulk && (missingKeys.has('treySplitPercent') || missingKeys.has('kirkSplitPercent')) && <span className="ml-1 text-amber-500">*</span>}
                  {isBulk && !splitsModified && <span className="ml-1 text-[10px] text-slate-400 font-normal">(move slider to apply)</span>}
                </p>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Trey</span>
                    <span className="font-mono font-semibold text-indigo-600">{treySplit}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="0.5" value={treySplit}
                    onChange={e => handleTreyChange(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-500 bg-slate-200" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Kirk</span>
                    <span className="font-mono font-semibold text-sky-600">{kirkSplit}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="0.5" value={kirkSplit}
                    onChange={e => handleKirkChange(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-sky-500 bg-slate-200" />
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-indigo-500 h-full transition-all" style={{ width: `${treySplit}%` }} />
                  <div className="bg-sky-400 h-full transition-all" style={{ width: `${kirkSplit}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 min-h-[44px] text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSaveClick} className="flex-1 px-4 py-2 min-h-[44px] text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
            Save Changes
          </button>
        </div>
      </motion.div>
    </>
  );
};

const QuickEditLeadDrawer = ({
  leads,
  onSave,
  onClose,
}: {
  leads: Lead[];
  onSave: (updated: Lead[]) => void;
  onClose: () => void;
}) => {
  const isBulk = leads.length > 1;
  const l0 = leads[0];

  const [projectName, setProjectName] = useState(isBulk ? '' : (l0.projectName || ''));
  const [contactName, setContactName] = useState(isBulk ? '' : (l0.contactName || ''));
  const [lastSpokeDate, setLastSpokeDate] = useState(isBulk ? '' : (l0.lastSpokeDate || ''));

  const [overrideWarnings, setOverrideWarnings] = useState<{ label: string; items: string[] }[]>([]);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);

  const missingKeys = useMemo(
    () => new Set(getMissingLeadFields(l0).map(f => f.key)),
    [l0]
  );

  const detectOverrides = () => {
    const fieldChecks: { label: string; hasValue: (l: Lead) => boolean; newValFilled: boolean }[] = [
      { label: 'Project Name', hasValue: l => !!(l.projectName), newValFilled: !!projectName },
      { label: 'Contact', hasValue: l => !!(l.contactName), newValFilled: !!contactName },
      { label: 'Last Spoke Date', hasValue: l => !!(l.lastSpokeDate), newValFilled: !!lastSpokeDate },
    ];
    return fieldChecks
      .filter(fc => fc.newValFilled)
      .map(fc => ({
        label: fc.label,
        items: leads.filter(l => fc.hasValue(l)).map(l => l.projectName),
      }))
      .filter(w => w.items.length > 0);
  };

  const handleSaveClick = () => {
    if (isBulk) {
      const warnings = detectOverrides();
      if (warnings.length > 0) {
        setOverrideWarnings(warnings);
        setShowOverrideConfirm(true);
        return;
      }
    }
    applySave();
  };

  const applySave = () => {
    const updated = leads.map(l => {
      let next = { ...l };
      if (!isBulk || projectName) next = { ...next, projectName: projectName || next.projectName };
      if (!isBulk || contactName) next = { ...next, contactName: contactName || next.contactName };
      if (!isBulk || lastSpokeDate) next = { ...next, lastSpokeDate: lastSpokeDate || next.lastSpokeDate };
      return next;
    });
    onSave(updated);
    onClose();
  };

  const inputClass = (missing: boolean) => cn(
    "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
    missing ? "border-amber-300 bg-amber-50/50" : "border-slate-200"
  );

  if (showOverrideConfirm) {
    return (
      <>
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
        <motion.div
          className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
          variants={drawerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-200">
            <div>
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Confirm Overrides
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Some leads already have values for these fields.</p>
            </div>
            <button onClick={() => setShowOverrideConfirm(false)} className="p-1.5 min-w-[44px] min-h-[44px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {overrideWarnings.map(w => (
              <div key={w.label} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-800 mb-1.5">Override <span className="font-bold">{w.label}</span> for:</p>
                <ul className="space-y-0.5">
                  {w.items.map(name => (
                    <li key={name} className="text-xs text-amber-700 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="p-5 border-t border-slate-200 flex gap-3">
            <button onClick={() => setShowOverrideConfirm(false)} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
              Go Back
            </button>
            <button onClick={applySave} className="flex-1 px-4 py-2 min-h-[44px] text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium">
              Confirm & Save
            </button>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <motion.div
        className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
        variants={drawerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-900">
              {isBulk ? `Bulk Edit — ${leads.length} leads` : l0.projectName || 'Edit Lead'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isBulk ? 'Values applied to all selected leads. Leave blank to skip.' : 'Edit fields below. Amber fields are currently missing.'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 min-w-[44px] min-h-[44px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
              Project Name
              {!isBulk && missingKeys.has('projectName') && <span className="text-amber-500">*</span>}
            </label>
            <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
              className={inputClass(!isBulk && missingKeys.has('projectName'))} placeholder="Project / property name" />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
              Contact Name
              {!isBulk && missingKeys.has('contactName') && <span className="text-amber-500">*</span>}
            </label>
            <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
              className={inputClass(!isBulk && missingKeys.has('contactName'))} placeholder="Primary contact" />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
              Last Spoke Date
              {!isBulk && missingKeys.has('lastSpokeDate') && <span className="text-amber-500">*</span>}
            </label>
            <input type="date" value={lastSpokeDate} onChange={e => setLastSpokeDate(e.target.value)}
              className={inputClass(!isBulk && missingKeys.has('lastSpokeDate'))} />
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSaveClick} className="flex-1 px-4 py-2 min-h-[44px] text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
            Save Changes
          </button>
        </div>
      </motion.div>
    </>
  );
};

const PipelineView = ({
  transactions,
  onSelectDeal,
  onDeleteDeal,
  onBatchDelete,
  onUpdateTransaction
}: {
  transactions: Transaction[],
  onSelectDeal: (id: string) => void,
  onDeleteDeal: (id: string) => void,
  onBatchDelete: (ids: string[]) => void,
  onUpdateTransaction?: (t: Transaction) => void
}) => {
  const [search, setSearch] = useState('');
  const [selectedStages, setSelectedStages] = useState<Set<PipelineStage>>(new Set(['LOI', 'Contract', 'Escrow', 'Option']));
  const [filterYear, setFilterYear] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dragDealId, setDragDealId] = useState<string | null>(null);
  const [incompleteFilter, setIncompleteFilter] = useState(false);
  const [drawerTransactions, setDrawerTransactions] = useState<Transaction[] | null>(null);
  const [pipelinePage, setPipelinePage] = useState(1);
  // Dynamic rows: extra overhead for totals row (~50px) so it stays on-screen
  // Mobile card ~82px; desktop row ~52px
  const pipelineRowsPerPage = useRowsPerPage(82, 52, 440, 480);

  const toggleStageFilter = (stage: PipelineStage) => {
    const newSet = new Set(selectedStages);
    if (newSet.has(stage)) {
      newSet.delete(stage);
    } else {
      newSet.add(stage);
    }
    setSelectedStages(newSet);
  };

  const uniqueYears = useMemo(() => {
    const years = new Set(transactions.map(t => t.projectYear).filter(Boolean));
    return Array.from(years).sort().reverse();
  }, [transactions]);

  const incompleteCount = useMemo(
    () => transactions.filter(t => getMissingTransactionFields(t).length > 0).length,
    [transactions]
  );

  const filteredData = useMemo(() => {
    let data = [...transactions];

    if (selectedStages.size > 0) {
      data = data.filter(t => selectedStages.has(t.stage));
    } else {
      data = [];
    }

    if (filterYear !== 'All') {
      data = data.filter(t => t.projectYear === filterYear);
    }

    if (incompleteFilter) {
      data = data.filter(t => getMissingTransactionFields(t).length > 0);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      data = data.filter(t =>
        t.dealName.toLowerCase().includes(lowerSearch) ||
        t.address.toLowerCase().includes(lowerSearch) ||
        t.clientContact.toLowerCase().includes(lowerSearch) ||
        t.buyer.name.toLowerCase().includes(lowerSearch) ||
        t.seller.name.toLowerCase().includes(lowerSearch)
      );
    }

    if (sortConfig) {
      data.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Transaction];
        let bValue: any = b[sortConfig.key as keyof Transaction];

        // Handle nested or special sort keys
        if (sortConfig.key === 'buyer') {
            aValue = a.buyer?.name || '';
            bValue = b.buyer?.name || '';
        }
        if (sortConfig.key === 'seller') {
            aValue = a.seller?.name || '';
            bValue = b.seller?.name || '';
        }

        // Handle dates
        if (sortConfig.key === 'feasibilityDate' || sortConfig.key === 'coeDate') {
            aValue = aValue ? new Date(aValue).getTime() : 0;
            bValue = bValue ? new Date(bValue).getTime() : 0;
        }

        // Handle null/undefined values for strings/numbers
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [transactions, search, sortConfig, selectedStages, filterYear, incompleteFilter]);

  useEffect(() => { setPipelinePage(1); }, [search, selectedStages, filterYear, incompleteFilter, sortConfig]);

  const pipelineTotalPages = Math.max(1, Math.ceil(filteredData.length / pipelineRowsPerPage));
  const pipelineSafePage = Math.min(pipelinePage, pipelineTotalPages);
  const pagedData = filteredData.slice((pipelineSafePage - 1) * pipelineRowsPerPage, pipelineSafePage * pipelineRowsPerPage);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map(t => t.id)));
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-indigo-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-indigo-600" />;
  };

  const exportCSV = () => {
    const headers = ['Year', 'Stage', 'Deal Name', 'Buyer', 'Seller', 'Price', 'Base %', 'Trey LAO %', 'Kirk LAO %', 'Trey %', 'Kirk %', 'Feas Date', 'COE Date', 'PID'];
    const rows = filteredData.map(d => [
      d.projectYear || '', d.stage, d.dealName, d.buyer.name, d.seller.name,
      d.price, d.grossCommissionPercent, d.treyLaoPercent, d.kirkLaoPercent, d.treySplitPercent, d.kirkSplitPercent,
      d.feasibilityDate || '', d.coeDate || '', d.pid || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pipeline_export.csv';
    a.click();
  };

  const handleDragStart = (dealId: string) => setDragDealId(dealId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (stage: PipelineStage) => {
    if (!dragDealId || !onUpdateTransaction) return;
    const deal = transactions.find(t => t.id === dragDealId);
    if (deal && deal.stage !== stage) {
      onUpdateTransaction({ ...deal, stage });
    }
    setDragDealId(null);
  };

  const kanbanStages: PipelineStage[] = ['LOI', 'Contract', 'Escrow', 'Option', 'Closed'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header row: title left, search + actions right */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline Manager</h1>
          <p className="text-slate-500">Manage your active and closed transactions.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto items-center">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search deals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setViewMode(viewMode === 'kanban' ? 'table' : 'kanban')}
            className={cn("flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors shrink-0", viewMode === 'kanban' ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-600 hover:bg-slate-50")}
            title="Update Stages (Kanban)"
          >
            <Columns3 className="w-4 h-4" />
            <span className="hidden sm:inline">Update Stages</span>
          </button>
          <button onClick={exportCSV} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200 shrink-0" title="Export CSV">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters — toggle button row (page-level, same as LeadsView) */}
      <div className="flex items-center gap-2 flex-wrap">
          {/* Filter toggle button */}
          <button
            onClick={() => setShowFilterPanel(p => !p)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all",
              showFilterPanel
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {/* Active filter count badge */}
            {(() => {
              const activeStages = selectedStages.size < 5 ? (5 - selectedStages.size) : 0;
              const yearActive = filterYear !== 'All' ? 1 : 0;
              const incActive = incompleteFilter ? 1 : 0;
              const total = activeStages + yearActive + incActive;
              return total > 0 ? (
                <span className={cn(
                  "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none",
                  showFilterPanel ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"
                )}>{total}</span>
              ) : null;
            })()}
            <ChevronDown className={cn("w-3 h-3 transition-transform", showFilterPanel && "rotate-180")} />
          </button>

          {/* Active filter summary chips (collapsed state) */}
          {!showFilterPanel && (
            <>
              {filterYear !== 'All' && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-medium">
                  {filterYear}
                  <button onClick={() => setFilterYear('All')} className="hover:text-indigo-900 ml-0.5">×</button>
                </span>
              )}
              {incompleteFilter && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">
                  <AlertTriangle className="w-3 h-3" /> Incomplete only
                  <button onClick={() => setIncompleteFilter(false)} className="hover:text-amber-900 ml-0.5">×</button>
                </span>
              )}
              {(['LOI', 'Contract', 'Escrow', 'Closed', 'Option'] as const)
                .filter(s => !selectedStages.has(s))
                .map(s => (
                  <span key={s} className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-full text-xs font-medium line-through">
                    {s}
                  </span>
                ))
              }
            </>
          )}

          {incompleteCount > 0 && showFilterPanel && (
            <button
              onClick={() => setIncompleteFilter(!incompleteFilter)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border",
                incompleteFilter
                  ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {incompleteCount} Incomplete
            </button>
          )}
        </div>

        {/* Expandable filter panel */}
        {showFilterPanel && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            {/* Stage filters */}
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Stage</p>
              <div className="flex flex-wrap gap-2">
                {(['LOI', 'Contract', 'Escrow', 'Closed', 'Option'] as const).map(stage => (
                  <button
                    key={stage}
                    onClick={() => toggleStageFilter(stage)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                      selectedStages.has(stage)
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </div>

            {/* Year + Reset row */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Year:</p>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="All">All Years</option>
                  {uniqueYears.map(year => (
                    <option key={year} value={year as string}>{year}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setSelectedStages(new Set(['LOI', 'Contract', 'Escrow', 'Option']));
                  setFilterYear('All');
                  setIncompleteFilter(false);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
              >
                Reset filters
              </button>
            </div>
          </div>
        )}

      {/* Table card — wraps only the table/list, matching LeadsView structure */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {viewMode === 'table' && (
        <>
          {/* Mobile card list */}
          <div className="block sm:hidden divide-y divide-slate-100">
            {pagedData.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">No transactions found.</div>
            )}
            {pagedData.map((deal) => {
              const grossComm = deal.price * (deal.grossCommissionPercent / 100);
              const missingFields = getMissingTransactionFields(deal);
              return (
                <div
                  key={deal.id}
                  onClick={() => onSelectDeal(deal.id)}
                  className={cn(
                    "px-4 py-5 hover:bg-slate-50 cursor-pointer transition-colors",
                    missingFields.length > 0 && "border-l-2 border-l-amber-300"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <DealHealthBadge health={getDealHealth(deal)} />
                      <span className="font-semibold text-slate-900 truncate">{deal.dealName}</span>
                    </div>
                    <StatusBadge stage={deal.stage} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                    <span className="font-mono font-medium text-slate-700">{formatCurrency(deal.price)}</span>
                    <span className="text-emerald-700 font-semibold">{formatCurrency(grossComm)}</span>
                    {deal.coeDate && <span>COE: {format(parseISO(deal.coeDate), 'MM/dd/yy')}</span>}
                    {deal.projectYear && <span>{deal.projectYear}</span>}
                  </div>
                </div>
              );
            })}
            {pipelineTotalPages > 1 && (
              <div className="border-t border-slate-200 px-4 py-2">
                <Pagination page={pipelineSafePage} totalPages={pipelineTotalPages} onPage={setPipelinePage} />
              </div>
            )}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 whitespace-nowrap sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 w-10 bg-slate-50">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredData.length && filteredData.length > 0}
                  onChange={toggleAll}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700 bg-slate-50" onClick={() => handleSort('projectYear')}>
                  <div className="flex items-center">Year <SortIcon columnKey="projectYear" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700 bg-slate-50" onClick={() => handleSort('stage')}>
                  <div className="flex items-center">Stage <SortIcon columnKey="stage" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('dealName')}>
                  <div className="flex items-center">Deal Name <SortIcon columnKey="dealName" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700 text-right bg-slate-50" onClick={() => handleSort('price')}>
                  <div className="flex items-center justify-end">Price <SortIcon columnKey="price" /></div>
              </th>
              <th className="px-4 py-3 text-right bg-slate-50">Gross Comm</th>
              <th className="px-4 py-3 text-right bg-slate-50">Trey %</th>
              <th className="px-4 py-3 text-right bg-slate-50">Kirk %</th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700 bg-slate-50" onClick={() => handleSort('coeDate')}>
                  <div className="flex items-center">COE Date <SortIcon columnKey="coeDate" /></div>
              </th>
              <th className="px-4 py-3 w-10 bg-slate-50"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagedData.map((deal) => {
              const grossComm = deal.price * (deal.grossCommissionPercent / 100);
              const missingFields = getMissingTransactionFields(deal);
              return (
                <tr
                  key={deal.id}
                  onClick={() => onSelectDeal(deal.id)}
                  className={cn(
                    "hover:bg-slate-50 cursor-pointer transition-colors group",
                    selectedIds.has(deal.id) && "bg-indigo-50/50",
                    missingFields.length > 0 && "border-l-2 border-l-amber-300"
                  )}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(deal.id)}
                      onChange={() => toggleSelection(deal.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{deal.projectYear || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge stage={deal.stage} /></td>
                  <td className="px-4 py-3 font-medium text-slate-900 group-hover:text-indigo-600 max-w-[160px] truncate" title={deal.dealName}>
                    <div className="flex items-center gap-2">
                      <DealHealthBadge health={getDealHealth(deal)} />
                      {deal.dealName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{formatCurrency(deal.price)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">{formatCurrency(grossComm)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatPercent(deal.treySplitPercent)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatPercent(deal.kirkSplitPercent)}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {deal.coeDate ? format(parseISO(deal.coeDate), 'MM/dd/yy') : '-'}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {missingFields.length > 0 && (
                        <button
                          onClick={() => setDrawerTransactions([deal])}
                          className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                          title={`Missing: ${missingFields.map(f => f.label).join(', ')}`}
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteDeal(deal.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {filteredData.length > 0 && (() => {
            const totalPrice = filteredData.reduce((s, d) => s + d.price, 0);
            const totalGross = filteredData.reduce((s, d) => s + d.price * (d.grossCommissionPercent / 100), 0);
            return (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-xs font-semibold text-slate-700">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-slate-400 uppercase tracking-wider">
                    {filteredData.length} deal{filteredData.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalPrice)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatCurrency(totalGross)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            );
          })()}
        </table>
        {pipelineTotalPages > 1 && (
          <div className="border-t border-slate-200 px-4 py-2">
            <Pagination page={pipelineSafePage} totalPages={pipelineTotalPages} onPage={setPipelinePage} />
          </div>
        )}
          </div>
        </>
      )}
      {filteredData.length === 0 && viewMode === 'table' && (
        <div className="p-12 text-center text-slate-500">
          <p>No transactions found matching your filters.</p>
        </div>
      )}
      </div>

    {/* Kanban View */}
    {viewMode === 'kanban' && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 p-4">
        {kanbanStages.map(stage => {
          const stageDeals = filteredData.filter(d => d.stage === stage);
          const stageColumnColors: Record<string, string> = {
            LOI: 'border-slate-300 bg-slate-50',
            Contract: 'border-blue-300 bg-blue-50',
            Escrow: 'border-amber-300 bg-amber-50',
            Option: 'border-orange-300 bg-orange-50',
            Closed: 'border-emerald-300 bg-emerald-50',
          };
          const stageCardAccent: Record<string, string> = {
            LOI: 'border-l-slate-400',
            Contract: 'border-l-blue-400',
            Escrow: 'border-l-amber-400',
            Option: 'border-l-orange-400',
            Closed: 'border-l-emerald-500',
          };
          return (
            <div
              key={stage}
              className={cn("rounded-xl border-2 border-dashed p-3 min-h-[200px] transition-colors", stageColumnColors[stage], dragDealId && "border-indigo-400")}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage)}
            >
              <div className="flex items-center justify-between mb-3">
                <StatusBadge stage={stage} />
                <span className="text-[10px] font-bold text-slate-400">{stageDeals.length}</span>
              </div>
              <motion.div
                className="space-y-2"
                variants={listContainerVariants}
                initial="hidden"
                animate="visible"
                key={stageDeals.map(d => d.id).join(',')}
              >
                {stageDeals.map(deal => {
                  const missingFields = getMissingTransactionFields(deal);
                  const grossComm = deal.price * (deal.grossCommissionPercent / 100);
                  return (
                    <motion.div
                    variants={listItemVariants}
                      key={deal.id}
                      draggable
                      onDragStart={() => handleDragStart(deal.id)}
                      onClick={() => onSelectDeal(deal.id)}
                      className={cn(
                        "bg-white rounded-lg border border-slate-200 border-l-4 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group",
                        stageCardAccent[stage]
                      )}
                    >
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-500 shrink-0" />
                          <DealHealthBadge health={getDealHealth(deal)} />
                          <span className="text-xs font-bold text-slate-900 leading-tight">{deal.dealName}</span>
                        </div>
                        {missingFields.length > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDrawerTransactions([deal]); }}
                            className="shrink-0 p-0.5 text-amber-400 hover:text-amber-600 transition-colors"
                            title={`Missing: ${missingFields.map(f => f.label).join(', ')}`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="ml-5 space-y-1">
                        <p className="text-[10px] font-mono font-semibold text-slate-700">{formatCurrency(deal.price)}</p>
                        <p className="text-[10px] font-mono text-emerald-600">Comm: {formatCurrency(grossComm)}</p>
                        {deal.buyer?.name && <p className="text-[10px] text-slate-500 truncate">B: {deal.buyer.name}</p>}
                        {deal.seller?.name && <p className="text-[10px] text-slate-500 truncate">S: {deal.seller.name}</p>}
                        {deal.coeDate && <p className="text-[10px] text-slate-400">COE: {format(parseISO(deal.coeDate), 'MM/dd/yy')}</p>}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          );
        })}
      </div>
    )}

    {/* Floating Action Bar */}
    {selectedIds.size > 0 && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-full shadow-2xl z-50 animate-in slide-in-from-bottom-4 duration-200">
        <span className="text-sm font-medium pr-1">{selectedIds.size} selected</span>
        <div className="w-px h-4 bg-slate-600" />
        <button
          onClick={() => setDrawerTransactions(filteredData.filter(t => selectedIds.has(t.id)))}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full text-xs font-medium transition-colors"
        >
          <Edit3 className="w-3 h-3" />
          Bulk Edit
        </button>
        <button
          onClick={() => { onBatchDelete(Array.from(selectedIds)); setSelectedIds(new Set()); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-medium transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
        <button onClick={() => setSelectedIds(new Set())} className="p-1.5 text-slate-400 hover:text-white transition-colors ml-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )}

    {/* Quick Edit Drawer */}
    <AnimatePresence>
      {drawerTransactions && onUpdateTransaction && (
        <QuickEditTransactionDrawer
          transactions={drawerTransactions}
          onSave={(updated) => updated.forEach(t => onUpdateTransaction(t))}
          onClose={() => setDrawerTransactions(null)}
        />
      )}
    </AnimatePresence>
    </div>
  );
};



const TimelineSummary = ({ transaction }: { transaction: Transaction }) => {
  const dates = [
    { label: 'PSA Date', date: transaction.psaDate, type: 'critical' },
    { label: 'Feasibility', date: transaction.feasibilityDate, type: 'critical' },
    { label: 'COE', date: transaction.coeDate, type: 'critical' },
    ...transaction.customDates.map(d => ({ label: d.label, date: d.date, type: d.type || 'custom' }))
  ].filter(d => d.date).sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

  const handleExport = () => {
    const events = dates.map(d => ({
      title: `${d.label} - ${transaction.dealName}`,
      start: parseISO(d.date!),
      description: `Deal: ${transaction.dealName}\nType: ${d.type}`
    }));
    const ics = generateICS(events);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${transaction.dealName.replace(/\s+/g, '_')}_timeline.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" /> Timeline
        </h3>
        <button onClick={handleExport} className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
          <Download className="w-3 h-3" /> Export .ics
        </button>
      </div>

      <div className="flex-1 relative pl-4 border-l-2 border-slate-100 space-y-6">
        {dates.map((item, i) => (
          <div key={i} className="relative">
            <div className={cn(
              "absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ring-1 flex items-center justify-center",
              item.type === 'critical' ? "bg-indigo-600 ring-indigo-200" : 
              item.type === 'reminder' ? "bg-amber-400 ring-amber-200" : "bg-emerald-400 ring-emerald-200"
            )}>
              {item.type === 'reminder' && <Bell className="w-1.5 h-1.5 text-white" />}
            </div>
            <div>
              <p className={cn(
                "text-xs uppercase mb-0.5 font-semibold flex items-center gap-1",
                item.type === 'critical' ? "text-indigo-600" : 
                item.type === 'reminder' ? "text-amber-600" : "text-emerald-600"
              )}>
                {item.label}
              </p>
              <p className="font-medium text-slate-900">{format(parseISO(item.date!), 'MMMM d, yyyy')}</p>
              <p className="text-xs text-slate-400">{format(parseISO(item.date!), 'EEEE')}</p>
            </div>
          </div>
        ))}
        {dates.length === 0 && (
          <p className="text-sm text-slate-400 italic">No dates scheduled.</p>
        )}
      </div>
    </div>
  );
};

const PartiesSummary = ({ transaction }: { transaction: Transaction }) => {
  const getSide = (p: Party): Party['side'] =>
    p.side || (/^buyer/i.test(p.role) ? 'buyer' : /^seller/i.test(p.role) ? 'seller' : 'third-party');
  const buyers = [transaction.buyer, ...transaction.otherParties.filter(p => getSide(p) === 'buyer')];
  const sellers = [transaction.seller, ...transaction.otherParties.filter(p => getSide(p) === 'seller')];
  const thirds = transaction.otherParties.filter(p => getSide(p) === 'third-party');
  const row = (p: Party, i: number, colorCls: string) => (
    <div key={p.id || i} className="flex items-center gap-2">
      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0", colorCls)}>
        {p.name ? p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'}
      </div>
      <p className="text-sm font-medium text-slate-900 truncate">{p.name || <span className="text-slate-400 italic text-xs font-normal">Unnamed</span>}</p>
    </div>
  );
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
        <Users className="w-4 h-4 text-slate-400" /> Parties
      </h3>
      {buyers.some(b => b.name) && (
        <div>
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1.5">Buyers</p>
          <div className="space-y-1.5">{buyers.filter(b => b.name).map((b, i) => row(b, i, 'bg-indigo-100 text-indigo-700'))}</div>
        </div>
      )}
      {sellers.some(s => s.name) && (
        <div>
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1.5">Sellers</p>
          <div className="space-y-1.5">{sellers.filter(s => s.name).map((s, i) => row(s, i, 'bg-emerald-100 text-emerald-700'))}</div>
        </div>
      )}
      {thirds.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Third Parties</p>
          <div className="flex flex-wrap gap-1">
            {thirds.map((p, i) => (
              <span key={p.id || i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">{p.role || p.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to derive all contacts from transactions + leads + standalone contacts
function deriveContacts(transactions: Transaction[], leads: Lead[], standaloneContacts: StandaloneContact[] = []): DerivedContact[] {
  const map = new Map<string, DerivedContact>();

  const key = (name: string, email?: string) =>
    (email?.trim().toLowerCase() || name.trim().toLowerCase());

  const upsert = (
    name: string,
    entity: string | undefined,
    email: string | undefined,
    phone: string | undefined,
    primaryRole: string,
    source: ContactSource,
    dateHint?: string
  ) => {
    if (!name.trim()) return;
    const k = key(name, email);
    if (map.has(k)) {
      const existing = map.get(k)!;
      existing.sources.push(source);
      if (!existing.email && email) existing.email = email;
      if (!existing.phone && phone) existing.phone = phone;
      if (!existing.entity && entity) existing.entity = entity;
      if (dateHint && (!existing.lastActiveDate || dateHint > existing.lastActiveDate)) {
        existing.lastActiveDate = dateHint;
      }
    } else {
      map.set(k, {
        id: k,
        name: name.trim(),
        entity: entity || undefined,
        email: email || undefined,
        phone: phone || undefined,
        primaryRole,
        sources: [source],
        lastActiveDate: dateHint,
      });
    }
  };

  for (const t of transactions) {
    if (t.isDeleted) continue;
    const dateHint = t.coeDate || t.psaDate || undefined;
    if (t.buyer?.name) {
      upsert(t.buyer.name, t.buyer.entity, t.buyer.email, t.buyer.phone, 'Buyer', {
        type: 'transaction-buyer', id: t.id, label: t.dealName, role: 'Buyer', stage: t.stage, coeDate: t.coeDate
      }, dateHint);
    }
    if (t.seller?.name) {
      upsert(t.seller.name, t.seller.entity, t.seller.email, t.seller.phone, 'Seller', {
        type: 'transaction-seller', id: t.id, label: t.dealName, role: 'Seller', stage: t.stage, coeDate: t.coeDate
      }, dateHint);
    }
    for (const p of t.otherParties || []) {
      if (p.name) {
        const inferredSide = p.side || (/^buyer/i.test(p.role) ? 'buyer' : /^seller/i.test(p.role) ? 'seller' : 'third-party');
        const displayRole = inferredSide === 'buyer' ? 'Buyer' : inferredSide === 'seller' ? 'Seller' : (p.role || 'Other');
        upsert(p.name, p.entity, p.email, p.phone, displayRole, {
          type: inferredSide === 'buyer' ? 'transaction-buyer' : inferredSide === 'seller' ? 'transaction-seller' : 'transaction-party',
          id: t.id, label: t.dealName, role: displayRole, stage: t.stage, coeDate: t.coeDate
        }, dateHint);
      }
    }
  }

  for (const l of leads) {
    if (l.isDeleted) continue;
    if (l.contactName) {
      const lc = l.contacts?.find(c => c.name === l.contactName);
      upsert(l.contactName, undefined, l.contactEmail || lc?.email, l.contactPhone || lc?.phone, l.contactRole || lc?.role || 'Lead Contact', {
        type: 'lead', id: l.id, label: l.projectName || l.contactName, role: l.contactRole || lc?.role || 'Lead Contact'
      }, l.lastSpokeDate || undefined);
    }
    for (const c of l.contacts || []) {
      if (c.name && c.name !== l.contactName) {
        upsert(c.name, undefined, c.email, c.phone, c.role || 'Lead Contact', {
          type: 'lead', id: l.id, label: l.projectName || l.contactName, role: c.role || 'Lead Contact'
        }, l.lastSpokeDate || undefined);
      }
    }
  }

  for (const sc of standaloneContacts) {
    if (sc.name) {
      upsert(sc.name, sc.entity, sc.email, sc.phone, sc.primaryRole || 'Contact', {
        type: 'standalone', id: sc.id, label: sc.name, role: sc.primaryRole || 'Contact'
      }, sc.createdAt);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

const MergeContactsModal = ({
  contacts,
  initialKeepId,
  initialMergeId,
  onConfirm,
  onClose,
}: {
  contacts: DerivedContact[];
  initialKeepId?: string;
  initialMergeId?: string;
  onConfirm: (keepId: string, mergeId: string) => void;
  onClose: () => void;
}) => {
  const [keepId, setKeepId] = useState(initialKeepId || '');
  const [mergeId, setMergeId] = useState(initialMergeId || '');
  const [mergeSearch, setMergeSearch] = useState('');

  const keepContact = contacts.find(c => c.id === keepId);
  const mergeContact = contacts.find(c => c.id === mergeId);

  const mergeOptions = contacts.filter(c =>
    c.id !== keepId &&
    (!mergeSearch || c.name.toLowerCase().includes(mergeSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(mergeSearch.toLowerCase()))
  );

  const canConfirm = keepId && mergeId && keepId !== mergeId;

  const ContactCard = ({ contact, label, side }: { contact: DerivedContact; label: string; side: 'keep' | 'merge' }) => {
    const initials = contact.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const txCount = contact.sources.filter(s => s.type !== 'lead' && s.type !== 'standalone').length;
    const leadCount = contact.sources.filter(s => s.type === 'lead').length;
    return (
      <div className={cn(
        "flex-1 rounded-xl border p-4 space-y-3",
        side === 'keep' ? "border-emerald-300 bg-emerald-50" : "border-red-200 bg-red-50"
      )}>
        <p className={cn("text-xs font-semibold uppercase tracking-wider", side === 'keep' ? "text-emerald-700" : "text-red-600")}>
          {label}
        </p>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
            side === 'keep' ? "bg-emerald-200 text-emerald-800" : "bg-red-200 text-red-800"
          )}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">{contact.name}</p>
            {contact.entity && <p className="text-xs text-slate-500 truncate">{contact.entity}</p>}
          </div>
        </div>
        <div className="space-y-1 text-xs text-slate-600">
          {contact.email && <p className="flex items-center gap-1"><Mail className="w-3 h-3 shrink-0" />{contact.email}</p>}
          {contact.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" />{contact.phone}</p>}
          <p className="text-slate-400 mt-2">
            {txCount > 0 && `${txCount} deal${txCount !== 1 ? 's' : ''}`}
            {txCount > 0 && leadCount > 0 && ' · '}
            {leadCount > 0 && `${leadCount} lead${leadCount !== 1 ? 's' : ''}`}
            {txCount === 0 && leadCount === 0 && 'No associations'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Merge Contacts</h2>
            <p className="text-sm text-slate-500 mt-0.5">The <span className="font-medium text-emerald-700">kept</span> contact remains; the <span className="font-medium text-red-600">merged</span> contact's records are updated and it is removed.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Keep contact selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Keep (canonical contact)</label>
            <select
              value={keepId}
              onChange={e => { setKeepId(e.target.value); if (e.target.value === mergeId) setMergeId(''); }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select contact to keep…</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.entity ? ` (${c.entity})` : ''}{c.email ? ` — ${c.email}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Merge contact selector with search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Merge (will be removed)</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search for contact to merge…"
                value={mergeSearch}
                onChange={e => setMergeSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
              {mergeOptions.length === 0 ? (
                <p className="text-sm text-slate-400 p-3 text-center">No other contacts found</p>
              ) : mergeOptions.map(c => (
                <button
                  key={c.id}
                  onClick={() => setMergeId(c.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2",
                    mergeId === c.id ? "bg-red-50 text-red-700 font-medium" : "hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                    {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium">{c.name}</span>
                    {c.entity && <span className="text-slate-400"> · {c.entity}</span>}
                    {c.email && <span className="text-slate-400"> · {c.email}</span>}
                  </div>
                  {mergeId === c.id && <Check className="w-4 h-4 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {keepContact && mergeContact && (
            <div className="flex gap-3">
              <ContactCard contact={keepContact} label="Keep" side="keep" />
              <div className="flex items-center text-slate-400 font-bold text-lg self-center">→</div>
              <ContactCard contact={mergeContact} label="Merge In" side="merge" />
            </div>
          )}

          {keepContact && mergeContact && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <strong>What will happen:</strong> All deals and leads referencing <em>{mergeContact.name}</em> will be updated to show <em>{keepContact.name}</em>. The merged contact will be removed from the contacts list.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => canConfirm && onConfirm(keepId, mergeId)}
            disabled={!canConfirm}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              canConfirm
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            Confirm Merge
          </button>
        </div>
      </div>
    </div>
  );
};

const ContactDetailView = ({
  contact,
  allContacts,
  onBack,
  onSelectDeal,
  onSelectLead,
  onUpdateStandaloneContact,
  onAddStandaloneContact,
  onMerge,
}: {
  contact: DerivedContact;
  allContacts: DerivedContact[];
  onBack: () => void;
  onSelectDeal: (id: string) => void;
  onSelectLead: (id: string) => void;
  onUpdateStandaloneContact?: (c: StandaloneContact) => void;
  onAddStandaloneContact?: (c: StandaloneContact) => void;
  onMerge?: (keepId: string, mergeId: string) => void;
}) => {
  const txSources = contact.sources.filter(s => s.type !== 'lead' && s.type !== 'standalone');
  const leadSources = contact.sources.filter(s => s.type === 'lead');
  const standaloneSource = contact.sources.find(s => s.type === 'standalone');
  const initials = contact.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const [isEditing, setIsEditing] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [editData, setEditData] = useState({
    name: contact.name,
    entity: contact.entity || '',
    email: contact.email || '',
    phone: contact.phone || '',
    primaryRole: contact.primaryRole,
    notes: '',
  });

  const handleSaveEdit = () => {
    if (!editData.name.trim()) return;
    const updated: StandaloneContact = {
      id: standaloneSource?.id || Math.random().toString(36).substr(2, 9),
      name: editData.name.trim(),
      entity: editData.entity.trim() || undefined,
      email: editData.email.trim() || undefined,
      phone: editData.phone.trim() || undefined,
      primaryRole: editData.primaryRole.trim() || undefined,
      notes: editData.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    if (standaloneSource && onUpdateStandaloneContact) {
      onUpdateStandaloneContact(updated);
    } else if (onAddStandaloneContact) {
      onAddStandaloneContact(updated);
    }
    setIsEditing(false);
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Contacts
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editData.name}
                  onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={editData.entity}
                    onChange={e => setEditData(d => ({ ...d, entity: e.target.value }))}
                    placeholder="Company / Entity"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    value={editData.primaryRole}
                    onChange={e => setEditData(d => ({ ...d, primaryRole: e.target.value }))}
                    placeholder="Role (e.g. Buyer, Broker)"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="email"
                    value={editData.email}
                    onChange={e => setEditData(d => ({ ...d, email: e.target.value }))}
                    placeholder="Email"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))}
                    placeholder="Phone"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">Save</button>
                  <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-slate-900">{contact.name}</h1>
                {contact.entity && <p className="text-slate-500 text-sm mt-0.5">{contact.entity}</p>}
                <div className="flex flex-wrap gap-3 mt-3">
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full">{contact.primaryRole}</span>
                  {contact.sources.length > 1 && (
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">{contact.sources.length} associations</span>
                  )}
                  {standaloneSource && (
                    <span className="px-2.5 py-1 bg-violet-50 text-violet-700 text-xs rounded-full">Saved contact</span>
                  )}
                </div>
              </>
            )}
          </div>
          {!isEditing && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => { setEditData({ name: contact.name, entity: contact.entity || '', email: contact.email || '', phone: contact.phone || '', primaryRole: contact.primaryRole, notes: '' }); setIsEditing(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              {onMerge && (
                <button
                  onClick={() => setShowMergeModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <GitMerge className="w-3.5 h-3.5" /> Merge
                </button>
              )}
            </div>
          )}
        </div>

        {/* Contact info */}
        {!isEditing && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              {contact.email
                ? <a href={`mailto:${contact.email}`} className="text-sm text-indigo-600 hover:underline">{contact.email}</a>
                : <span className="text-sm text-slate-400 italic">No email on file</span>}
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              {contact.phone
                ? <a href={`tel:${contact.phone}`} className="text-sm text-indigo-600 hover:underline">{contact.phone}</a>
                : <span className="text-sm text-slate-400 italic">No phone on file</span>}
            </div>
          </div>
        )}
      </div>

      {/* Transactions */}
      {txSources.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" /> Associated Deals ({txSources.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {txSources.map((src, i) => (
              <button
                key={i}
                onClick={() => onSelectDeal(src.id)}
                className="w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{src.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Role: <span className="font-medium">{src.role}</span>
                    {src.coeDate && <> · COE: {format(parseISO(src.coeDate), 'MMM d, yyyy')}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {src.stage && (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-semibold",
                      src.stage === 'Closed' ? "bg-emerald-100 text-emerald-700" :
                      src.stage === 'Escrow' ? "bg-amber-100 text-amber-700" :
                      src.stage === 'Contract' ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-600"
                    )}>{src.stage}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Leads */}
      {leadSources.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" /> Associated Leads ({leadSources.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {leadSources.map((src, i) => (
              <button
                key={i}
                onClick={() => onSelectLead(src.id)}
                className="w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{src.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Role: <span className="font-medium">{src.role}</span></p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {showMergeModal && onMerge && (
        <MergeContactsModal
          contacts={allContacts}
          initialKeepId={contact.id}
          onConfirm={(keepId, mergeId) => { onMerge(keepId, mergeId); setShowMergeModal(false); }}
          onClose={() => setShowMergeModal(false)}
        />
      )}
    </div>
  );
};

const ContactsView = ({
  contacts,
  selectedContactId,
  onSelectContact,
  onBack,
  onSelectDeal,
  onSelectLead,
  onAddContact,
  onUpdateContact,
  onMerge,
}: {
  contacts: DerivedContact[];
  selectedContactId: string | null;
  onSelectContact: (id: string) => void;
  onBack: () => void;
  onSelectDeal: (id: string) => void;
  onSelectLead: (id: string) => void;
  onAddContact?: (c: StandaloneContact) => void;
  onUpdateContact?: (c: StandaloneContact) => void;
  onMerge?: (keepId: string, mergeId: string) => void;
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Buyer' | 'Seller' | 'Other' | 'Lead Contact'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', entity: '', email: '', phone: '', primaryRole: '' });

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  if (selectedContact) {
    return (
      <ContactDetailView
        contact={selectedContact}
        allContacts={contacts}
        onBack={onBack}
        onSelectDeal={onSelectDeal}
        onSelectLead={onSelectLead}
        onUpdateStandaloneContact={onUpdateContact}
        onAddStandaloneContact={onAddContact}
        onMerge={onMerge}
      />
    );
  }

  const ROLE_FILTERS = ['all', 'Buyer', 'Seller', 'Other', 'Lead Contact'] as const;

  const filtered = contacts.filter(c => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email?.toLowerCase().includes(search.toLowerCase())) ||
      (c.entity?.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = roleFilter === 'all' ||
      (roleFilter === 'Other' ? !['Buyer','Seller','Lead Contact'].includes(c.primaryRole) : c.primaryRole === roleFilter);
    return matchesSearch && matchesRole;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAddContact = () => {
    if (!newContact.name.trim() || !onAddContact) return;
    onAddContact({
      id: Math.random().toString(36).substr(2, 9),
      name: newContact.name.trim(),
      entity: newContact.entity.trim() || undefined,
      email: newContact.email.trim() || undefined,
      phone: newContact.phone.trim() || undefined,
      primaryRole: newContact.primaryRole.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setNewContact({ name: '', entity: '', email: '', phone: '', primaryRole: '' });
    setShowAddForm(false);
  };

  const mergePreselectedIds = Array.from<string>(selectedIds).slice(0, 2);

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
          <p className="text-slate-500">All contacts across your pipeline and leads.</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size === 2 && onMerge && (
            <button
              onClick={() => setShowMergeModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <GitMerge className="w-4 h-4" /> Merge Selected ({selectedIds.size})
            </button>
          )}
          {selectedIds.size > 0 && selectedIds.size !== 2 && (
            <span className="text-xs text-slate-500 self-center">{selectedIds.size === 1 ? 'Select 1 more to merge' : 'Select exactly 2 to merge'}</span>
          )}
          {onAddContact && (
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Contact
            </button>
          )}
        </div>
      </div>

      {/* Add contact form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">New Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Full name *"
              value={newContact.name}
              onChange={e => setNewContact(d => ({ ...d, name: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <input
              type="text"
              placeholder="Company / Entity"
              value={newContact.entity}
              onChange={e => setNewContact(d => ({ ...d, entity: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <input
              type="email"
              placeholder="Email"
              value={newContact.email}
              onChange={e => setNewContact(d => ({ ...d, email: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={newContact.phone}
              onChange={e => setNewContact(d => ({ ...d, phone: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <input
              type="text"
              placeholder="Role (e.g. Buyer, Broker, Lender)"
              value={newContact.primaryRole}
              onChange={e => setNewContact(d => ({ ...d, primaryRole: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:col-span-2"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddContact} disabled={!newContact.name.trim()} className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-colors", newContact.name.trim() ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-100 text-slate-400 cursor-not-allowed")}>
              Save Contact
            </button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {ROLE_FILTERS.map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                roleFilter === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {r === 'all' ? 'All' : r}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} contacts</span>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
          <Check className="w-3.5 h-3.5" />
          <span>{selectedIds.size} selected — check 2 contacts to merge them</span>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-indigo-500 hover:text-indigo-700 font-medium">Clear</button>
        </div>
      )}

      {/* Contact list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No contacts found</p>
          <p className="text-slate-400 text-sm mt-1">Contacts are automatically pulled from your deals and leads, or add one manually.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(contact => {
              const initials = contact.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              const txCount = contact.sources.filter(s => s.type !== 'lead' && s.type !== 'standalone').length;
              const leadCount = contact.sources.filter(s => s.type === 'lead').length;
              const isSelected = selectedIds.has(contact.id);
              const isStandalone = contact.sources.some(s => s.type === 'standalone');
              return (
                <div
                  key={contact.id}
                  className={cn("flex items-center gap-3 px-4 py-4 hover:bg-slate-50 transition-colors", isSelected && "bg-indigo-50")}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(contact.id)}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                  />
                  <button
                    onClick={() => onSelectContact(contact.id)}
                    className="flex-1 text-left flex items-center gap-4 min-w-0"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 truncate">{contact.name}</p>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded shrink-0">{contact.primaryRole}</span>
                        {isStandalone && <span className="px-1.5 py-0.5 bg-violet-50 text-violet-600 text-xs rounded shrink-0">saved</span>}
                      </div>
                      {contact.entity && <p className="text-xs text-slate-500 truncate">{contact.entity}</p>}
                      <div className="flex items-center gap-3 mt-1">
                        {contact.email && <p className="text-xs text-slate-400 truncate flex items-center gap-1"><Mail className="w-3 h-3" /> {contact.email}</p>}
                        {contact.phone && <p className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {contact.phone}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-right">
                      <div className="text-xs text-slate-400">
                        {txCount > 0 && <span className="block">{txCount} deal{txCount !== 1 ? 's' : ''}</span>}
                        {leadCount > 0 && <span className="block">{leadCount} lead{leadCount !== 1 ? 's' : ''}</span>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showMergeModal && onMerge && (
        <MergeContactsModal
          contacts={contacts}
          initialKeepId={mergePreselectedIds[0]}
          initialMergeId={mergePreselectedIds[1]}
          onConfirm={(keepId, mergeId) => {
            onMerge(keepId, mergeId);
            setSelectedIds(new Set());
            setShowMergeModal(false);
          }}
          onClose={() => setShowMergeModal(false)}
        />
      )}
    </div>
  );
};

const TransactionDetailView = ({
  transaction,
  onSave,
  onClose,
  onSelectContact,
  contacts = [],
}: {
  transaction: Transaction,
  onSave: (t: Transaction) => void,
  onClose: () => void,
  onSelectContact?: (contactId: string) => void,
  contacts?: DerivedContact[],
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'parties' | 'timeline' | 'documents'>('overview');
  const [isEditing, setIsEditing] = useState(false);

  // Normalize parties on init: assign IDs to any party missing one, and infer `side`
  // from legacy role text so existing 'Buyer 2' entries surface under Buyers.
  const [formData, setFormData] = useState<Transaction>(() => {
    const norm = (p: Party): Party => ({
      ...p,
      id: p.id || Math.random().toString(36).substr(2, 9),
      side: p.side || (/^buyer/i.test(p.role) ? 'buyer' : /^seller/i.test(p.role) ? 'seller' : 'third-party'),
    });
    return {
      ...transaction,
      buyer: norm(transaction.buyer),
      seller: norm(transaction.seller),
      otherParties: transaction.otherParties.map(norm),
      documents: transaction.documents || [],
    };
  });

  // Helper to navigate to a party's contact page
  const goToContact = (name: string, email?: string) => {
    if (!onSelectContact || !name.trim()) return;
    const id = email?.trim().toLowerCase() || name.trim().toLowerCase();
    onSelectContact(id);
  };
  
  // Timeline State
  const [newNote, setNewNote] = useState('');
  const [newNoteDate, setNewNoteDate] = useState(new Date().toISOString().slice(0, 16));
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [editingNoteDate, setEditingNoteDate] = useState('');

  // Reminder State
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newReminder, setNewReminder] = useState<LeadReminder>({ id: '', date: '', description: '', completed: false });

  // Reset form data when transaction changes
  useEffect(() => {
    setFormData({ ...transaction, documents: transaction.documents || [] });
    setIsEditing(false);
  }, [transaction]);

  const math = useCommissionMath(formData);

  // --- Party autocomplete ---
  const [activeSuggestions, setActiveSuggestions] = useState<{ key: string; items: DerivedContact[] } | null>(null);
  const getContactSuggestions = (value: string) =>
    value.trim().length < 1 ? [] :
    contacts.filter(c => c.name.toLowerCase().includes(value.toLowerCase())).slice(0, 5);

  // --- Timeline Logic ---
  const addNote = () => {
    if (!newNote.trim()) return;
    const note: Note = {
      id: Math.random().toString(36).substr(2, 9),
      content: newNote,
      date: new Date(newNoteDate).toISOString()
    };
    const updatedData = {
      ...formData,
      notesLog: [note, ...(formData.notesLog || [])]
    };
    setFormData(updatedData);
    onSave(updatedData);
    setNewNote('');
    setNewNoteDate(new Date().toISOString().slice(0, 16));
  };

  const deleteNote = (noteId: string) => {
    const updatedData = {
        ...formData,
        notesLog: formData.notesLog?.filter(n => n.id !== noteId) || []
    };
    setFormData(updatedData);
    onSave(updatedData);
  };

  const startEditingNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
    setEditingNoteDate(new Date(note.date).toISOString().slice(0, 16));
  };

  const saveEditedNote = () => {
    if (!editingNoteId) return;
    const updatedData = {
        ...formData,
        notesLog: formData.notesLog?.map(n => 
            n.id === editingNoteId 
                ? { ...n, content: editingNoteContent, date: new Date(editingNoteDate).toISOString() }
                : n
        ) || []
    };
    setFormData(updatedData);
    onSave(updatedData);
    setEditingNoteId(null);
  };

  // --- Reminder Logic ---
  const addReminder = () => {
      if (!newReminder.date || !newReminder.description) return;
      const reminder: LeadReminder = { ...newReminder, id: Math.random().toString(36).substr(2, 9) };
      const updatedData = {
          ...formData,
          reminders: [...(formData.reminders || []), reminder]
      };
      setFormData(updatedData);
      onSave(updatedData);
      setNewReminder({ id: '', date: '', description: '', completed: false });
      setIsAddingReminder(false);
  };

  const toggleReminder = (id: string) => {
      const updatedData = {
          ...formData,
          reminders: formData.reminders?.map(r => 
            r.id === id ? { ...r, completed: !r.completed } : r
          ) || []
      };
      setFormData(updatedData);
      onSave(updatedData);
  };

  const deleteReminder = (id: string) => {
      const updatedData = {
          ...formData,
          reminders: formData.reminders?.filter(r => r.id !== id) || []
      };
      setFormData(updatedData);
      onSave(updatedData);
  };

  const handleInputChange = (field: keyof Transaction, value: any) => {
    let newData = { ...formData, [field]: value };

    // Auto-balance splits
    if (field === 'treySplitPercent') {
      newData.kirkSplitPercent = Number((100 - Number(value)).toFixed(2));
    } else if (field === 'kirkSplitPercent') {
      newData.treySplitPercent = Number((100 - Number(value)).toFixed(2));
    }

    setFormData(newData);
  };

  const handlePartyChange = (role: 'buyer' | 'seller', field: keyof Party, value: string) => {
    setFormData(prev => ({
      ...prev,
      [role]: { ...prev[role], [field]: value }
    }));
  };

  // ── Multi-party helpers ──────────────────────────────────────────────────
  const getCombined = (side: 'buyer' | 'seller'): Party[] => {
    const extras = formData.otherParties.filter(p => p.side === side);
    return [formData[side], ...extras];
  };

  const setCombined = (side: 'buyer' | 'seller', arr: Party[]) => {
    const [primary, ...rest] = arr;
    const otherSide = side === 'buyer' ? 'seller' : 'buyer';
    const otherExtras = formData.otherParties.filter(p => p.side === otherSide);
    const thirds = formData.otherParties.filter(p => !p.side || p.side === 'third-party');
    setFormData(prev => ({
      ...prev,
      [side]: { ...primary, side: undefined },
      otherParties: [
        ...otherExtras,
        ...rest.map(p => ({ ...p, side: side as Party['side'] })),
        ...thirds,
      ],
    }));
  };

  const getThirdParties = (): Party[] =>
    formData.otherParties.filter(p => !p.side || p.side === 'third-party');

  const setThirdParties = (thirds: Party[]) => {
    const buyerExtras = formData.otherParties.filter(p => p.side === 'buyer');
    const sellerExtras = formData.otherParties.filter(p => p.side === 'seller');
    setFormData(prev => ({
      ...prev,
      otherParties: [
        ...buyerExtras,
        ...sellerExtras,
        ...thirds.map(p => ({ ...p, side: 'third-party' as Party['side'] })),
      ],
    }));
  };

  const addPartyToGroup = (side: 'buyer' | 'seller' | 'third-party') => {
    if (side === 'third-party') {
      setThirdParties([...getThirdParties(), mkParty('', 'third-party')]);
    } else {
      setCombined(side, [...getCombined(side), mkParty('', side)]);
    }
  };

  const updatePartyInGroup = (
    side: 'buyer' | 'seller' | 'third-party',
    idx: number,
    field: keyof Party,
    value: string
  ) => {
    if (side === 'third-party') {
      setThirdParties(getThirdParties().map((p, i) => i === idx ? { ...p, [field]: value } : p));
    } else {
      setCombined(side, getCombined(side).map((p, i) => i === idx ? { ...p, [field]: value } : p));
    }
  };

  const removePartyFromGroup = (side: 'buyer' | 'seller' | 'third-party', idx: number) => {
    if (side === 'third-party') {
      setThirdParties(getThirdParties().filter((_, i) => i !== idx));
    } else {
      if (idx === 0) return; // primary cannot be removed
      setCombined(side, getCombined(side).filter((_, i) => i !== idx));
    }
  };

  // Legacy shims for Overview widget backward compat
  const addOtherParty = () => addPartyToGroup('third-party');
  const updateOtherParty = (index: number, field: keyof Party, value: string) =>
    updatePartyInGroup('third-party', index, field, value);
  const removeOtherParty = (index: number) => removePartyFromGroup('third-party', index);

  const addCustomDate = () => {
    setFormData(prev => ({
      ...prev,
      customDates: [...prev.customDates, { id: Math.random().toString(36).substr(2, 9), label: '', date: '', completed: false }]
    }));
  };

  const updateCustomDate = (id: string, field: keyof CustomDate, value: any) => {
    setFormData(prev => ({
      ...prev,
      customDates: prev.customDates.map(d => d.id === id ? { ...d, [field]: value } : d)
    }));
  };

  const removeCustomDate = (id: string) => {
    setFormData(prev => ({
      ...prev,
      customDates: prev.customDates.filter(d => d.id !== id)
    }));
  };

  const handleUploadDocuments = (newDocs: TransactionDocument[]) => {
    const updatedData = {
      ...formData,
      documents: [...formData.documents, ...newDocs]
    };
    setFormData(updatedData);
    onSave(updatedData); // Auto-save on upload
  };

  const handleDeleteDocument = (id: string) => {
    const updatedData = {
      ...formData,
      documents: formData.documents.filter(d => d.id !== id)
    };
    setFormData(updatedData);
    onSave(updatedData); // Auto-save on delete
  };

  const handleAIUpdate = (updates: Partial<Transaction>) => {
    const updatedData = { ...formData, ...updates };
    setFormData(updatedData);
    onSave(updatedData); // Auto-save AI updates
  };

  const handleSave = () => {
    onSave(formData);
    setIsEditing(false);
  };

  const handleClose = () => {
    if (isEditing) {
      if (!confirm('You have unsaved changes. Discard them and go back?')) return;
    }
    onClose();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.dealName}
                  onChange={e => handleInputChange('dealName', e.target.value)}
                  className="text-2xl font-bold text-slate-900 border-b-2 border-indigo-400 bg-transparent focus:outline-none w-full"
                />
              ) : (
                <h1 className="text-2xl font-bold text-slate-900 truncate">{formData.dealName}</h1>
              )}
              <StatusBadge stage={formData.stage} />
            </div>
            {isEditing ? (
              <input
                type="text"
                value={formData.address}
                onChange={e => handleInputChange('address', e.target.value)}
                className="text-slate-500 text-sm border-b border-slate-300 bg-transparent focus:outline-none w-full ml-8"
                placeholder="Address"
              />
            ) : (
              <p className="text-slate-500 flex items-center gap-2 text-sm ml-8">
                <MapPin className="w-4 h-4 shrink-0" /> {formData.address}
              </p>
            )}
            {/* Property details summary row */}
            {!isEditing && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 ml-8 text-xs text-slate-500">
                {formData.acreage > 0 && <span className="flex items-center gap-1"><span className="font-medium text-slate-700">{formData.acreage} AC</span></span>}
                {formData.zoning && <span className="flex items-center gap-1">Zoning: <span className="font-medium text-slate-700">{formData.zoning}</span></span>}
                {formData.apn && <span className="flex items-center gap-1">APN: <span className="font-medium text-slate-700">{formData.apn}</span></span>}
                {formData.county && <span className="flex items-center gap-1">County: <span className="font-medium text-slate-700">{formData.county}</span></span>}
              </div>
            )}
          </div>
          <div className="flex gap-3 shrink-0">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 px-2 overflow-x-auto">
        {['overview', 'financials', 'parties', 'timeline', 'documents'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "pb-3 text-sm font-medium capitalize transition-colors relative whitespace-nowrap",
              activeTab === tab ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Column */}
        <div className={cn("space-y-6 order-2 lg:order-1", "lg:col-span-2")}>
          
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Property Details */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-slate-400" /> Property Details</span>
                  {!isEditing && <button onClick={() => setIsEditing(true)} className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Deal Name</label>
                          <input type="text" value={formData.dealName} onChange={e => handleInputChange('dealName', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Address</label>
                          <input type="text" value={formData.address} onChange={e => handleInputChange('address', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">APN / Parcel ID</label>
                          <input type="text" value={formData.apn || ''} onChange={e => handleInputChange('apn', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Origination Year</label>
                          <input type="number" value={formData.projectYear || new Date().getFullYear()} onChange={e => handleInputChange('projectYear', e.target.value)} className="w-full p-2 border rounded-lg text-sm" min="2000" max="2100" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="py-2 border-b border-slate-50">
                          <span className="text-slate-500 text-xs block mb-1">APN / Parcel ID</span>
                          <span className="font-medium text-slate-900">{formData.apn || '-'}</span>
                        </div>
                        <div className="py-2 border-b border-slate-50">
                          <span className="text-slate-500 text-xs block mb-1">County</span>
                          <span className="font-medium text-slate-900">{formData.county || '-'}</span>
                        </div>
                        <div className="py-2 border-b border-slate-50">
                          <span className="text-slate-500 text-xs block mb-1">Origination Year</span>
                          <span className="font-medium text-slate-900">{formData.projectYear || '-'}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="space-y-4">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Acreage</label>
                          <input type="number" value={formData.acreage} onChange={e => handleInputChange('acreage', Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Zoning</label>
                          <input type="text" value={formData.zoning} onChange={e => handleInputChange('zoning', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="py-2 border-b border-slate-50">
                          <span className="text-slate-500 text-xs block mb-1">Acreage</span>
                          <span className="font-medium text-slate-900">{formData.acreage} AC</span>
                        </div>
                        <div className="py-2 border-b border-slate-50">
                          <span className="text-slate-500 text-xs block mb-1">Zoning</span>
                          <span className="font-medium text-slate-900">{formData.zoning}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Widgets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inline Parties Widget */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" /> Parties
                    </h3>
                    {isEditing && (
                      <button onClick={() => setActiveTab('parties')} className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> Manage in Parties tab
                      </button>
                    )}
                  </div>
                  {/* Buyers */}
                  {(() => {
                    const buyers = getCombined('buyer');
                    const sellers = getCombined('seller');
                    const thirds = getThirdParties();
                    const renderPartyRow = (p: Party, idx: number, colorCls: string) => (
                      <div key={p.id || idx} className="flex items-center gap-3 py-2.5 px-5 border-b border-slate-50 last:border-0">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0", colorCls)}>
                          {p.name ? p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          {onSelectContact && p.name
                            ? <button onClick={() => goToContact(p.name, p.email)} className="font-medium text-slate-900 hover:text-indigo-600 text-sm">{p.name}</button>
                            : <p className="font-medium text-slate-900 text-sm">{p.name || <span className="text-slate-400 italic font-normal text-xs">Unnamed</span>}</p>}
                          {p.entity && <p className="text-xs text-slate-400 truncate">{p.entity}</p>}
                        </div>
                      </div>
                    );
                    return (
                      <div className="divide-y divide-slate-100">
                        {buyers.length > 0 && (
                          <div>
                            <p className="px-5 pt-3 pb-1 text-xs font-bold text-indigo-600 uppercase tracking-wider">Buyers ({buyers.length})</p>
                            {buyers.map((p, i) => renderPartyRow(p, i, 'bg-indigo-100 text-indigo-700'))}
                          </div>
                        )}
                        {sellers.length > 0 && (
                          <div>
                            <p className="px-5 pt-3 pb-1 text-xs font-bold text-emerald-600 uppercase tracking-wider">Sellers ({sellers.length})</p>
                            {sellers.map((p, i) => renderPartyRow(p, i, 'bg-emerald-100 text-emerald-700'))}
                          </div>
                        )}
                        {thirds.length > 0 && (
                          <div>
                            <p className="px-5 pt-3 pb-1 text-xs font-bold text-slate-500 uppercase tracking-wider">Third Parties ({thirds.length})</p>
                            {thirds.map((p, i) => renderPartyRow(p, i, 'bg-slate-100 text-slate-600'))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Inline Timeline Widget */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" /> Timeline
                    </h3>
                    <div className="flex items-center gap-2">
                      {isEditing && (
                        <button onClick={addCustomDate} className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Add Date
                        </button>
                      )}
                      {!isEditing && (() => {
                        const exportDates = [
                          { label: 'PSA Date', date: formData.psaDate, type: 'critical' },
                          { label: 'Feasibility', date: formData.feasibilityDate, type: 'critical' },
                          { label: 'COE', date: formData.coeDate, type: 'critical' },
                          ...formData.customDates.map(d => ({ label: d.label, date: d.date, type: d.type || 'custom' }))
                        ].filter(d => d.date);
                        const handleExportICS = () => {
                          const events = exportDates.map(d => ({
                            title: `${d.label} - ${formData.dealName}`,
                            start: parseISO(d.date!),
                            description: `Deal: ${formData.dealName}`
                          }));
                          const ics = generateICS(events);
                          const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', `${formData.dealName.replace(/\s+/g, '_')}_timeline.ics`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        };
                        return (
                          <button onClick={handleExportICS} className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
                            <Download className="w-3 h-3" /> Export .ics
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex-1 relative pl-4 border-l-2 border-slate-100 space-y-5">
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white ring-1 ring-slate-100"></div>
                      <p className="text-xs text-slate-400 uppercase mb-1">PSA Signed</p>
                      {isEditing ? (
                        <input type="date" value={formData.psaDate} onChange={e => handleInputChange('psaDate', e.target.value)} className="p-1 border rounded text-sm" />
                      ) : (
                        <p className="font-medium text-slate-900">{formData.psaDate ? format(parseISO(formData.psaDate), 'MMMM d, yyyy') : <span className="text-slate-400 italic text-sm">Pending</span>}</p>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-amber-200 border-2 border-white ring-1 ring-amber-100"></div>
                      <p className="text-xs text-slate-400 uppercase mb-1">Feasibility Period Ends</p>
                      {isEditing ? (
                        <input type="date" value={formData.feasibilityDate} onChange={e => handleInputChange('feasibilityDate', e.target.value)} className="p-1 border rounded text-sm" />
                      ) : (
                        <p className="font-medium text-slate-900">{formData.feasibilityDate ? format(parseISO(formData.feasibilityDate), 'MMMM d, yyyy') : <span className="text-slate-400 italic text-sm">Pending</span>}</p>
                      )}
                    </div>
                    {formData.customDates.map(date => (
                      <div key={date.id} className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-indigo-200 border-2 border-white ring-1 ring-indigo-100"></div>
                        {isEditing ? (
                          <div className="flex gap-2 items-center">
                            <input type="text" value={date.label} onChange={e => updateCustomDate(date.id, 'label', e.target.value)} className="p-1 border rounded text-xs w-32" placeholder="Label" />
                            <input type="date" value={date.date} onChange={e => updateCustomDate(date.id, 'date', e.target.value)} className="p-1 border rounded text-sm" />
                            <button onClick={() => removeCustomDate(date.id)} className="text-red-500"><X className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-slate-400 uppercase mb-1">{date.label}</p>
                            <p className="font-medium text-slate-900">{date.date ? format(parseISO(date.date), 'MMMM d, yyyy') : <span className="text-slate-400 italic text-sm">Pending</span>}</p>
                          </>
                        )}
                      </div>
                    ))}
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white ring-1 ring-emerald-200"></div>
                      <p className="text-xs text-slate-400 uppercase mb-1">Close of Escrow</p>
                      {isEditing ? (
                        <input type="date" value={formData.coeDate} onChange={e => handleInputChange('coeDate', e.target.value)} className="p-1 border rounded text-sm" />
                      ) : (
                        <p className="font-medium text-slate-900">{formData.coeDate ? format(parseISO(formData.coeDate), 'MMMM d, yyyy') : <span className="text-slate-400 italic text-sm">Pending</span>}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reminders & Timeline */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Reminders Widget */}
                  <div className="lg:col-span-1">
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
                          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                  <Calendar className="w-4 h-4" /> Follow-Up Reminders
                              </h3>
                              <button 
                                  onClick={() => setIsAddingReminder(true)}
                                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                              >
                                  <Plus className="w-3 h-3" /> Add
                              </button>
                          </div>
                          
                          <div className="p-4 space-y-3">
                              {isAddingReminder && (
                                  <div className="bg-slate-50 p-3 rounded-lg border border-indigo-200 space-y-2 mb-4 animate-in fade-in">
                                      <input 
                                          type="date"
                                          className="w-full p-1.5 text-sm border border-slate-200 rounded"
                                          value={newReminder.date}
                                          onChange={e => setNewReminder(prev => ({ ...prev, date: e.target.value }))}
                                      />
                                      <input 
                                          placeholder="Description (e.g. Call back)"
                                          className="w-full p-1.5 text-sm border border-slate-200 rounded"
                                          value={newReminder.description}
                                          onChange={e => setNewReminder(prev => ({ ...prev, description: e.target.value }))}
                                      />
                                      <div className="flex justify-end gap-2 pt-2">
                                          <button onClick={() => setIsAddingReminder(false)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                                          <button onClick={addReminder} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">Set Reminder</button>
                                      </div>
                                  </div>
                              )}

                              {formData.reminders?.map(reminder => (
                                  <div key={reminder.id} className={cn("flex items-start gap-3 p-3 rounded-lg border transition-all", reminder.completed ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-200 shadow-sm")}>
                                      <input 
                                          type="checkbox"
                                          checked={reminder.completed}
                                          onChange={() => toggleReminder(reminder.id)}
                                          className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                      />
                                      <div className="flex-1 min-w-0">
                                          <p className={cn("text-sm font-medium", reminder.completed ? "text-slate-500 line-through" : "text-slate-900")}>
                                              {reminder.description}
                                          </p>
                                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                              <Calendar className="w-3 h-3" />
                                              {format(parseISO(reminder.date), 'MMM d, yyyy')}
                                          </p>
                                      </div>
                                      <button onClick={() => deleteReminder(reminder.id)} className="text-slate-400 hover:text-red-500">
                                          <X className="w-3 h-3" />
                                      </button>
                                  </div>
                              ))}
                              
                              {(!formData.reminders || formData.reminders.length === 0) && !isAddingReminder && (
                                  <p className="text-xs text-slate-400 text-center py-4">No active reminders.</p>
                              )}
                          </div>
                      </div>
                  </div>

                  {/* Activity Timeline */}
                  <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                      <div className="p-4 border-b border-slate-200 bg-slate-50">
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                              <History className="w-4 h-4" /> Activity Timeline
                          </h3>
                      </div>

                      <div className="p-6 flex-1 flex flex-col">
                          {/* Add Note Input */}
                          <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                              <div className="flex gap-2 mb-2">
                                  <input 
                                      type="datetime-local"
                                      value={newNoteDate}
                                      onChange={e => setNewNoteDate(e.target.value)}
                                      className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-600"
                                  />
                              </div>
                              <textarea 
                                  value={newNote}
                                  onChange={e => setNewNote(e.target.value)}
                                  placeholder="Log a call, meeting, or update..."
                                  className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px] mb-2 bg-white"
                              />
                              <div className="flex justify-end">
                                  <button 
                                      onClick={addNote}
                                      disabled={!newNote.trim()}
                                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  >
                                      <Plus className="w-3 h-3" /> Log Activity
                                  </button>
                              </div>
                          </div>

                          {/* Timeline */}
                          <div className="flex-1 space-y-6 relative before:absolute before:left-4 before:top-0 before:bottom-0 before:w-px before:bg-slate-200">
                              {formData.notesLog?.map((note) => (
                                  <div key={note.id} className="relative pl-10 group">
                                      <div className="absolute left-2 top-2 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 z-10" />
                                      
                                      {editingNoteId === note.id ? (
                                          <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-sm space-y-2">
                                              <input 
                                                  type="datetime-local"
                                                  value={editingNoteDate}
                                                  onChange={e => setEditingNoteDate(e.target.value)}
                                                  className="w-full text-xs border border-slate-200 rounded px-2 py-1"
                                              />
                                              <textarea 
                                                  value={editingNoteContent}
                                                  onChange={e => setEditingNoteContent(e.target.value)}
                                                  className="w-full p-2 border border-slate-200 rounded text-sm min-h-[60px]"
                                              />
                                              <div className="flex justify-end gap-2">
                                                  <button onClick={() => setEditingNoteId(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                                                  <button onClick={saveEditedNote} className="p-1 text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /></button>
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
                                              <div className="flex justify-between items-start mb-1">
                                                  <span className="text-xs font-medium text-slate-500">
                                                      {format(parseISO(note.date), 'MMM d, yyyy h:mm a')}
                                                  </span>
                                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <button onClick={() => startEditingNote(note)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 className="w-3 h-3" /></button>
                                                      <button onClick={() => deleteNote(note.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                                  </div>
                                              </div>
                                              <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                                          </div>
                                      )}
                                  </div>
                              ))}
                              {(!formData.notesLog || formData.notesLog.length === 0) && (
                                  <div className="pl-10 text-sm text-slate-400 italic">
                                      No activity logged yet.
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>

              {/* AI Assistant */}
              <div id="ai-assistant-widget" className="mt-6">
                  <AIAssistant 
                      transaction={formData} 
                      onUpdateTransaction={handleAIUpdate} 
                  />
              </div>
            </div>
          )}

          {activeTab === 'parties' && (() => {
            const buyers = getCombined('buyer');
            const sellers = getCombined('seller');
            const thirds = getThirdParties();

            // Plain render function (not a component) — avoids React unmounting on every keystroke
            const renderPartyGroup = (
              side: 'buyer' | 'seller' | 'third-party',
              parties: Party[],
              color: 'indigo' | 'emerald' | 'slate',
              label: string,
              addLabel: string,
            ) => {
              const bg = color === 'indigo' ? 'bg-indigo-100 text-indigo-700' : color === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600';
              const pill = color === 'indigo' ? 'bg-indigo-50 border-indigo-200' : color === 'emerald' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200';
              return (
                <div key={side} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className={cn("flex items-center justify-between px-5 py-3 border-b border-slate-100", color === 'indigo' ? 'bg-indigo-50/60' : color === 'emerald' ? 'bg-emerald-50/60' : 'bg-slate-50')}>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      {label}
                      <span className="font-normal text-slate-400 normal-case text-xs">{parties.length > 0 ? `(${parties.length})` : ''}</span>
                    </h3>
                    {isEditing && (
                      <button
                        onClick={() => addPartyToGroup(side)}
                        className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> {addLabel}
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-slate-50">
                    {parties.length === 0 && (
                      <p className="px-5 py-4 text-sm text-slate-400 italic">None listed.</p>
                    )}
                    {parties.map((party, idx) => {
                      const initials = party.name ? party.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : (color === 'indigo' ? 'B' : color === 'emerald' ? 'S' : '?');
                      const isPrimary = side !== 'third-party' && idx === 0;
                      const suggKey = `${side}-${idx}`;
                      const suggestions = activeSuggestions?.key === suggKey ? activeSuggestions.items : [];
                      return (
                        <div
                          key={party.id || idx}
                          className={cn("px-5 py-4 transition-colors", isEditing && "hover:bg-slate-50/80")}
                        >
                          {isEditing ? (
                            <div className="flex items-start gap-3">
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {side === 'third-party' && (
                                  <div className="sm:col-span-2">
                                    <input
                                      type="text"
                                      value={party.role}
                                      onChange={e => updatePartyInGroup(side, idx, 'role', e.target.value)}
                                      placeholder="Label (e.g. Escrow Agent, Title Officer)"
                                      className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                                    />
                                  </div>
                                )}
                                <div className="relative sm:col-span-2">
                                  <input
                                    type="text"
                                    value={party.name}
                                    autoComplete="off"
                                    onChange={e => {
                                      updatePartyInGroup(side, idx, 'name', e.target.value);
                                      const items = getContactSuggestions(e.target.value);
                                      setActiveSuggestions(items.length > 0 ? { key: suggKey, items } : null);
                                    }}
                                    onBlur={() => setTimeout(() => setActiveSuggestions(null), 150)}
                                    placeholder="Name"
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                                  />
                                  {suggestions.length > 0 && (
                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                                      {suggestions.map(c => (
                                        <button
                                          key={c.id}
                                          type="button"
                                          onMouseDown={() => {
                                            updatePartyInGroup(side, idx, 'name', c.name);
                                            if (c.entity) updatePartyInGroup(side, idx, 'entity', c.entity);
                                            if (c.email) updatePartyInGroup(side, idx, 'email', c.email);
                                            if (c.phone) updatePartyInGroup(side, idx, 'phone', c.phone);
                                            setActiveSuggestions(null);
                                          }}
                                          className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center gap-2"
                                        >
                                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0", bg)}>
                                            {c.name[0]}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-xs font-medium text-slate-900 truncate">{c.name}</p>
                                            {c.entity && <p className="text-xs text-slate-400 truncate">{c.entity}</p>}
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  value={party.entity || ''}
                                  onChange={e => updatePartyInGroup(side, idx, 'entity', e.target.value)}
                                  placeholder="Entity / LLC / Trust"
                                  className="p-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                                />
                                <input
                                  type="email"
                                  value={party.email || ''}
                                  onChange={e => updatePartyInGroup(side, idx, 'email', e.target.value)}
                                  placeholder="Email"
                                  className="p-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                                />
                                <input
                                  type="text"
                                  value={party.phone || ''}
                                  onChange={e => updatePartyInGroup(side, idx, 'phone', e.target.value)}
                                  placeholder="Phone"
                                  className="p-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                                />
                              </div>
                              <div className="shrink-0 pt-1">
                                {!isPrimary ? (
                                  <button
                                    onClick={() => removePartyFromGroup(side, idx)}
                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Remove"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <div className="w-8" />
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-4">
                              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0", bg)}>
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {onSelectContact && party.name
                                    ? <button onClick={() => goToContact(party.name, party.email)} className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors">{party.name}</button>
                                    : <p className="font-semibold text-slate-900">{party.name || <span className="text-slate-400 italic font-normal">Unnamed</span>}</p>}
                                  {isPrimary && <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Primary</span>}
                                  {side === 'third-party' && party.role && <span className={cn("text-xs font-semibold uppercase px-2 py-0.5 rounded border", pill)}>{party.role}</span>}
                                </div>
                                {party.entity && <p className="text-xs text-slate-500 mt-0.5">{party.entity}</p>}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                                  {party.email && <p className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {party.email}</p>}
                                  {party.phone && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {party.phone}</p>}
                                  {!party.email && !party.phone && <p className="text-xs text-slate-400 italic">No contact info</p>}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            };

            return (
              <div className="space-y-4 animate-in fade-in duration-300">
                {renderPartyGroup('buyer', buyers, 'indigo', 'Buyers', 'Add Buyer')}
                {renderPartyGroup('seller', sellers, 'emerald', 'Sellers', 'Add Seller')}
                {renderPartyGroup('third-party', thirds, 'slate', 'Third Parties', 'Add Third Party')}
              </div>
            );
          })()}

          {activeTab === 'timeline' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" /> Critical Dates
                  </h3>
                  {isEditing && (
                    <button onClick={addCustomDate} className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Date
                    </button>
                  )}
                </div>

                <div className="space-y-6 relative pl-4 border-l-2 border-slate-100 ml-2">
                  {/* Standard Dates */}
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white ring-1 ring-slate-100"></div>
                    <p className="text-xs text-slate-400 uppercase mb-1">PSA Signed</p>
                    {isEditing ? (
                      <input type="date" value={formData.psaDate} onChange={e => handleInputChange('psaDate', e.target.value)} className="p-1 border rounded text-sm" />
                    ) : (
                      <p className="font-medium text-slate-900">{formData.psaDate ? format(parseISO(formData.psaDate), 'MMMM d, yyyy') : 'Pending'}</p>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-amber-200 border-2 border-white ring-1 ring-amber-100"></div>
                    <p className="text-xs text-slate-400 uppercase mb-1">Feasibility Period Ends</p>
                    {isEditing ? (
                      <input type="date" value={formData.feasibilityDate} onChange={e => handleInputChange('feasibilityDate', e.target.value)} className="p-1 border rounded text-sm" />
                    ) : (
                      <p className="font-medium text-slate-900">{formData.feasibilityDate ? format(parseISO(formData.feasibilityDate), 'MMMM d, yyyy') : 'Pending'}</p>
                    )}
                  </div>

                  {/* Custom Dates */}
                  {formData.customDates.map(date => (
                    <div key={date.id} className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-indigo-200 border-2 border-white ring-1 ring-indigo-100"></div>
                      {isEditing ? (
                        <div className="flex gap-2 items-center">
                          <input type="text" value={date.label} onChange={e => updateCustomDate(date.id, 'label', e.target.value)} className="p-1 border rounded text-xs w-32" placeholder="Label" />
                          <input type="date" value={date.date} onChange={e => updateCustomDate(date.id, 'date', e.target.value)} className="p-1 border rounded text-sm" />
                          <button onClick={() => removeCustomDate(date.id)} className="text-red-500"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-slate-400 uppercase mb-1">{date.label}</p>
                          <p className="font-medium text-slate-900">{date.date ? format(parseISO(date.date), 'MMMM d, yyyy') : 'Pending'}</p>
                        </>
                      )}
                    </div>
                  ))}

                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white ring-1 ring-emerald-200"></div>
                    <p className="text-xs text-slate-400 uppercase mb-1">Close of Escrow</p>
                    {isEditing ? (
                      <input type="date" value={formData.coeDate} onChange={e => handleInputChange('coeDate', e.target.value)} className="p-1 border rounded text-sm" />
                    ) : (
                      <p className="font-medium text-slate-900">{formData.coeDate ? format(parseISO(formData.coeDate), 'MMMM d, yyyy') : 'Pending'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <DocumentSection 
              documents={formData.documents} 
              onUpload={handleUploadDocuments} 
              onDelete={handleDeleteDocument} 
            />
          )}

          {activeTab === 'financials' && (
             <div className="lg:hidden">
                {/* Mobile Financials View (since sticky sidebar is hidden on mobile usually, but here we show it inline) */}
                {/* Re-using the logic from the sidebar but inline for mobile if needed, or just rely on the sidebar which stacks on mobile */}
                <p className="text-slate-500 italic">Financial details are shown in the sidebar.</p>
             </div>
          )}
        </div>

        {/* Sticky Sidebar - Financials (Always Visible on Desktop) */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <div className="sticky top-6 space-y-6">
            <div className={cn(
              "rounded-xl border shadow-sm overflow-hidden transition-colors duration-300",
              isEditing ? "bg-slate-900 border-slate-800 text-white ring-4 ring-indigo-500/20" : "bg-white border-slate-200"
            )}>
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={cn("text-sm font-semibold uppercase tracking-wider", isEditing ? "text-slate-400" : "text-slate-500")}>
                    Financial Breakdown
                  </h3>
                  {!isEditing && <button onClick={() => setIsEditing(true)} className="p-1 text-slate-400 hover:text-indigo-400 rounded transition-colors" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>}
                </div>
                {isEditing ? (
                  <div className="mt-4">
                    <label className="text-xs text-slate-400 block mb-1">Sale Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input 
                        type="number" 
                        value={formData.price} 
                        onChange={e => handleInputChange('price', Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-7 pr-3 text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-3xl font-bold font-mono tracking-tight text-slate-900 mt-2">
                    {formatCurrency(formData.price)}
                  </div>
                )}
              </div>

              <div className="p-6 space-y-4">
                {/* Gross Commission row */}
                <div className="flex justify-between items-center">
                  <span className={cn("text-sm", isEditing ? "text-slate-300" : "text-slate-600")}>Gross Comm</span>
                  <div className="flex items-center gap-2">
                    {isEditing && (
                      <div className="flex items-center w-20 bg-slate-800 rounded px-2 py-1 border border-slate-700">
                        <input
                          type="number"
                          value={formData.grossCommissionPercent}
                          onChange={e => handleInputChange('grossCommissionPercent', Number(e.target.value))}
                          className="w-full bg-transparent text-right text-xs text-white focus:outline-none"
                        />
                        <span className="text-slate-500 text-xs ml-1">%</span>
                      </div>
                    )}
                    <span className={cn("font-mono font-medium", isEditing ? "text-emerald-400" : "text-emerald-600")}>
                      {formatCurrency(math.grossCommission)}
                    </span>
                  </div>
                </div>

                {/* Agent split slider */}
                <div className={cn("p-3 rounded-lg", isEditing ? "bg-slate-800/50" : "bg-slate-50")}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={isEditing ? "text-slate-400" : "text-slate-500"}>Trey / Kirk Split</span>
                    <span className={isEditing ? "text-slate-400" : "text-slate-500"}>{formData.treySplitPercent}% / {formData.kirkSplitPercent}%</span>
                  </div>
                  {isEditing ? (
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.treySplitPercent}
                      onChange={e => handleInputChange('treySplitPercent', Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  ) : (
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
                      <div className="bg-indigo-500 h-full transition-all" style={{ width: `${formData.treySplitPercent}%` }} />
                      <div className="bg-sky-400 h-full transition-all" style={{ width: `${formData.kirkSplitPercent}%` }} />
                    </div>
                  )}
                </div>

                {/* Per-agent breakdown cards */}
                <div className="space-y-3">
                  {/* Trey card */}
                  <div className={cn("rounded-lg p-3", isEditing ? "bg-slate-800/40 border border-slate-700" : "bg-indigo-50 border border-indigo-100")}>
                    <div className={cn("text-xs font-semibold uppercase tracking-wider mb-2", isEditing ? "text-indigo-400" : "text-indigo-600")}>Trey</div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className={isEditing ? "text-slate-400" : "text-slate-500"}>Gross split ({formData.treySplitPercent}%)</span>
                        <span className={cn("font-mono", isEditing ? "text-slate-200" : "text-slate-700")}>{formatCurrency(math.treyGrossCut)}</span>
                      </div>
                      <div className="flex justify-between text-xs items-center">
                        <div className="flex items-center gap-1">
                          <span className={isEditing ? "text-slate-400" : "text-slate-500"}>LAO override</span>
                          {isEditing && (
                            <div className="flex items-center w-14 bg-slate-800 rounded px-1.5 py-0.5 border border-slate-700 ml-1">
                              <input
                                type="number"
                                value={formData.treyLaoPercent}
                                onChange={e => handleInputChange('treyLaoPercent', Number(e.target.value))}
                                className="w-full bg-transparent text-right text-xs text-white focus:outline-none"
                              />
                              <span className="text-slate-500 text-xs ml-0.5">%</span>
                            </div>
                          )}
                          {!isEditing && <span className="text-slate-400">({formData.treyLaoPercent}%)</span>}
                        </div>
                        <span className={cn("font-mono", isEditing ? "text-red-400" : "text-red-500")}>-{formatCurrency(math.laoFromTrey)}</span>
                      </div>
                      <div className={cn("h-px", isEditing ? "bg-slate-700" : "bg-indigo-200")} />
                      <div className="flex justify-between">
                        <span className={cn("text-xs font-semibold", isEditing ? "text-white" : "text-indigo-700")}>Net to Trey</span>
                        <span className={cn("font-mono font-bold text-sm", isEditing ? "text-indigo-400" : "text-indigo-600")}>{formatCurrency(math.treyNet)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Kirk card */}
                  <div className={cn("rounded-lg p-3", isEditing ? "bg-slate-800/40 border border-slate-700" : "bg-sky-50 border border-sky-100")}>
                    <div className={cn("text-xs font-semibold uppercase tracking-wider mb-2", isEditing ? "text-sky-400" : "text-sky-600")}>Kirk</div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className={isEditing ? "text-slate-400" : "text-slate-500"}>Gross split ({formData.kirkSplitPercent}%)</span>
                        <span className={cn("font-mono", isEditing ? "text-slate-200" : "text-slate-700")}>{formatCurrency(math.kirkGrossCut)}</span>
                      </div>
                      <div className="flex justify-between text-xs items-center">
                        <div className="flex items-center gap-1">
                          <span className={isEditing ? "text-slate-400" : "text-slate-500"}>LAO override</span>
                          {isEditing && (
                            <div className="flex items-center w-14 bg-slate-800 rounded px-1.5 py-0.5 border border-slate-700 ml-1">
                              <input
                                type="number"
                                value={formData.kirkLaoPercent}
                                onChange={e => handleInputChange('kirkLaoPercent', Number(e.target.value))}
                                className="w-full bg-transparent text-right text-xs text-white focus:outline-none"
                              />
                              <span className="text-slate-500 text-xs ml-0.5">%</span>
                            </div>
                          )}
                          {!isEditing && <span className="text-slate-400">({formData.kirkLaoPercent}%)</span>}
                        </div>
                        <span className={cn("font-mono", isEditing ? "text-red-400" : "text-red-500")}>-{formatCurrency(math.laoFromKirk)}</span>
                      </div>
                      <div className={cn("h-px", isEditing ? "bg-slate-700" : "bg-sky-200")} />
                      <div className="flex justify-between">
                        <span className={cn("text-xs font-semibold", isEditing ? "text-white" : "text-sky-700")}>Net to Kirk</span>
                        <span className={cn("font-mono font-bold text-sm", isEditing ? "text-sky-400" : "text-sky-600")}>{formatCurrency(math.kirkNet)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary row */}
                <div className={cn("rounded-lg p-3 space-y-1.5", isEditing ? "bg-slate-700/50" : "bg-slate-100")}>
                  <div className={cn("text-xs font-semibold uppercase tracking-wider mb-2", isEditing ? "text-slate-400" : "text-slate-500")}>Summary</div>
                  <div className="flex justify-between text-xs">
                    <span className={isEditing ? "text-slate-400" : "text-slate-500"}>LAO total</span>
                    <span className={cn("font-mono font-semibold", isEditing ? "text-orange-400" : "text-orange-600")}>{formatCurrency(math.laoTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={isEditing ? "text-slate-400" : "text-slate-500"}>Trey net</span>
                    <span className={cn("font-mono font-semibold", isEditing ? "text-indigo-400" : "text-indigo-600")}>{formatCurrency(math.treyNet)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={isEditing ? "text-slate-400" : "text-slate-500"}>Kirk net</span>
                    <span className={cn("font-mono font-semibold", isEditing ? "text-sky-400" : "text-sky-600")}>{formatCurrency(math.kirkNet)}</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

const NewTransactionModal = ({
  isOpen,
  onClose,
  onSave,
  contacts = [],
}: {
  isOpen: boolean,
  onClose: () => void,
  onSave: (t: Transaction) => void,
  contacts?: DerivedContact[],
}) => {
  const [formData, setFormData] = useState<Transaction>({
    id: '',
    dealName: '',
    stage: 'LOI',
    price: 0,
    grossCommissionPercent: 3.0,
    treyLaoPercent: 35,
    kirkLaoPercent: 30,
    treySplitPercent: 50,
    kirkSplitPercent: 50,
    earnestMoney: 0,
    psaDate: '',
    feasibilityDate: '',
    coeDate: '',
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
    buyer: { role: 'Buyer', name: '', entity: '' },
    seller: { role: 'Seller', name: '', entity: '' },
    otherParties: [],
    customDates: [],
    documents: [],
    apn: '',
    county: '',
    projectYear: new Date().getFullYear().toString()
  });

  const math = useCommissionMath(formData);

  // Autocomplete state
  const [buyerSuggestions, setBuyerSuggestions] = useState<DerivedContact[]>([]);
  const [sellerSuggestions, setSellerSuggestions] = useState<DerivedContact[]>([]);

  const getSuggestions = (value: string) =>
    value.trim().length < 1 ? [] :
    contacts.filter(c => c.name.toLowerCase().includes(value.toLowerCase())).slice(0, 5);

  const applyContact = (role: 'buyer' | 'seller', contact: DerivedContact) => {
    setFormData(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        name: contact.name,
        entity: contact.entity || prev[role].entity,
        email: contact.email || '',
        phone: contact.phone || '',
      }
    }));
    if (role === 'buyer') setBuyerSuggestions([]);
    else setSellerSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTransaction = {
      ...formData,
      id: Math.random().toString(36).substr(2, 9),
      notesLog: formData.notes ? [{
        id: Math.random().toString(36).substr(2, 9),
        content: formData.notes,
        date: new Date().toISOString()
      }] : []
    };
    onSave(newTransaction);
    onClose();
  };

  const handleInputChange = (field: keyof Transaction, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // Auto-balance splits
      if (field === 'treySplitPercent') {
        newData.kirkSplitPercent = Number((100 - Number(value)).toFixed(2));
      } else if (field === 'kirkSplitPercent') {
        newData.treySplitPercent = Number((100 - Number(value)).toFixed(2));
      }
      return newData;
    });
  };

  const handlePartyChange = (role: 'buyer' | 'seller', field: keyof Party, value: string) => {
    setFormData(prev => ({
      ...prev,
      [role]: { ...prev[role], [field]: value }
    }));
  };

  const addOtherParty = () => {
    setFormData(prev => ({
      ...prev,
      otherParties: [...prev.otherParties, { role: '', name: '', entity: '', email: '', phone: '' }]
    }));
  };

  const updateOtherParty = (index: number, field: keyof Party, value: string) => {
    setFormData(prev => ({
      ...prev,
      otherParties: prev.otherParties.map((p, i) => i === index ? { ...p, [field]: value } : p)
    }));
  };

  const removeOtherParty = (index: number) => {
    setFormData(prev => ({
      ...prev,
      otherParties: prev.otherParties.filter((_, i) => i !== index)
    }));
  };

  const addCustomDate = () => {
    setFormData(prev => ({
      ...prev,
      customDates: [...prev.customDates, { id: Math.random().toString(36).substr(2, 9), label: '', date: '', completed: false }]
    }));
  };

  const updateCustomDate = (id: string, field: keyof CustomDate, value: any) => {
    setFormData(prev => ({
      ...prev,
      customDates: prev.customDates.map(d => d.id === id ? { ...d, [field]: value } : d)
    }));
  };

  const removeCustomDate = (id: string) => {
    setFormData(prev => ({
      ...prev,
      customDates: prev.customDates.filter(d => d.id !== id)
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className="bg-white w-full max-h-screen overflow-hidden flex flex-col sm:rounded-xl sm:shadow-2xl sm:max-w-6xl sm:max-h-[90vh] sm:m-4"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 shrink-0">
          <h2 className="text-xl font-bold text-slate-900">Add New Transaction</h2>
          <div className="flex items-center gap-2">
             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Form Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-6 border-r border-slate-100">
             <form id="new-deal-form" onSubmit={handleSubmit} className="space-y-8">
                {/* Section: Deal Basics */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Deal Basics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Deal Name</label>
                      <input 
                        required
                        type="text" 
                        value={formData.dealName} 
                        onChange={e => handleInputChange('dealName', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g. City/Gordon"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Stage</label>
                      <select 
                        value={formData.stage} 
                        onChange={e => handleInputChange('stage', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="LOI">LOI</option>
                        <option value="Contract">Contract</option>
                        <option value="Escrow">Escrow</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={e => handleInputChange('price', Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Origination Year</label>
                      <input
                        type="number"
                        value={formData.projectYear || new Date().getFullYear()}
                        onChange={e => handleInputChange('projectYear', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        min="2000"
                        max="2100"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Property Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Property Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                      <input 
                        type="text" 
                        value={formData.address} 
                        onChange={e => handleInputChange('address', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">APN / Parcel ID</label>
                      <input 
                        type="text" 
                        value={formData.apn || ''} 
                        onChange={e => handleInputChange('apn', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">County</label>
                      <input 
                        type="text" 
                        value={formData.county || ''} 
                        onChange={e => handleInputChange('county', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Acreage</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={formData.acreage} 
                        onChange={e => handleInputChange('acreage', Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Zoning</label>
                      <input 
                        type="text" 
                        value={formData.zoning} 
                        onChange={e => handleInputChange('zoning', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Parties */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Parties</h3>

                  {/* Helper to render a party input row */}
                  {(['buyer', 'seller', 'third-party'] as const).map(side => {
                    const isBuyer = side === 'buyer';
                    const isSeller = side === 'seller';
                    const isThird = side === 'third-party';
                    const extras = formData.otherParties.filter(p => p.side === side);
                    const primaryParty = isThird ? null : formData[side as 'buyer' | 'seller'];
                    const allInGroup = isThird ? extras : [primaryParty!, ...extras];
                    const label = isBuyer ? 'Buyers' : isSeller ? 'Sellers' : 'Third Parties';
                    const addLabel = isBuyer ? '+ Co-Buyer' : isSeller ? '+ Co-Seller' : '+ Add Third Party';
                    const headerColor = isBuyer ? 'text-indigo-600' : isSeller ? 'text-emerald-600' : 'text-slate-500';
                    const suggestions = isBuyer ? buyerSuggestions : isSeller ? sellerSuggestions : [];
                    const setSuggestions = isBuyer ? setBuyerSuggestions : isSeller ? setSellerSuggestions : (_: DerivedContact[]) => {};

                    const addToGroup = () => {
                      const newP = mkParty('', side);
                      setFormData(prev => ({ ...prev, otherParties: [...prev.otherParties, newP] }));
                    };
                    const updateInGroup = (idx: number, field: keyof Party, value: string) => {
                      if (!isThird && idx === 0) {
                        handlePartyChange(side as 'buyer' | 'seller', field, value);
                      } else {
                        const realIdx = isThird ? idx : idx - 1;
                        const arr = [...extras];
                        arr[realIdx] = { ...arr[realIdx], [field]: value };
                        setFormData(prev => ({
                          ...prev,
                          otherParties: prev.otherParties.map(p =>
                            arr.find(a => a.id === p.id) ? arr.find(a => a.id === p.id)! : p
                          ),
                        }));
                      }
                    };
                    const removeFromGroup = (idx: number) => {
                      if (!isThird && idx === 0) return;
                      const realIdx = isThird ? idx : idx - 1;
                      const target = extras[realIdx];
                      if (!target) return;
                      setFormData(prev => ({
                        ...prev,
                        otherParties: prev.otherParties.filter(p => p.id !== target.id),
                      }));
                    };

                    return (
                      <div key={side} className="rounded-lg border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                          <h4 className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", headerColor)}>
                            <Users className="w-3.5 h-3.5" /> {label}
                          </h4>
                          <button type="button" onClick={addToGroup} className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
                            <Plus className="w-3 h-3" /> {addLabel}
                          </button>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {allInGroup.map((party, idx) => {
                            const isPrimary = !isThird && idx === 0;
                            const nameVal = party?.name || '';
                            return (
                              <div key={party?.id || idx} className="p-3 flex gap-2 items-start animate-in fade-in">
                                <div className="flex-1 space-y-2">
                                  {isThird && (
                                    <input
                                      type="text"
                                      value={party?.role || ''}
                                      onChange={e => updateInGroup(idx, 'role', e.target.value)}
                                      placeholder="Label (e.g. Escrow Agent)"
                                      className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                                    />
                                  )}
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={nameVal}
                                      onChange={e => {
                                        updateInGroup(idx, 'name', e.target.value);
                                        if (isPrimary) setSuggestions(getSuggestions(e.target.value));
                                      }}
                                      onBlur={() => isPrimary && setTimeout(() => setSuggestions([]), 150)}
                                      placeholder="Name"
                                      autoComplete="off"
                                      className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                                    />
                                    {isPrimary && suggestions.length > 0 && (
                                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                                        {suggestions.map(c => (
                                          <button
                                            key={c.id}
                                            type="button"
                                            onMouseDown={() => applyContact(side as 'buyer' | 'seller', c)}
                                            className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center gap-2"
                                          >
                                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0", isBuyer ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700")}>
                                              {c.name[0]}
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-xs font-medium text-slate-900 truncate">{c.name}</p>
                                              {c.entity && <p className="text-xs text-slate-400 truncate">{c.entity}</p>}
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <input type="text" value={party?.entity || ''} onChange={e => updateInGroup(idx, 'entity', e.target.value)} placeholder="Entity" className="p-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400" />
                                    <input type="email" value={party?.email || ''} onChange={e => updateInGroup(idx, 'email', e.target.value)} placeholder="Email" className="p-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400" />
                                    <input type="text" value={party?.phone || ''} onChange={e => updateInGroup(idx, 'phone', e.target.value)} placeholder="Phone" className="p-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400" />
                                  </div>
                                </div>
                                {!isPrimary && (
                                  <button type="button" onClick={() => removeFromGroup(idx)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1">
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          {allInGroup.length === 0 && (
                            <p className="px-4 py-3 text-xs text-slate-400 italic">None added.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Section: Critical Dates */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Timeline & Dates</h3>
                    <button type="button" onClick={addCustomDate} className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Custom Date
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">PSA Date</label>
                      <input 
                        type="date" 
                        value={formData.psaDate} 
                        onChange={e => handleInputChange('psaDate', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Feasibility Date</label>
                      <input 
                        type="date" 
                        value={formData.feasibilityDate} 
                        onChange={e => handleInputChange('feasibilityDate', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">COE Date</label>
                      <input 
                        type="date" 
                        value={formData.coeDate} 
                        onChange={e => handleInputChange('coeDate', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {formData.customDates.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {formData.customDates.map((date, index) => (
                        <div key={date.id} className="flex gap-2 items-center animate-in fade-in slide-in-from-top-1">
                          <input 
                            type="text" 
                            value={date.label}
                            onChange={e => updateCustomDate(date.id, 'label', e.target.value)}
                            placeholder="Event Name (e.g. Inspection)"
                            className="flex-1 p-2 border border-slate-300 rounded-lg text-sm"
                          />
                          <input 
                            type="date" 
                            value={date.date}
                            onChange={e => updateCustomDate(date.id, 'date', e.target.value)}
                            className="w-40 p-2 border border-slate-300 rounded-lg text-sm"
                          />
                          <button type="button" onClick={() => removeCustomDate(date.id)} className="p-2 text-slate-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section: Notes */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Notes</h3>
                  <textarea 
                    value={formData.notes} 
                    onChange={e => handleInputChange('notes', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-24"
                    placeholder="Internal notes, status updates, etc."
                  />
                </div>
             </form>
          </div>

          {/* Math Sidebar */}
          <div className="w-full lg:w-80 bg-slate-50 p-6 overflow-y-auto border-l border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Live Financials</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Gross Comm %</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={formData.grossCommissionPercent} 
                  onChange={e => handleInputChange('grossCommissionPercent', Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Trey LAO %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.treyLaoPercent}
                    onChange={e => handleInputChange('treyLaoPercent', Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Kirk LAO %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.kirkLaoPercent}
                    onChange={e => handleInputChange('kirkLaoPercent', Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="h-px bg-slate-200 my-4"></div>

              {/* Split slider — Trey drives, Kirk auto-adjusts */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Trey / Kirk Split</span>
                  <span className="text-slate-500">{formData.treySplitPercent}% / {formData.kirkSplitPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.treySplitPercent}
                  onChange={e => handleInputChange('treySplitPercent', Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 mb-1"
                />
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex mt-1">
                  <div className="bg-indigo-500 h-full transition-all" style={{ width: `${formData.treySplitPercent}%` }} />
                  <div className="bg-sky-400 h-full transition-all" style={{ width: `${formData.kirkSplitPercent}%` }} />
                </div>
              </div>

              <div className="h-px bg-slate-200 my-4"></div>

              {/* Per-agent summary */}
              <div className="space-y-3">
                <div className="bg-indigo-50 rounded-lg p-3 space-y-1.5">
                  <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Trey</div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Gross split</span>
                    <span className="font-mono text-slate-700">{formatCurrency(math.treyGrossCut)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">LAO ({formData.treyLaoPercent}%)</span>
                    <span className="font-mono text-red-500">-{formatCurrency(math.laoFromTrey)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-indigo-200 pt-1">
                    <span className="text-xs text-indigo-700">Net to Trey</span>
                    <span className="font-mono text-sm text-indigo-600">{formatCurrency(math.treyNet)}</span>
                  </div>
                </div>
                <div className="bg-sky-50 rounded-lg p-3 space-y-1.5">
                  <div className="text-xs font-semibold text-sky-600 uppercase tracking-wider">Kirk</div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Gross split</span>
                    <span className="font-mono text-slate-700">{formatCurrency(math.kirkGrossCut)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">LAO ({formData.kirkLaoPercent}%)</span>
                    <span className="font-mono text-red-500">-{formatCurrency(math.laoFromKirk)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-sky-200 pt-1">
                    <span className="text-xs text-sky-700">Net to Kirk</span>
                    <span className="font-mono text-sm text-sky-600">{formatCurrency(math.kirkNet)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-slate-500">LAO total</span>
                  <span className="font-mono font-semibold text-orange-600">{formatCurrency(math.laoTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white z-10">
            <button type="button" onClick={onClose} className="px-4 py-2 min-h-[44px] text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">Cancel</button>
            <button type="submit" form="new-deal-form" className="px-4 py-2 min-h-[44px] bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm transition-colors">Create Deal</button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- Email Inbox View ---

// Sanitize HTML for safe inline display (strips script/style/iframe tags)
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatEmailDate(iso: string): string {
  try {
    const d = parseISO(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return format(d, 'h:mm a');
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return format(d, 'EEEE');
    return format(d, 'MMM d');
  } catch { return ''; }
}

// Assignment Modal
const AssignEmailModal = ({
  email,
  transactions,
  leads,
  onAssign,
  onClose,
  darkMode,
}: {
  email: InboxItem;
  transactions: Transaction[];
  leads: Lead[];
  onAssign: (target: { type: 'transaction' | 'lead'; id: string; name: string }) => void;
  onClose: () => void;
  darkMode?: boolean;
}) => {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'transaction' | 'lead'>('transaction');

  const filteredTx = useMemo(() => {
    const q = search.toLowerCase();
    return transactions
      .filter(t => !t.isDeleted && (t.dealName.toLowerCase().includes(q) || t.address?.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [transactions, search]);

  const filteredLeads = useMemo(() => {
    const q = search.toLowerCase();
    return leads
      .filter(l => !l.isDeleted && (l.projectName.toLowerCase().includes(q) || l.contactName?.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [leads, search]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        variants={backdropVariants} initial="hidden" animate="visible" exit="exit"
        onClick={onClose}
      >
        <motion.div
          className={cn("w-full max-w-md rounded-xl shadow-2xl overflow-hidden", darkMode ? "bg-slate-800" : "bg-white")}
          variants={modalVariants} initial="hidden" animate="visible" exit="exit"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={cn("p-5 border-b flex items-start justify-between gap-3", darkMode ? "border-slate-700" : "border-slate-200")}>
            <div className="min-w-0">
              <h3 className={cn("font-bold text-base", darkMode ? "text-white" : "text-slate-900")}>Assign to Deal or Lead</h3>
              <p className={cn("text-xs mt-0.5 truncate", darkMode ? "text-slate-400" : "text-slate-500")}>"{email.subject}"</p>
            </div>
            <button onClick={onClose} className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Type tabs */}
          <div className={cn("flex border-b", darkMode ? "border-slate-700" : "border-slate-200")}>
            {(['transaction', 'lead'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-2.5 text-sm font-medium transition-colors",
                  tab === t
                    ? "border-b-2 border-indigo-500 text-indigo-600"
                    : darkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t === 'transaction' ? 'Transaction' : 'Lead'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder={tab === 'transaction' ? "Search deals…" : "Search leads…"}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={cn(
                  "w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500",
                  darkMode ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "border-slate-200 bg-white text-slate-900"
                )}
              />
            </div>
          </div>

          {/* Results list */}
          <div className="max-h-64 overflow-y-auto px-3 pb-3 space-y-1">
            {tab === 'transaction' ? (
              filteredTx.length === 0
                ? <p className="text-center text-sm text-slate-400 py-6">No matching transactions</p>
                : filteredTx.map(tx => (
                  <button
                    key={tx.id}
                    onClick={() => { onAssign({ type: 'transaction', id: tx.id, name: tx.dealName }); onClose(); }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between gap-2",
                      darkMode ? "hover:bg-slate-700 text-slate-200" : "hover:bg-slate-50 text-slate-900"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{tx.dealName}</p>
                      <p className="text-xs text-slate-500 truncate">{tx.address || tx.stage}</p>
                    </div>
                    <StatusBadge stage={tx.stage} />
                  </button>
                ))
            ) : (
              filteredLeads.length === 0
                ? <p className="text-center text-sm text-slate-400 py-6">No matching leads</p>
                : filteredLeads.map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => { onAssign({ type: 'lead', id: lead.id, name: lead.projectName }); onClose(); }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg transition-colors",
                      darkMode ? "hover:bg-slate-700 text-slate-200" : "hover:bg-slate-50 text-slate-900"
                    )}
                  >
                    <p className="font-medium text-sm truncate">{lead.projectName}</p>
                    <p className="text-xs text-slate-500 truncate">{lead.contactName} · {lead.type}</p>
                  </button>
                ))
            )}
          </div>

          <div className={cn("p-3 border-t text-xs text-center", darkMode ? "border-slate-700 text-slate-500" : "border-slate-100 text-slate-400")}>
            Assigning will add this email to the deal's Documents tab
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const InboxView = ({
  items,
  transactions,
  leads,
  onMarkRead,
  onDelete,
  onAssign,
  onSelectDeal,
  onSelectLead,
  darkMode,
}: {
  items: InboxItem[];
  transactions: Transaction[];
  leads: Lead[];
  onMarkRead: (id: string, isRead: boolean) => void;
  onDelete: (id: string) => void;
  onAssign: (emailId: string, target: { type: 'transaction' | 'lead'; id: string; name: string }) => void;
  onSelectDeal?: (id: string) => void;
  onSelectLead?: (id: string) => void;
  darkMode?: boolean;
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'assigned'>('all');
  const [search, setSearch] = useState('');
  const [assignTarget, setAssignTarget] = useState<InboxItem | null>(null);

  const filtered = useMemo(() => {
    let list = items.filter(i => !i.isDeleted);
    if (filter === 'unread') list = list.filter(i => !i.isRead);
    if (filter === 'assigned') list = list.filter(i => !!i.assignedTo);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.subject.toLowerCase().includes(q) ||
        i.fromName.toLowerCase().includes(q) ||
        i.from.toLowerCase().includes(q) ||
        i.bodyText.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filter, search]);

  const selected = items.find(i => i.id === selectedId) ?? null;

  // Mark as read when opened
  useEffect(() => {
    if (selected && !selected.isRead) onMarkRead(selected.id, true);
  }, [selected?.id]);

  const unreadCount = items.filter(i => !i.isRead && !i.isDeleted).length;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={cn("text-xl sm:text-2xl font-bold flex items-center gap-2", darkMode ? "text-white" : "text-slate-900")}>
            <Inbox className="w-6 h-6 text-indigo-500" /> Email Inbox
            {unreadCount > 0 && (
              <span className="text-sm font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </h1>
          <p className={cn("text-sm mt-0.5", darkMode ? "text-slate-400" : "text-slate-500")}>
            Emails forwarded to your dedicated pipeline address
          </p>
        </div>
        {/* Email Dashboard button */}
        <a
          href="mailto:pleasetakenoteofthis@gmail.com"
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm whitespace-nowrap self-start sm:self-auto",
            darkMode
              ? "bg-indigo-600 hover:bg-indigo-500 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          )}
        >
          <Mail className="w-4 h-4" />
          Email Dashboard
        </a>
      </div>

      {/* Main two-pane card */}
      <div className={cn(
        "rounded-xl border shadow-sm overflow-hidden flex",
        "min-h-[600px]",
        darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
      )}>

        {/* LEFT — list pane */}
        <div className={cn(
          "flex flex-col shrink-0 border-r",
          selected ? "hidden lg:flex lg:w-80 xl:w-96" : "flex w-full",
          darkMode ? "border-slate-700" : "border-slate-200"
        )}>
          {/* Toolbar */}
          <div className={cn("p-3 sm:p-3 border-b space-y-2.5", darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50")}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search inbox…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={cn(
                  "w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500",
                  darkMode ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-200"
                )}
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'unread', 'assigned'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors",
                    filter === f
                      ? "bg-indigo-600 text-white"
                      : darkMode ? "text-slate-400 hover:bg-slate-700" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <MailOpen className="w-10 h-10 text-slate-300 mb-3" />
                <p className={cn("font-medium text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>
                  {filter !== 'all' ? `No ${filter} emails` : search ? 'No results' : 'No emails yet'}
                </p>
                {filter === 'all' && !search && (
                  <p className="text-xs text-slate-400 mt-1">
                    Forward emails to your pipeline address to see them here
                  </p>
                )}
              </div>
            )}
            <motion.div variants={listContainerVariants} initial="hidden" animate="visible">
              {filtered.map(item => (
                <motion.button
                  key={item.id}
                  variants={listItemVariants}
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "w-full text-left px-4 py-4 transition-colors group relative",
                    selectedId === item.id
                      ? darkMode ? "bg-indigo-900/40" : "bg-indigo-50"
                      : darkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-50",
                    !item.isRead && (darkMode ? "border-l-2 border-indigo-400" : "border-l-2 border-indigo-500")
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                      style={{ backgroundColor: item.avatarColor || '#6366f1' }}
                    >
                      {getInitials(item.fromName || item.from)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={cn(
                          "text-xs truncate",
                          !item.isRead ? (darkMode ? "font-bold text-white" : "font-bold text-slate-900") : (darkMode ? "text-slate-300" : "text-slate-700")
                        )}>
                          {item.fromName || item.from}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">{formatEmailDate(item.receivedAt)}</span>
                      </div>
                      <p className={cn(
                        "text-xs truncate mb-0.5",
                        !item.isRead ? (darkMode ? "font-semibold text-slate-200" : "font-semibold text-slate-800") : (darkMode ? "text-slate-400" : "text-slate-600")
                      )}>
                        {item.subject}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate leading-tight">
                        {item.bodyText.slice(0, 80).replace(/\n/g, ' ')}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {item.attachments?.length > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                            <Paperclip className="w-2.5 h-2.5" />{item.attachments.length}
                          </span>
                        )}
                        {item.assignedTo && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-medium max-w-[120px] truncate">
                            <MailCheck className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{item.assignedTo.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </div>
        </div>

        {/* RIGHT — detail pane */}
        {selected ? (
          <div className={cn("flex-1 flex flex-col min-w-0", darkMode ? "bg-slate-800" : "bg-white")}>
            {/* Detail header */}
            <div className={cn(
              "p-4 sm:p-5 border-b shrink-0",
              darkMode ? "border-slate-700" : "border-slate-200"
            )}>
              {/* Back button (mobile/tablet) */}
              <button
                onClick={() => setSelectedId(null)}
                className="lg:hidden flex items-center gap-1.5 text-xs text-indigo-600 font-medium mb-3 hover:text-indigo-700"
              >
                <ChevronLeft className="w-4 h-4" /> Back to inbox
              </button>

              {/* Subject line — full width */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className={cn("text-base sm:text-lg font-bold leading-snug", darkMode ? "text-white" : "text-slate-900")}>
                  {selected.subject}
                </h2>
                {/* Desktop-only action buttons (inline with subject) */}
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onMarkRead(selected.id, !selected.isRead)}
                    title={selected.isRead ? 'Mark unread' : 'Mark read'}
                    className={cn(
                      "p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center",
                      darkMode ? "text-slate-400 hover:bg-slate-700 hover:text-slate-200" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    )}
                  >
                    {selected.isRead ? <MailOpen className="w-4 h-4" /> : <MailCheck className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setAssignTarget(selected)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px]",
                      selected.assignedTo
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    )}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    {selected.assignedTo ? 'Reassign' : 'Assign'}
                  </button>
                  <button
                    onClick={() => { haptic([40, 20, 60]); onDelete(selected.id); setSelectedId(null); }}
                    title="Delete"
                    className={cn(
                      "p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center",
                      darkMode ? "text-slate-400 hover:bg-red-900/30 hover:text-red-400" : "text-slate-400 hover:bg-red-50 hover:text-red-600"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sender info */}
              <div className="flex items-center gap-2 flex-wrap">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                  style={{ backgroundColor: selected.avatarColor || '#6366f1' }}
                >
                  {getInitials(selected.fromName || selected.from)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className={cn("text-sm font-semibold leading-tight", darkMode ? "text-slate-200" : "text-slate-800")}>
                      {selected.fromName || selected.from}
                    </span>
                    <span className={cn("text-xs truncate max-w-[200px]", darkMode ? "text-slate-400" : "text-slate-500")}>
                      &lt;{selected.from}&gt;
                    </span>
                  </div>
                  <span className={cn("text-xs", darkMode ? "text-slate-500" : "text-slate-400")}>
                    {format(parseISO(selected.receivedAt), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </div>

              {/* Assigned-to badge — clickable, navigates to the linked record */}
              {selected.assignedTo && (
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span className={cn("text-xs shrink-0", darkMode ? "text-slate-400" : "text-slate-500")}>Assigned to:</span>
                  <button
                    onClick={() => {
                      if (selected.assignedTo!.type === 'transaction' && onSelectDeal) {
                        onSelectDeal(selected.assignedTo!.id);
                      } else if (selected.assignedTo!.type === 'lead' && onSelectLead) {
                        onSelectLead(selected.assignedTo!.id);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full hover:bg-emerald-200 hover:text-emerald-800 transition-colors cursor-pointer group"
                    title={`Open ${selected.assignedTo.type}: ${selected.assignedTo.name}`}
                  >
                    <MailCheck className="w-3 h-3" />
                    <span className="group-hover:underline underline-offset-2">{selected.assignedTo.name}</span>
                    <span className="text-emerald-500">({selected.assignedTo.type})</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                  </button>
                </div>
              )}

              {/* Mobile-only action toolbar — sits below sender info, clearly separated */}
              <div className={cn(
                "flex sm:hidden items-center gap-2 mt-4 pt-3 border-t",
                darkMode ? "border-slate-700" : "border-slate-100"
              )}>
                <button
                  onClick={() => setAssignTarget(selected)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                    selected.assignedTo
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-indigo-600 text-white"
                  )}
                >
                  <Tag className="w-3.5 h-3.5" />
                  {selected.assignedTo ? 'Reassign' : 'Assign to Deal'}
                </button>
                <button
                  onClick={() => onMarkRead(selected.id, !selected.isRead)}
                  title={selected.isRead ? 'Mark unread' : 'Mark read'}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors",
                    darkMode
                      ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {selected.isRead ? <MailOpen className="w-4 h-4" /> : <MailCheck className="w-4 h-4" />}
                  <span>{selected.isRead ? 'Unread' : 'Read'}</span>
                </button>
                <button
                  onClick={() => { haptic([40, 20, 60]); onDelete(selected.id); setSelectedId(null); }}
                  className={cn(
                    "flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors",
                    darkMode
                      ? "border-slate-600 text-red-400 hover:bg-red-900/30"
                      : "border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200"
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Attachments bar (if any) */}
            {selected.attachments?.length > 0 && (
              <div className={cn("px-5 py-3 border-b flex items-center gap-2 flex-wrap", darkMode ? "border-slate-700 bg-slate-900/30" : "border-slate-100 bg-slate-50")}>
                <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className={cn("text-xs font-medium mr-1", darkMode ? "text-slate-400" : "text-slate-500")}>
                  {selected.attachments.length} attachment{selected.attachments.length !== 1 ? 's' : ''}
                </span>
                {selected.attachments.map(att => (
                  <a
                    key={att.id}
                    href={`data:${att.contentType};base64,${att.data}`}
                    download={att.filename}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
                      darkMode ? "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <File className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span className="max-w-[120px] truncate">{att.filename}</span>
                    <span className="text-slate-400">({(att.size / 1024).toFixed(0)}KB)</span>
                    <Download className="w-3 h-3 text-slate-400 shrink-0" />
                  </a>
                ))}
              </div>
            )}

            {/* Email body — always formatted (HTML if available, plain text fallback) */}
            <div className="flex-1 overflow-y-auto p-5">
              {selected.bodyHtml ? (
                <div
                  className={cn(
                    "prose prose-sm max-w-none text-sm",
                    darkMode ? "prose-invert text-slate-300" : "text-slate-700"
                  )}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(selected.bodyHtml) }}
                />
              ) : (
                <pre className={cn(
                  "whitespace-pre-wrap font-sans text-sm leading-relaxed",
                  darkMode ? "text-slate-300" : "text-slate-700"
                )}>
                  {selected.bodyText || '(No text body)'}
                </pre>
              )}
            </div>
          </div>
        ) : (
          /* Empty state when nothing selected (desktop) */
          <div className="hidden lg:flex flex-1 items-center justify-center flex-col gap-3">
            <MailOpen className="w-12 h-12 text-slate-200" />
            <p className="text-slate-400 font-medium text-sm">Select an email to read</p>
          </div>
        )}
      </div>

      {/* Assignment modal */}
      {assignTarget && (
        <AssignEmailModal
          email={assignTarget}
          transactions={transactions}
          leads={leads}
          onAssign={(target) => {
            onAssign(assignTarget.id, target);
            setAssignTarget(null);
          }}
          onClose={() => setAssignTarget(null)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

// --- Recently Deleted View ---

const RecentlyDeletedView = ({
  transactions,
  leads,
  onRestore,
  onPermanentDelete,
  onRestoreLead,
  onPermanentDeleteLead,
}: {
  transactions: Transaction[],
  leads: Lead[],
  onRestore: (id: string) => void,
  onPermanentDelete: (id: string) => void,
  onRestoreLead: (id: string) => void,
  onPermanentDeleteLead: (id: string) => void,
}) => {
  const [tab, setTab] = useState<'transactions' | 'leads'>('transactions');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const currentItems = tab === 'transactions' ? transactions : leads;
  const allIds = currentItems.map(i => i.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    if (!confirm(`Permanently delete ${count} item${count !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    selectedIds.forEach(id => {
      if (tab === 'transactions') onPermanentDelete(id);
      else onPermanentDeleteLead(id);
    });
    setSelectedIds(new Set());
  };

  // Reset selection when switching tabs
  const handleTabChange = (newTab: 'transactions' | 'leads') => {
    setTab(newTab);
    setSelectedIds(new Set());
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-slate-500" />
          Recently Deleted
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {someSelected && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1.5 border border-red-200"
            >
              <Trash2 className="w-3 h-3" />
              Delete {selectedIds.size} Forever
            </button>
          )}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button onClick={() => handleTabChange('transactions')} className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors", tab === 'transactions' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              Transactions {transactions.length > 0 && <span className="ml-1 bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{transactions.length}</span>}
            </button>
            <button onClick={() => handleTabChange('leads')} className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors", tab === 'leads' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              Leads {leads.length > 0 && <span className="ml-1 bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{leads.length}</span>}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  disabled={currentItems.length === 0}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3">{tab === 'transactions' ? 'Deal Name' : 'Project Name'}</th>
              <th className="px-4 py-3">Deleted At</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tab === 'transactions' ? (
              transactions.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No recently deleted transactions.</td></tr>
              ) : transactions.map(deal => (
                <tr key={deal.id} className={cn("hover:bg-slate-50 transition-colors", selectedIds.has(deal.id) && "bg-red-50/50")}>
                  <td className="px-4 py-4">
                    <input type="checkbox" checked={selectedIds.has(deal.id)} onChange={() => toggleSelect(deal.id)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer" />
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-900">{deal.dealName}</td>
                  <td className="px-4 py-4 text-slate-500">{deal.deletedAt ? format(parseISO(deal.deletedAt), 'MMM d, yyyy h:mm a') : '-'}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onRestore(deal.id)} className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" /> Restore
                      </button>
                      <button onClick={() => { if (confirm('Permanently delete this transaction? This cannot be undone.')) onPermanentDelete(deal.id); }} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                        Delete Forever
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              leads.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No recently deleted leads.</td></tr>
              ) : leads.map(lead => (
                <tr key={lead.id} className={cn("hover:bg-slate-50 transition-colors", selectedIds.has(lead.id) && "bg-red-50/50")}>
                  <td className="px-4 py-4">
                    <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer" />
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-900">{lead.projectName}</td>
                  <td className="px-4 py-4 text-slate-500">{lead.deletedAt ? format(parseISO(lead.deletedAt), 'MMM d, yyyy h:mm a') : '-'}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onRestoreLead(lead.id)} className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" /> Restore
                      </button>
                      <button onClick={() => { if (confirm('Permanently delete this lead? This cannot be undone.')) onPermanentDeleteLead(lead.id); }} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                        Delete Forever
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Confirm Dialog Component ---

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel
}: {
  isOpen: boolean,
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel: () => void
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-600 mb-6">{message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 min-h-[44px] text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 min-h-[44px] bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 shadow-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ACTION_LABELS: Record<ActionType, string> = {
  transaction_update: 'Deal Updated',
  transaction_create: 'Deal Created',
  transaction_delete: 'Deal Deleted',
  transaction_restore: 'Deal Restored',
  lead_update: 'Lead Updated',
  lead_create: 'Lead Created',
  lead_delete: 'Lead Deleted',
  lead_restore: 'Lead Restored',
};

const ACTION_COLORS: Record<ActionType, string> = {
  transaction_update: 'bg-indigo-100 text-indigo-700',
  transaction_create: 'bg-emerald-100 text-emerald-700',
  transaction_delete: 'bg-red-100 text-red-700',
  transaction_restore: 'bg-amber-100 text-amber-700',
  lead_update: 'bg-purple-100 text-purple-700',
  lead_create: 'bg-teal-100 text-teal-700',
  lead_delete: 'bg-red-100 text-red-600',
  lead_restore: 'bg-amber-100 text-amber-600',
};

const ITEMS_PER_PAGE = 20;
const ACTION_RETENTION_DAYS = 10;

/**
 * Dynamically calculates how many table rows fit on screen without vertical
 * scrolling, so paginating never requires the user to scroll back to the top.
 *
 * @param mobileRowHeight   Approximate rendered height (px) of one row on mobile (<640px)
 * @param desktopRowHeight  Approximate rendered height (px) of one row on desktop
 * @param mobileOverhead    Total vertical space (px) consumed by headers, toolbars,
 *                          pagination, and nav on mobile
 * @param desktopOverhead   Same for desktop
 * @param min               Minimum rows to always show regardless of screen size
 */
function useRowsPerPage(
  mobileRowHeight: number,
  desktopRowHeight: number,
  mobileOverhead: number,
  desktopOverhead: number,
  min = 5
): number {
  const calc = () => {
    const isMobile = window.innerWidth < 640;
    const rh = isMobile ? mobileRowHeight : desktopRowHeight;
    const oh = isMobile ? mobileOverhead : desktopOverhead;
    return Math.max(min, Math.floor((window.innerHeight - oh) / rh));
  };
  const [rows, setRows] = useState<number>(calc);
  useEffect(() => {
    const handler = () => setRows(calc());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return rows;
}

const Pagination = ({
  page, totalPages, onPage
}: { page: number; totalPages: number; onPage: (p: number) => void }) => {
  if (totalPages <= 1) return null;
  const go = (p: number) => {
    onPage(p);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  };
  const pages: (number | '...')[] = [];
  if (totalPages <= 4) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
      <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => go(page - 1)} disabled={page === 1} className="p-1.5 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400 text-sm">…</span>
            : <button key={p} onClick={() => go(p as number)} className={cn("w-8 h-8 rounded text-sm font-medium transition-colors", page === p ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-200")}>{p}</button>
        )}
        <button onClick={() => go(page + 1)} disabled={page === totalPages} className="p-1.5 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const RecentActionsView = ({
  actions,
  onSelectDeal,
  onSelectLead,
  onUndo,
}: {
  actions: ActionLogEntry[];
  onSelectDeal: (id: string) => void;
  onSelectLead: (id: string) => void;
  onUndo: (entry: ActionLogEntry) => void;
}) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'transaction' | 'lead'>('all');

  const cutoff = new Date(Date.now() - ACTION_RETENTION_DAYS * 86400_000);

  const filtered = useMemo(() => {
    let list = actions.filter(a => new Date(a.timestamp) >= cutoff);
    if (typeFilter !== 'all') list = list.filter(a => a.entityType === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.entityName.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        ACTION_LABELS[a.type].toLowerCase().includes(q)
      );
    }
    return list; // already newest-first from how we prepend
  }, [actions, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  // Reset to page 1 when filter/search changes
  React.useEffect(() => { setPage(1); }, [search, typeFilter]);

  const canUndo = (a: ActionLogEntry) =>
    (a.type === 'transaction_update' || a.type === 'lead_update' ||
     a.type === 'transaction_delete' || a.type === 'lead_delete') &&
    !!a.previousState;

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Recent Actions</h1>
        <p className="text-slate-500">All changes from the last {ACTION_RETENTION_DAYS} days. You can review or undo updates and deletes.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search actions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {(['all', 'transaction', 'lead'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize", typeFilter === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {t === 'all' ? 'All' : t === 'transaction' ? 'Deals' : 'Leads'}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} action{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {pageItems.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">{filtered.length === 0 && actions.filter(a => new Date(a.timestamp) >= cutoff).length === 0 ? 'No actions yet.' : 'No actions match your filters.'}</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pageItems.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">
                      <div>{format(parseISO(entry.timestamp), 'MMM d, yyyy')}</div>
                      <div className="text-slate-400">{format(parseISO(entry.timestamp), 'h:mm a')}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap", ACTION_COLORS[entry.type])}>
                        {ACTION_LABELS[entry.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => entry.entityType === 'transaction' ? onSelectDeal(entry.entityId) : onSelectLead(entry.entityId)}
                        className="font-medium text-slate-900 hover:text-indigo-600 transition-colors text-left"
                      >
                        {entry.entityName}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs">
                      <p className="truncate">{entry.description}</p>
                      {entry.changedFields && entry.changedFields.length > 0 && (
                        <p className="text-slate-400 truncate">Fields: {entry.changedFields.join(', ')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => entry.entityType === 'transaction' ? onSelectDeal(entry.entityId) : onSelectLead(entry.entityId)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canUndo(entry) && (
                          <button
                            onClick={() => onUndo(entry)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Undo"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
};

const SettingsView = ({
  darkMode,
  onToggleDarkMode,
  preferences,
  onSavePreferences,
  onLogout,
  authEnabled,
}: {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  preferences: AppPreferences;
  onSavePreferences: (updates: Partial<AppPreferences>) => void;
  onLogout: () => void;
  authEnabled: boolean;
}) => {
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<AppPreferences>(preferences);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => { setForm(preferences); }, [preferences]);

  const handleSave = () => {
    onSavePreferences(form);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const initials = `${preferences.agent1Name.charAt(0)}${preferences.agent2Name.charAt(0)}`.toUpperCase();

  return (
  <div className="space-y-6 max-w-2xl">
    <div className="mb-8">
      <h1 className={cn("text-xl sm:text-2xl font-bold", darkMode ? "text-slate-100" : "text-slate-900")}>Settings</h1>
      <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>Configure your application preferences.</p>
    </div>

    {/* Appearance */}
    <div className={cn("rounded-xl border shadow-sm overflow-hidden", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
      <div className={cn("p-4 border-b flex items-center gap-2", darkMode ? "border-slate-700 bg-slate-700/50" : "border-slate-200 bg-slate-50")}>
        <Monitor className="w-4 h-4 text-slate-500" />
        <h2 className={cn("font-semibold", darkMode ? "text-slate-100" : "text-slate-800")}>Appearance</h2>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className={cn("font-medium", darkMode ? "text-slate-100" : "text-slate-900")}>Dark Mode</p>
            <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>Switch between light and dark theme</p>
          </div>
          <button
            onClick={onToggleDarkMode}
            className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2", darkMode ? "bg-indigo-600" : "bg-slate-200")}
            aria-label="Toggle dark mode"
          >
            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", darkMode ? "translate-x-6" : "translate-x-1")} />
          </button>
        </div>
      </div>
    </div>

    {/* Team Profile */}
    <div className={cn("rounded-xl border shadow-sm overflow-hidden", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
      <div className={cn("p-4 border-b flex items-center justify-between", darkMode ? "border-slate-700 bg-slate-700/50" : "border-slate-200 bg-slate-50")}>
        <div className="flex items-center gap-2">
          <UserCog className="w-4 h-4 text-slate-500" />
          <h2 className={cn("font-semibold", darkMode ? "text-slate-100" : "text-slate-800")}>Team Profile</h2>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
        {saved && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Saved</span>}
      </div>
      <div className="p-4 space-y-4">
        {!editing ? (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg shrink-0">
              {initials}
            </div>
            <div>
              <p className={cn("font-semibold", darkMode ? "text-slate-100" : "text-slate-900")}>{preferences.agent1Name} &amp; {preferences.agent2Name}</p>
              <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>{preferences.teamName}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className={cn("block text-xs font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-600")}>Team Name</label>
              <input value={form.teamName} onChange={e => setForm(f => ({...f, teamName: e.target.value}))} className={cn("w-full px-3 py-2 border rounded-lg text-sm", darkMode ? "bg-slate-700 border-slate-600 text-slate-100" : "border-slate-200")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={cn("block text-xs font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-600")}>Agent 1 Name</label>
                <input value={form.agent1Name} onChange={e => setForm(f => ({...f, agent1Name: e.target.value}))} className={cn("w-full px-3 py-2 border rounded-lg text-sm", darkMode ? "bg-slate-700 border-slate-600 text-slate-100" : "border-slate-200")} />
              </div>
              <div>
                <label className={cn("block text-xs font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-600")}>Agent 2 Name</label>
                <input value={form.agent2Name} onChange={e => setForm(f => ({...f, agent2Name: e.target.value}))} className={cn("w-full px-3 py-2 border rounded-lg text-sm", darkMode ? "bg-slate-700 border-slate-600 text-slate-100" : "border-slate-200")} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Commission Defaults */}
    <div className={cn("rounded-xl border shadow-sm overflow-hidden", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
      <div className={cn("p-4 border-b flex items-center justify-between", darkMode ? "border-slate-700 bg-slate-700/50" : "border-slate-200 bg-slate-50")}>
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-500" />
          <h2 className={cn("font-semibold", darkMode ? "text-slate-100" : "text-slate-800")}>Commission Defaults</h2>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>
      <div className="p-4">
        {!editing ? (
          <div className="divide-y divide-slate-100">
            {[
              ['Gross Commission %', `${preferences.defaultGrossCommissionPercent}%`],
              [`${preferences.agent1Name} LAO %`, `${preferences.defaultTreyLaoPercent}%`],
              [`${preferences.agent2Name} LAO %`, `${preferences.defaultKirkLaoPercent}%`],
              [`${preferences.agent1Name} Split`, `${preferences.defaultTreySplit}%`],
              [`${preferences.agent2Name} Split`, `${preferences.defaultKirkSplit}%`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-2.5">
                <span className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>{label}</span>
                <span className={cn("text-sm font-medium", darkMode ? "text-slate-100" : "text-slate-900")}>{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Gross Comm %', key: 'defaultGrossCommissionPercent' as const },
              { label: `${form.agent1Name} LAO %`, key: 'defaultTreyLaoPercent' as const },
              { label: `${form.agent2Name} LAO %`, key: 'defaultKirkLaoPercent' as const },
              { label: `${form.agent1Name} Split %`, key: 'defaultTreySplit' as const },
              { label: `${form.agent2Name} Split %`, key: 'defaultKirkSplit' as const },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className={cn("block text-xs font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-600")}>{label}</label>
                <input type="number" min={0} max={100} value={form[key]} onChange={e => setForm(f => ({...f, [key]: Number(e.target.value)}))} className={cn("w-full px-3 py-2 border rounded-lg text-sm", darkMode ? "bg-slate-700 border-slate-600 text-slate-100" : "border-slate-200")} />
              </div>
            ))}
          </div>
        )}
        {editing && (
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">Save Changes</button>
            <button onClick={() => { setEditing(false); setForm(preferences); }} className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Cancel</button>
          </div>
        )}
      </div>
    </div>

    {/* About */}
    <div className={cn("rounded-xl border shadow-sm overflow-hidden", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
      <div className={cn("p-4 border-b flex items-center gap-2", darkMode ? "border-slate-700 bg-slate-700/50" : "border-slate-200 bg-slate-50")}>
        <Info className="w-4 h-4 text-slate-500" />
        <h2 className={cn("font-semibold", darkMode ? "text-slate-100" : "text-slate-800")}>About</h2>
      </div>
      <div className={cn("divide-y", darkMode ? "divide-slate-700" : "divide-slate-100")}>
        {[
          ['Application', 'LAO Pipeline Pro'],
          ['Version', '2.0.0'],
          ['Built for', 'LAO Team'],
          ['Platform', 'Commercial Real Estate'],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between px-4 py-3">
            <span className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>{label}</span>
            <span className={cn("text-sm font-medium", darkMode ? "text-slate-100" : "text-slate-900")}>{value}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Sign Out */}
    {authEnabled && (
      <div className={cn("rounded-xl border shadow-sm overflow-hidden", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
        <div className="p-4">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    )}
  </div>
  );
};

// --- Toast Container ---

const ToastContainer = ({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) => (
  <div className="fixed bottom-20 md:bottom-6 right-4 z-[200] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
    <AnimatePresence>
      {toasts.map(t => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95, transition: { duration: 0.15 } }}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium',
            t.type === 'success' && 'bg-emerald-600 text-white',
            t.type === 'error' && 'bg-red-600 text-white',
            t.type === 'info' && 'bg-slate-800 text-white',
          )}
        >
          {t.type === 'success' && <CheckCheck className="w-4 h-4 shrink-0 mt-0.5" />}
          {t.type === 'error' && <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          {t.type === 'info' && <Info className="w-4 h-4 shrink-0 mt-0.5" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-70 hover:opacity-100 transition-opacity ml-1">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

// --- Reports View ---

const ReportsView = ({
  transactions,
  leads,
  contacts,
  preferences,
  darkMode,
}: {
  transactions: Transaction[];
  leads: Lead[];
  contacts: DerivedContact[];
  preferences: AppPreferences;
  darkMode?: boolean;
}) => {
  const agent1 = preferences.agent1Name || 'Trey';
  const agent2 = preferences.agent2Name || 'Kirk';
  const [periodFilter, setPeriodFilter] = useState<'all' | 'ytd' | '30d' | '90d'>('all');

  const today = useMemo(() => new Date(), []);

  const filteredTransactions = useMemo(() => {
    if (periodFilter === 'all') return transactions;
    const cutoff =
      periodFilter === 'ytd'
        ? new Date(today.getFullYear(), 0, 1)
        : periodFilter === '30d'
        ? subDays(today, 30)
        : subDays(today, 90);
    return transactions.filter(t => {
      const ref = t.coeDate ? parseISO(t.coeDate) : t.psaDate ? parseISO(t.psaDate) : null;
      return ref ? isAfter(ref, cutoff) : false;
    });
  }, [transactions, periodFilter, today]);

  // Commission by agent
  const commissionByAgent = useMemo(() => {
    let agent1Total = 0, agent2Total = 0;
    filteredTransactions.forEach(t => {
      const gross = t.price * (t.grossCommissionPercent / 100);
      const treyGross = gross * (t.treySplitPercent / 100);
      const kirkGross = gross * (t.kirkSplitPercent / 100);
      agent1Total += treyGross * (1 - (t.treyLaoPercent ?? 35) / 100);
      agent2Total += kirkGross * (1 - (t.kirkLaoPercent ?? 30) / 100);
    });
    return [
      { name: agent1, value: Math.round(agent1Total), color: '#10b981' },
      { name: agent2, value: Math.round(agent2Total), color: '#6366f1' },
    ];
  }, [filteredTransactions, agent1, agent2]);

  // Commission by stage
  const commissionByStage = useMemo(() => {
    const stages: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      const gross = t.price * (t.grossCommissionPercent / 100);
      stages[t.stage] = (stages[t.stage] || 0) + gross;
    });
    return Object.entries(stages).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [filteredTransactions]);

  // Commission by month (last 12 months)
  const commissionByMonth = useMemo(() => {
    const months: { month: string, [key: string]: number | string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const m = subMonths(today, i);
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      let a1 = 0, a2 = 0;
      transactions.filter(t => t.coeDate).forEach(t => {
        const coe = parseISO(t.coeDate);
        if (isWithinInterval(coe, { start: mStart, end: mEnd })) {
          const gross = t.price * (t.grossCommissionPercent / 100);
          const treyGross = gross * (t.treySplitPercent / 100);
          const kirkGross = gross * (t.kirkSplitPercent / 100);
          a1 += treyGross * (1 - (t.treyLaoPercent ?? 35) / 100);
          a2 += kirkGross * (1 - (t.kirkLaoPercent ?? 30) / 100);
        }
      });
      months.push({ month: format(m, 'MMM yy'), [agent1]: Math.round(a1), [agent2]: Math.round(a2) });
    }
    return months;
  }, [transactions, agent1, agent2, today]);

  // Pipeline value by stage
  const pipelineByStage = useMemo(() => {
    const stages: Record<string, number> = {};
    transactions.filter(t => t.stage !== 'Closed').forEach(t => {
      const gross = t.price * (t.grossCommissionPercent / 100);
      stages[t.stage] = (stages[t.stage] || 0) + gross;
    });
    return Object.entries(stages).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [transactions]);

  // Deal velocity: avg days per stage (based on closed deals, PSA → COE)
  const dealVelocity = useMemo(() => {
    const closed = transactions.filter(t => t.stage === 'Closed' && t.psaDate && t.coeDate);
    if (closed.length === 0) return null;
    const totalDays = closed.reduce((sum, t) => {
      const diff = Math.round((parseISO(t.coeDate).getTime() - parseISO(t.psaDate).getTime()) / 86400000);
      return sum + Math.max(0, diff);
    }, 0);
    return { avgDays: Math.round(totalDays / closed.length), count: closed.length };
  }, [transactions]);

  // Closed deal history
  const closedDeals = useMemo(() => {
    return transactions
      .filter(t => t.stage === 'Closed')
      .sort((a, b) => (b.coeDate || '').localeCompare(a.coeDate || ''))
      .slice(0, 10);
  }, [transactions]);

  // Lead funnel
  const leadFunnel = useMemo(() => {
    const active = leads.filter(l => !l.isDeleted);
    return [
      { name: 'Total Leads', count: active.length, color: '#94a3b8' },
      { name: 'Buyer Lead', count: active.filter(l => l.stage === 'Buyer Lead').length, color: '#3b82f6' },
      { name: 'Listing Lead', count: active.filter(l => l.stage === 'Listing Lead').length, color: '#f59e0b' },
      { name: 'Listing', count: active.filter(l => l.stage === 'Listing').length, color: '#8b5cf6' },
    ];
  }, [leads]);

  // KPI summary
  const kpis = useMemo(() => {
    const closed = transactions.filter(t => t.stage === 'Closed');
    const active = transactions.filter(t => t.stage !== 'Closed');
    const totalGross = closed.reduce((s, t) => s + t.price * (t.grossCommissionPercent / 100), 0);
    const totalNet1 = closed.reduce((s, t) => {
      const g = t.price * (t.grossCommissionPercent / 100);
      const treyGross = g * (t.treySplitPercent / 100);
      return s + treyGross * (1 - (t.treyLaoPercent ?? 35) / 100);
    }, 0);
    const totalNet2 = closed.reduce((s, t) => {
      const g = t.price * (t.grossCommissionPercent / 100);
      const kirkGross = g * (t.kirkSplitPercent / 100);
      return s + kirkGross * (1 - (t.kirkLaoPercent ?? 30) / 100);
    }, 0);
    const activeVal = active.reduce((s, t) => s + t.price * (t.grossCommissionPercent / 100), 0);
    return { totalGross, totalNet1, totalNet2, closedCount: closed.length, activeCount: active.length, activeVal };
  }, [transactions]);

  // CSV Export helpers
  const downloadCSV = (filename: string, rows: string[][]) => {
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportTransactionsCSV = () => {
    const headers = ['Deal Name', 'Stage', 'Price', 'Gross Commission %', `${agent1} LAO %`, `${agent2} LAO %`, `${agent1} Split %`, `${agent2} Split %`, 'Address', 'Acreage', 'Zoning', 'COE Date', 'PSA Date', 'Feasibility Date', 'County', 'APN'];
    const rows = [headers, ...transactions.map(t => [t.dealName, t.stage, t.price, t.grossCommissionPercent, t.treyLaoPercent, t.kirkLaoPercent, t.treySplitPercent, t.kirkSplitPercent, t.address, t.acreage, t.zoning, t.coeDate, t.psaDate, t.feasibilityDate, t.county || '', t.apn || ''])];
    downloadCSV('transactions.csv', rows.map(r => r.map(String)));
  };

  const exportLeadsCSV = () => {
    const headers = ['Project Name', 'Type', 'Contact Name', 'Details', 'Summary', 'Last Spoke Date'];
    const rows = [headers, ...leads.filter(l => !l.isDeleted).map(l => [l.projectName, l.stage, l.contactName, l.details, l.summary, l.lastSpokeDate])];
    downloadCSV('leads.csv', rows.map(r => r.map(String)));
  };

  const exportContactsCSV = () => {
    const headers = ['Name', 'Primary Role', 'Entity', 'Email', 'Phone', 'Sources'];
    const rows = [headers, ...contacts.map(c => [c.name, c.primaryRole, c.entity || '', c.email || '', c.phone || '', c.sources.map(s => s.label).join('; ')])];
    downloadCSV('contacts.csv', rows.map(r => r.map(String)));
  };

  const exportAllCSV = () => {
    const txHeaders = ['Type', 'Deal Name', 'Stage', 'Price', 'Gross Commission %', 'COE Date', 'Address'];
    const leadHeaders = ['Type', 'Project Name', 'Lead Type', 'Contact Name', 'Last Spoke Date', '', ''];
    const rows = [
      txHeaders,
      ...transactions.map(t => ['Transaction', t.dealName, t.stage, t.price, t.grossCommissionPercent, t.coeDate, t.address]),
      [''],
      leadHeaders,
      ...leads.filter(l => !l.isDeleted).map(l => ['Lead', l.projectName, l.stage, l.contactName, l.lastSpokeDate, '', '']),
    ];
    downloadCSV('lao-pipeline-all.csv', rows.map(r => r.map(String)));
  };

  const handlePrint = () => window.print();

  const STAGE_COLORS: Record<string, string> = { LOI: '#94a3b8', Contract: '#6366f1', Escrow: '#f59e0b', Closed: '#10b981', Option: '#f97316' };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Print styles injected inline */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #reports-print-area, #reports-print-area * { visibility: visible; }
          #reports-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div id="reports-print-area">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className={cn("text-2xl font-bold", darkMode ? "text-slate-100" : "text-slate-900")}>Reports</h1>
            <p className={cn("text-sm mt-0.5", darkMode ? "text-slate-400" : "text-slate-500")}>Pipeline analytics and commission summaries</p>
          </div>
          <div className="flex items-center gap-2 no-print">
            {/* Period filter */}
            <div className={cn("flex rounded-lg border text-xs font-semibold overflow-hidden", darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white")}>
              {(['all', 'ytd', '90d', '30d'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriodFilter(p)}
                  className={cn(
                    "px-3 py-2 transition-colors",
                    periodFilter === p
                      ? "bg-indigo-600 text-white"
                      : darkMode ? "text-slate-300 hover:bg-slate-700" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {p === 'all' ? 'All Time' : p === 'ytd' ? 'YTD' : p === '90d' ? '90 Days' : '30 Days'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Closed Deals', value: kpis.closedCount, format: 'count', color: 'text-slate-900' },
            { label: 'Total Gross Commission', value: kpis.totalGross, format: 'currency', color: 'text-emerald-600' },
            { label: `${agent1} Net Commission`, value: kpis.totalNet1, format: 'currency', color: 'text-indigo-600' },
            { label: `${agent2} Net Commission`, value: kpis.totalNet2, format: 'currency', color: 'text-purple-600' },
          ].map(card => (
            <div key={card.label} className={cn("rounded-2xl p-5 border shadow-sm", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
              <p className={cn("text-xs font-bold uppercase tracking-widest mb-1", darkMode ? "text-slate-400" : "text-slate-500")}>{card.label}</p>
              <p className={cn("text-2xl font-bold", card.color)}>
                {card.format === 'currency' ? formatCurrency(card.value as number) : card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Commission by agent (bar) */}
          <div className={cn("rounded-2xl border shadow-sm overflow-hidden", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
            <div className={cn("p-4 border-b", darkMode ? "border-slate-700 bg-slate-700/40" : "border-slate-200 bg-slate-50")}>
              <h2 className={cn("font-bold text-sm uppercase tracking-wider", darkMode ? "text-slate-200" : "text-slate-800")}>Commission by Agent</h2>
            </div>
            <div className="p-4" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commissionByAgent} margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#f1f5f9'} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                  <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                  <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="value" name="Net Commission" radius={[6, 6, 0, 0]}>
                    {commissionByAgent.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Commission by stage (pie) */}
          <div className={cn("rounded-2xl border shadow-sm overflow-hidden", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
            <div className={cn("p-4 border-b", darkMode ? "border-slate-700 bg-slate-700/40" : "border-slate-200 bg-slate-50")}>
              <h2 className={cn("font-bold text-sm uppercase tracking-wider", darkMode ? "text-slate-200" : "text-slate-800")}>Gross Commission by Stage</h2>
            </div>
            <div className="p-4" style={{ height: 240 }}>
              {commissionByStage.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">No data for period.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={commissionByStage} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: { name: string, percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {commissionByStage.map((entry, i) => <Cell key={i} fill={STAGE_COLORS[entry.name] || '#6366f1'} />)}
                    </Pie>
                    <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Commission by month chart */}
        <div className={cn("rounded-2xl border shadow-sm overflow-hidden", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
          <div className={cn("p-4 border-b", darkMode ? "border-slate-700 bg-slate-700/40" : "border-slate-200 bg-slate-50")}>
            <h2 className={cn("font-bold text-sm uppercase tracking-wider", darkMode ? "text-slate-200" : "text-slate-800")}>Agent Commission by Month (12 Months)</h2>
          </div>
          <div className="p-4" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commissionByMonth} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#f1f5f9'} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey={agent1} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey={agent2} fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline value + Lead funnel row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline value by stage */}
          <div className={cn("rounded-2xl border shadow-sm overflow-hidden", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
            <div className={cn("p-4 border-b", darkMode ? "border-slate-700 bg-slate-700/40" : "border-slate-200 bg-slate-50")}>
              <h2 className={cn("font-bold text-sm uppercase tracking-wider", darkMode ? "text-slate-200" : "text-slate-800")}>Active Pipeline Value by Stage</h2>
            </div>
            <div className="p-4" style={{ height: 220 }}>
              {pipelineByStage.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">No active deals.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineByStage} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#f1f5f9'} />
                    <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }} width={70} />
                    <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="value" name="Gross Commission" radius={[0, 6, 6, 0]}>
                      {pipelineByStage.map((entry, i) => <Cell key={i} fill={STAGE_COLORS[entry.name] || '#6366f1'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Lead conversion funnel */}
          <div className={cn("rounded-2xl border shadow-sm overflow-hidden", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
            <div className={cn("p-4 border-b", darkMode ? "border-slate-700 bg-slate-700/40" : "border-slate-200 bg-slate-50")}>
              <h2 className={cn("font-bold text-sm uppercase tracking-wider", darkMode ? "text-slate-200" : "text-slate-800")}>Lead Conversion Funnel</h2>
            </div>
            <div className="p-6 space-y-3">
              {leadFunnel.map((stage, i) => (
                <div key={stage.name}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={cn("text-xs font-semibold", darkMode ? "text-slate-300" : "text-slate-700")}>{stage.name}</span>
                    <span className={cn("text-xs font-bold", darkMode ? "text-slate-200" : "text-slate-900")}>{stage.count}</span>
                  </div>
                  <div className={cn("w-full rounded-full h-3 overflow-hidden", darkMode ? "bg-slate-700" : "bg-slate-100")}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: leadFunnel[0].count > 0 ? `${(stage.count / leadFunnel[0].count) * 100}%` : '0%',
                        background: stage.color,
                        opacity: 1 - i * 0.1
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Deal velocity + closed deal history */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deal velocity */}
          <div className={cn("rounded-2xl border shadow-sm p-6", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
            <h2 className={cn("font-bold text-sm uppercase tracking-wider mb-4", darkMode ? "text-slate-200" : "text-slate-800")}>Deal Velocity</h2>
            {dealVelocity ? (
              <div className="space-y-3">
                <div>
                  <p className={cn("text-4xl font-bold", darkMode ? "text-slate-100" : "text-slate-900")}>{dealVelocity.avgDays}</p>
                  <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>Avg. days from PSA to Close</p>
                </div>
                <p className={cn("text-xs", darkMode ? "text-slate-500" : "text-slate-400")}>Based on {dealVelocity.count} closed deal{dealVelocity.count !== 1 ? 's' : ''} with both PSA and COE dates.</p>
              </div>
            ) : (
              <p className={cn("text-sm italic", darkMode ? "text-slate-500" : "text-slate-400")}>No closed deals with PSA + COE dates to calculate velocity.</p>
            )}
          </div>

          {/* Closed deal history */}
          <div className={cn("rounded-2xl border shadow-sm overflow-hidden", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
            <div className={cn("p-4 border-b", darkMode ? "border-slate-700 bg-slate-700/40" : "border-slate-200 bg-slate-50")}>
              <h2 className={cn("font-bold text-sm uppercase tracking-wider", darkMode ? "text-slate-200" : "text-slate-800")}>Closed Deal History (Recent 10)</h2>
            </div>
            <div className="overflow-x-auto">
              {closedDeals.length === 0 ? (
                <p className={cn("p-4 text-sm italic", darkMode ? "text-slate-500" : "text-slate-400")}>No closed deals yet.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className={cn("border-b", darkMode ? "bg-slate-700/50 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500")}>
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold uppercase tracking-wider">Deal</th>
                      <th className="text-left px-4 py-2 font-semibold uppercase tracking-wider">COE</th>
                      <th className="text-right px-4 py-2 font-semibold uppercase tracking-wider">Price</th>
                      <th className="text-right px-4 py-2 font-semibold uppercase tracking-wider">Gross Comm.</th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y", darkMode ? "divide-slate-700" : "divide-slate-100")}>
                    {closedDeals.map(t => (
                      <tr key={t.id} className={cn("transition-colors", darkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-50")}>
                        <td className={cn("px-4 py-2.5 font-medium truncate max-w-[160px]", darkMode ? "text-slate-200" : "text-slate-800")}>{t.dealName}</td>
                        <td className={cn("px-4 py-2.5", darkMode ? "text-slate-400" : "text-slate-500")}>{t.coeDate ? format(parseISO(t.coeDate), 'MMM d, yyyy') : '—'}</td>
                        <td className={cn("px-4 py-2.5 text-right", darkMode ? "text-slate-300" : "text-slate-700")}>{formatCurrency(t.price)}</td>
                        <td className={cn("px-4 py-2.5 text-right font-semibold", darkMode ? "text-emerald-400" : "text-emerald-600")}>{formatCurrency(t.price * (t.grossCommissionPercent / 100))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Export buttons */}
      <div className={cn("rounded-2xl border shadow-sm p-5 no-print", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
        <h2 className={cn("font-bold text-sm uppercase tracking-wider mb-4", darkMode ? "text-slate-200" : "text-slate-800")}>Export Data</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportTransactionsCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors">
            <FileDown className="w-4 h-4" /> Transactions CSV
          </button>
          <button onClick={exportLeadsCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors">
            <FileDown className="w-4 h-4" /> Leads CSV
          </button>
          <button onClick={exportContactsCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors">
            <FileDown className="w-4 h-4" /> Contacts CSV
          </button>
          <button onClick={exportAllCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors">
            <FileDown className="w-4 h-4" /> All Data CSV
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors">
            <Printer className="w-4 h-4" /> PDF Report (Print)
          </button>
        </div>
        <p className={cn("text-xs mt-2", darkMode ? "text-slate-500" : "text-slate-400")}>PDF Report: use your browser's "Save as PDF" option in the print dialog for a formatted report.</p>
      </div>
    </div>
  );
};

// --- Login Screen ---

const LoginScreen = ({ onLogin, isLoading, error, sessionExpiredMessage }: { onLogin: (password: string) => void; isLoading: boolean; error: string; sessionExpiredMessage?: string }) => {
  const [password, setPassword] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) onLogin(password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm"
      >
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">LAO Pipeline Pro</h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to continue</p>
          </div>
        </div>
        {sessionExpiredMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {sessionExpiredMessage}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter team password"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-600 flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-lg py-2.5 font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">LAO Team · Commercial Real Estate</p>
      </motion.div>
    </div>
  );
};

// --- Onboarding Modal ---

const ONBOARDING_STEPS = [
  {
    icon: TrendingUp,
    title: 'Welcome to LAO Pipeline Pro',
    description: 'Your centralized hub for managing CRE deals, tracking leads, and forecasting commissions — all in one place.',
  },
  {
    icon: List,
    title: 'Manage Your Pipeline',
    description: 'Use the Pipeline Manager to track deals from LOI through Close of Escrow. Create new deals with the "+ New Deal" button.',
  },
  {
    icon: Users,
    title: 'Track Leads',
    description: 'Log contacts, set reminders, and move leads to active transactions when they convert.',
  },
  {
    icon: DollarSign,
    title: 'Commission Forecasting',
    description: 'The Executive Dashboard automatically calculates gross commission, LAO cut, and individual agent splits based on deal data.',
  },
  {
    icon: ShieldCheck,
    title: "You're all set!",
    description: 'Explore the dashboard, and reach out to your team if you need help. Let\'s close some deals.',
  },
];

const OnboardingModal = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = React.useState(0);
  const current = ONBOARDING_STEPS[step];
  const Icon = current.icon;
  const isLast = step === ONBOARDING_STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4"
      >
        <motion.div
          key={`step-${step}`}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 26, stiffness: 320 } }}
          exit={{ opacity: 0, scale: 0.96, y: -8, transition: { duration: 0.12 } }}
          className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
        >
          <div className="flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <Icon className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{current.title}</h2>
              <p className="text-slate-500 mt-2 leading-relaxed">{current.description}</p>
            </div>

            {/* Step dots */}
            <div className="flex gap-1.5">
              {ONBOARDING_STEPS.map((_, i) => (
                <div key={i} className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-200')} />
              ))}
            </div>

            <div className="flex gap-3 w-full">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => isLast ? onComplete() : setStep(s => s + 1)}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                {isLast ? "Get Started" : "Next"}
              </button>
            </div>

            {!isLast && (
              <button onClick={onComplete} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                Skip tour
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// --- Page Tutorials ---

type TutorialStep = { icon: React.ElementType; title: string; description: string };

const PAGE_TUTORIALS: Record<string, TutorialStep[]> = {
  dashboard: [
    {
      icon: LayoutDashboard,
      title: 'Executive Dashboard',
      description: 'This page gives you a high-level snapshot of your entire pipeline. KPI cards at the top show total active deals, pipeline value, projected commissions, and active leads.',
    },
    {
      icon: DollarSign,
      title: 'KPI Cards',
      description: 'Each metric card is clickable — clicking "Pipeline" or "Leads" cards navigates you directly to that section. The trend arrow shows change from the previous period.',
    },
    {
      icon: PieChart,
      title: 'Charts',
      description: 'The bar chart breaks down pipeline value by deal stage (LOI → Closed). The pie chart shows the commission split between your agents. Hover over segments for exact figures.',
    },
    {
      icon: TrendingUp,
      title: 'Recent Transactions',
      description: 'The table at the bottom lists your most recent deals. Click any row to open the full transaction detail. The "View All" link takes you to the Pipeline Manager.',
    },
    {
      icon: Bell,
      title: 'Upcoming Deadlines',
      description: 'The deadline widget flags deals with PSA, Feasibility, or Close of Escrow dates approaching within 30 days. Click a deal to jump to its detail page.',
    },
  ],
  pipeline: [
    {
      icon: List,
      title: 'Pipeline Manager',
      description: 'Deals are organized by stage: LOI, Contract, Escrow, Closed, and Option. Each column shows the count and total value of deals in that stage.',
    },
    {
      icon: Briefcase,
      title: 'Deal Cards',
      description: 'Each card shows the deal name, address, price, and key dates. Click a card to open the full transaction detail where you can edit every field.',
    },
    {
      icon: Plus,
      title: 'Adding Deals',
      description: 'Use the "+ New Deal" button in the sidebar (or the blue button at the top of this view) to create a new transaction. Fill in the required fields and click Save.',
    },
    {
      icon: ArrowUpDown,
      title: 'Sorting & Filtering',
      description: 'Use the search bar to filter by deal name or address. The sort dropdown lets you reorder by price, date, or stage. Filters persist while you stay on this page.',
    },
    {
      icon: Columns3,
      title: 'Kanban vs. List',
      description: 'Toggle between Kanban board view (columns by stage) and a flat list view using the view-switcher buttons in the toolbar. Both views show the same data.',
    },
  ],
  leads: [
    {
      icon: Users,
      title: 'Leads Tracker',
      description: 'Track prospective deals and contacts before they become active transactions. Each lead card shows the project name, contact, and how long since last contact.',
    },
    {
      icon: Search,
      title: 'Search & Filter',
      description: 'Use the search bar to find leads by name, project, or contact. The filter chips at the top let you narrow by lead type (Buyer, Seller, Referral, etc.).',
    },
    {
      icon: Bell,
      title: 'Reminders',
      description: 'Open a lead and use the "Add Reminder" button to schedule a follow-up. Reminders appear in the Upcoming Deadlines widget on the Dashboard.',
    },
    {
      icon: ArrowUpRight,
      title: 'Converting Leads',
      description: 'When a lead converts to an active deal, use the "+ New Deal" button and reference the lead. You can then mark the lead as inactive or delete it.',
    },
    {
      icon: MessageSquare,
      title: 'Notes Log',
      description: 'Each lead has a timestamped notes log. Click "+ Add Note" inside a lead detail to record calls, emails, or meeting summaries.',
    },
  ],
  contacts: [
    {
      icon: BookUser,
      title: 'Contacts',
      description: 'Your contact book aggregates all parties from transactions and leads, plus standalone contacts you add manually.',
    },
    {
      icon: Search,
      title: 'Searching Contacts',
      description: 'Use the search bar to find a contact by name, email, phone, or company. Results update in real time as you type.',
    },
    {
      icon: Plus,
      title: 'Adding Contacts',
      description: 'Click "+ New Contact" to add a standalone contact not linked to a specific deal or lead. You can later associate them with transactions from the deal detail page.',
    },
    {
      icon: Users,
      title: 'Contact Detail',
      description: 'Click any contact to see their full profile: phone, email, entity name, and all transactions/leads they appear in. Use the edit icon to update their info.',
    },
  ],
  inbox: [
    {
      icon: Inbox,
      title: 'Email Inbox',
      description: 'A lightweight email inbox surfacing messages relevant to your deals. Unread message counts appear as a badge on the Inbox nav item.',
    },
    {
      icon: MailOpen,
      title: 'Reading Emails',
      description: 'Click an email row to expand it and read the full message. Emails are marked as read automatically when opened.',
    },
    {
      icon: Reply,
      title: 'Replying',
      description: 'Use the Reply button inside an open email to draft a response. The reply is sent through your configured email account.',
    },
    {
      icon: Tag,
      title: 'Linking to Deals',
      description: 'You can tag an email to a specific transaction or lead using the link button. This associates the email with that deal for easy reference later.',
    },
  ],
  import: [
    {
      icon: Upload,
      title: 'Data Import / Export',
      description: 'This page lets you bulk-import transactions or leads from CSV files, and export your current data for backup or reporting.',
    },
    {
      icon: File,
      title: 'Importing CSV',
      description: 'Select "Transactions" or "Leads" using the toggle, then drag and drop your CSV file or click "Choose File". The app will preview the data before you confirm import.',
    },
    {
      icon: Download,
      title: 'Exporting Data',
      description: 'Click "Export Transactions" or "Export Leads" to download your current data as a CSV file. Deleted records are excluded from exports.',
    },
    {
      icon: AlertCircle,
      title: 'CSV Format',
      description: 'Use the "Download Template" button to get a pre-formatted CSV with the correct column headers. Importing with mismatched headers will show a validation error.',
    },
  ],
  settings: [
    {
      icon: Settings,
      title: 'Settings',
      description: 'Customize LAO Pipeline Pro to match your team. Changes here affect labels and calculations throughout the app.',
    },
    {
      icon: UserCog,
      title: 'Agent Names',
      description: 'Update the names for Agent 1 (Trey) and Agent 2 (Kirk) in the Agent Preferences section. These names appear in commission split displays across all views.',
    },
    {
      icon: Moon,
      title: 'Dark Mode',
      description: 'Toggle dark mode on or off. Your preference is saved locally and persists across sessions.',
    },
    {
      icon: ShieldCheck,
      title: 'Security',
      description: 'If a server-side password is configured via the APP_PASSWORD environment variable, the app will require it on first load. Contact your admin to change the password.',
    },
  ],
  'deal-detail': [
    {
      icon: Briefcase,
      title: 'Transaction Detail',
      description: 'This page shows everything about a single deal. Use the tabs at the top — Overview, Financials, Parties, Timeline, Documents — to navigate between sections.',
    },
    {
      icon: DollarSign,
      title: 'Financials Tab',
      description: 'The Financials tab shows the deal price, gross commission %, LAO cut %, and the calculated splits for each agent. Edit any field inline and click Save.',
    },
    {
      icon: Users,
      title: 'Parties Tab',
      description: 'The Parties tab lists Buyer, Seller, and any other parties (brokers, attorneys, etc.). Click "+ Add Party" to add contacts, or the edit icon to update existing ones.',
    },
    {
      icon: CalendarIcon,
      title: 'Timeline Tab',
      description: 'The Timeline tab shows PSA date, Feasibility date, Close of Escrow, and any custom dates you add. Custom dates can be flagged as reminders or general events.',
    },
    {
      icon: FileText,
      title: 'Documents Tab',
      description: 'Upload and manage files for this deal in the Documents tab. Supported types include PDF, DOCX, and images. Click a document name to download it.',
    },
    {
      icon: MessageSquare,
      title: 'Notes Log',
      description: 'The notes log at the bottom of the Overview tab keeps a timestamped record of all updates. Click "+ Add Note" to record calls, emails, or action items.',
    },
  ],
  'lead-detail': [
    {
      icon: Users,
      title: 'Lead Detail',
      description: 'Full profile for a single lead. Edit the project name, contact, lead type, and summary at the top. All changes auto-save when you click the Save button.',
    },
    {
      icon: Phone,
      title: 'Contacts',
      description: 'The Contacts section lists all people associated with this lead. Click "+ Add Contact" to link additional contacts, or the edit icon to update existing ones.',
    },
    {
      icon: Bell,
      title: 'Reminders',
      description: 'Add follow-up reminders with a date and note. Reminders appear in the Dashboard deadline widget and will be highlighted when overdue.',
    },
    {
      icon: MessageSquare,
      title: 'Notes Log',
      description: 'Keep a running log of every touchpoint — calls, emails, site visits. Each note is timestamped. Use the trash icon to remove a note if needed.',
    },
  ],
  deleted: [
    {
      icon: Trash2,
      title: 'Recently Deleted',
      description: 'Soft-deleted transactions and leads land here instead of being permanently removed. Items are kept for 30 days before automatic deletion.',
    },
    {
      icon: RotateCcw,
      title: 'Restoring Items',
      description: 'Click the "Restore" button next to any item to move it back to its original location (Pipeline or Leads). The item will reappear in all views immediately.',
    },
    {
      icon: Trash2,
      title: 'Permanent Delete',
      description: 'To permanently remove an item, click the "Delete Forever" button. This action cannot be undone — all data for that record will be erased.',
    },
  ],
  'recent-actions': [
    {
      icon: History,
      title: 'Recent Actions',
      description: 'A chronological audit log of every change made in the app — deal stage updates, edits, deletes, and imports. Useful for tracking team activity.',
    },
    {
      icon: Search,
      title: 'Filtering the Log',
      description: 'Use the search bar to filter actions by deal name, user, or action type. The log shows the most recent 100 entries.',
    },
  ],
};

const TutorialModal = ({ pageKey, onComplete }: { pageKey: string; onComplete: () => void }) => {
  const steps = PAGE_TUTORIALS[pageKey] ?? PAGE_TUTORIALS['dashboard'];
  const [step, setStep] = React.useState(0);
  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="tutorial-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4"
        onClick={onComplete}
      >
        <motion.div
          key={`tutorial-step-${step}`}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 26, stiffness: 320 } }}
          exit={{ opacity: 0, scale: 0.96, y: -8, transition: { duration: 0.12 } }}
          className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <Icon className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{current.title}</h2>
              <p className="text-slate-500 mt-2 leading-relaxed">{current.description}</p>
            </div>

            {/* Step dots */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div key={i} className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-200')} />
              ))}
            </div>

            <div className="flex gap-3 w-full">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => isLast ? onComplete() : setStep(s => s + 1)}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                {isLast ? 'Done' : 'Next'}
              </button>
            </div>

            {!isLast && (
              <button onClick={onComplete} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                Close
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// --- Error Boundary ---

interface ErrorBoundaryState { hasError: boolean; error: Error | null }

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-8 max-w-md w-full text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-slate-500 text-sm mb-6">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              onClick={() => { (this as any).setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    // @ts-ignore
    return (this as any).props.children;
  }
}

// --- Main App Component ---

// --- Mobile Bottom Navigation Bar ---
const MobileBottomNav = ({
  currentView,
  selectedDealId,
  selectedLeadId,
  onNavigate,
  onNewDeal,
  darkMode,
  inboxUnreadCount = 0,
}: {
  currentView: string;
  selectedDealId: string | null;
  selectedLeadId: string | null;
  onNavigate: (view: 'dashboard' | 'pipeline' | 'leads' | 'contacts' | 'inbox') => void;
  onNewDeal: () => void;
  darkMode: boolean;
  inboxUnreadCount?: number;
}) => {
  const items = [
    { view: 'dashboard' as const, icon: LayoutDashboard, label: 'Dashboard', badge: 0 },
    { view: 'pipeline' as const, icon: List, label: 'Pipeline', badge: 0 },
    { view: 'leads' as const, icon: Users, label: 'Leads', badge: 0 },
    { view: 'inbox' as const, icon: Inbox, label: 'Inbox', badge: inboxUnreadCount },
  ];
  const isActive = (view: string) =>
    currentView === view && !selectedDealId && !selectedLeadId;

  return (
    <div
      className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-stretch',
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map(({ view, icon: Icon, label, badge }) => (
        <button
          key={view}
          onClick={() => onNavigate(view)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors',
            isActive(view)
              ? 'text-indigo-600'
              : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <span className="relative">
            <Icon className="w-5 h-5" />
            {badge > 0 && (
              <span className="absolute -top-1 -right-1.5 bg-indigo-600 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </span>
          <span className="text-[10px] font-medium leading-none">{label}</span>
        </button>
      ))}
      <button
        onClick={onNewDeal}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px]"
      >
        <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-md shadow-indigo-200">
          <Plus className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium leading-none text-indigo-600 mt-0.5">New Deal</span>
      </button>
    </div>
  );
};

function AppInner() {
  // --- Auth state ---
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [AUTH_ENABLED_CLIENT, setAuthEnabledClient] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);

  // --- Toast state ---
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = useCallback((message: string, type: ToastItem['type'] = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // --- Preferences state ---
  const [preferences, setPreferences] = useState<AppPreferences>(loadPrefsFromStorage);
  const savePreferences = useCallback((updates: Partial<AppPreferences>) => {
    setPreferences(prev => {
      const next = { ...prev, ...updates };
      try { localStorage.setItem('lao_preferences', JSON.stringify(next)); } catch {}
      fetch('/api/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) }).catch(() => {});
      return next;
    });
  }, []);

  // --- Onboarding state ---
  const [showOnboarding, setShowOnboarding] = useState(false);

  // --- Tutorial state ---
  const [showTutorial, setShowTutorial] = useState(false);

  // --- App state ---
  const [dataLoading, setDataLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'pipeline' | 'leads' | 'reports' | 'detail' | 'import' | 'deleted' | 'contacts' | 'recent-actions' | 'inbox' | 'settings'>('dashboard');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [standaloneContacts, setStandaloneContacts] = useState<StandaloneContact[]>([]);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('darkMode') === 'true'; } catch { return false; }
  });
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [bulletinItems, setBulletinItems] = useState<BulletinItem[]>(() => {
    try {
      const stored = localStorage.getItem('bulletinItems');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const logAction = (entry: Omit<ActionLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: ActionLogEntry = {
      ...entry,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
    };
    setActionLog(prev => [newEntry, ...prev]);
    // Persist to server (fire-and-forget); omit previousState to keep payload lean
    const { previousState: _ps, ...toStore } = newEntry;
    fetch('/api/action-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toStore),
    }).catch(console.error);
  };

  const handleAddBulletinItem = useCallback((text: string, transactionId?: string, assignedTo?: 'Trey' | 'Kirk' | 'Pete') => {
    const item: BulletinItem = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      completed: false,
      createdAt: new Date().toISOString(),
      transactionId,
      assignedTo,
    };
    setBulletinItems(prev => {
      const next = [...prev, item];
      try { localStorage.setItem('bulletinItems', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const handleToggleBulletinItem = (id: string) => {
    const item = bulletinItems.find(i => i.id === id);
    const becomingCompleted = item ? !item.completed : false;
    setBulletinItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, completed: !i.completed } : i);
      try { localStorage.setItem('bulletinItems', JSON.stringify(next)); } catch {}
      return next;
    });
    // When a task is marked complete and is assigned to a transaction, log to its activity timeline
    if (item && becomingCompleted && item.transactionId) {
      const txn = transactions.find(t => t.id === item.transactionId);
      if (txn) {
        const note: Note = {
          id: Math.random().toString(36).substr(2, 9),
          content: `Task completed: "${item.text}"${item.assignedTo ? ` — Assigned to: ${item.assignedTo}` : ''}`,
          date: new Date().toISOString(),
        };
        handleUpdateTransaction({ ...txn, notesLog: [note, ...(txn.notesLog || [])] });
      }
    }
  };

  const handleDeleteBulletinItem = useCallback((id: string) => {
    setBulletinItems(prev => {
      const next = prev.filter(i => i.id !== id);
      try { localStorage.setItem('bulletinItems', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const handleLogout = useCallback(async (expired = false) => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    setIsAuthenticated(false);
    setSessionExpired(expired);
    setTransactions([]);
    setLeads([]);
    setActionLog([]);
    setInboxItems([]);
    setStandaloneContacts([]);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [transRes, leadsRes, actionRes, inboxRes, contactsRes, prefsRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/leads'),
        fetch('/api/action-log'),
        fetch('/api/inbox'),
        fetch('/api/contacts'),
        fetch('/api/preferences'),
      ]);
      // If any response is 401, the session has expired
      if ([transRes, leadsRes, actionRes, inboxRes, contactsRes, prefsRes].some(r => r.status === 401)) {
        handleLogout(true);
        return;
      }
      if (transRes.ok) {
        const data = await transRes.json();
        if (data.length > 0) setTransactions(data);
      }
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        if (data.length > 0) setLeads(data);
      }
      if (actionRes.ok) {
        const data = await actionRes.json();
        if (data.length > 0) setActionLog(data);
      }
      if (inboxRes.ok) {
        const data = await inboxRes.json();
        setInboxItems(data);
      }
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        if (data.length > 0) setStandaloneContacts(data);
      }
      if (prefsRes.ok) {
        const data = await prefsRes.json();
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setPreferences(prev => {
            const next = { ...prev, ...data };
            try { localStorage.setItem('lao_preferences', JSON.stringify(next)); } catch {}
            return next;
          });
        }
      }
    } catch (e) {
      console.log('Could not load data from API:', e);
      showToast('Failed to load some data. Using cached data.', 'error');
    } finally {
      setDataLoading(false);
    }
  }, [showToast, handleLogout]);

  // Check authentication on mount, then load data
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then((data: { authenticated: boolean; authEnabled?: boolean }) => {
        setIsAuthenticated(data.authenticated);
        setAuthEnabledClient(data.authEnabled ?? false);
        setAuthChecked(true);
        if (data.authenticated) {
          refreshData();
          // Show onboarding on first visit
          if (!localStorage.getItem('onboarding_done')) {
            setShowOnboarding(true);
          }
        } else {
          setDataLoading(false);
        }
      })
      .catch(() => {
        // If auth check fails, assume no auth needed (offline / dev with no server)
        setIsAuthenticated(true);
        setAuthChecked(true);
        refreshData();
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (password: string) => {
    setLoginLoading(true);
    setLoginError('');
    setSessionExpired(false);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        refreshData();
        if (!localStorage.getItem('onboarding_done')) {
          setShowOnboarding(true);
        }
      } else {
        setLoginError('Incorrect password. Please try again.');
      }
    } catch {
      setLoginError('Connection error. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Global 401 interceptor — any /api call returning 401 triggers session expiry
  useEffect(() => {
    if (!isAuthenticated || !AUTH_ENABLED_CLIENT) return;
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await origFetch(...args);
      const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : '';
      if (res.status === 401 && url.includes('/api/') && !url.includes('/api/auth/')) {
        handleLogout(true);
      }
      return res;
    };
    return () => { window.fetch = origFetch; };
  }, [isAuthenticated, AUTH_ENABLED_CLIENT, handleLogout]);

  // Inactivity timer — auto-logout after 8 hours of no interaction
  useEffect(() => {
    if (!isAuthenticated || !AUTH_ENABLED_CLIENT) return;
    const INACTIVITY_MS = 8 * 60 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { handleLogout(true); }, INACTIVITY_MS);
    };
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [isAuthenticated, AUTH_ENABLED_CLIENT, handleLogout]);

  // Scroll to top and reset viewport zoom on every view change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    // Reset mobile zoom by briefly toggling the viewport meta scale
    const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (meta) {
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0';
      setTimeout(() => {
        meta.content = 'width=device-width, initial-scale=1.0';
      }, 50);
    }
  }, [currentView, selectedDealId, selectedLeadId, selectedContactId]);

  // Pull-to-refresh on mobile
  const { isPulling, isRefreshing, pullDistance } = usePullToRefresh(refreshData);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === 'true'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed)); } catch {}
  }, [isSidebarCollapsed]);

  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  
  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ 
    isOpen: boolean; 
    type: 'single' | 'batch' | 'permanent'; 
    ids: string[]; 
    target: 'transaction' | 'lead';
  }>({ 
    isOpen: false, 
    type: 'single', 
    ids: [],
    target: 'transaction'
  });

  // Derived state for active and deleted transactions
  const activeTransactions = useMemo(() => transactions.filter(t => !t.isDeleted), [transactions]);
  const deletedTransactions = useMemo(() => transactions.filter(t => t.isDeleted), [transactions]);
  const activeLeads = useMemo(() => leads.filter(l => !l.isDeleted), [leads]);
  const deletedLeads = useMemo(() => leads.filter(l => l.isDeleted), [leads]);
  const allContacts = useMemo(() => deriveContacts(activeTransactions, activeLeads, standaloneContacts), [activeTransactions, activeLeads, standaloneContacts]);

  const handleSelectDeal = (id: string) => {
    setSelectedDealId(id);
    setSelectedLeadId(null);
    setSelectedContactId(null);
    setCurrentView('detail');
    setIsMobileMenuOpen(false);
  };

  const handleSelectLead = (id: string) => {
    setSelectedLeadId(id);
    setSelectedDealId(null);
    setSelectedContactId(null);
    setCurrentView('leads');
    setIsMobileMenuOpen(false);
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setCurrentView('contacts');
    setIsMobileMenuOpen(false);
  };

  const handleAddStandaloneContact = (contact: StandaloneContact) => {
    setStandaloneContacts(prev => [...prev, contact]);
    fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contact) }).catch(console.error);
  };

  const handleUpdateStandaloneContact = (contact: StandaloneContact) => {
    setStandaloneContacts(prev => prev.map(c => c.id === contact.id ? contact : c));
    fetch(`/api/contacts/${contact.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contact) }).catch(console.error);
  };

  const handleDeleteStandaloneContact = (id: string) => {
    setStandaloneContacts(prev => prev.filter(c => c.id !== id));
    fetch(`/api/contacts/${id}`, { method: 'DELETE' }).catch(console.error);
  };

  // Merge keepId contact into mergingId: update all source records then remove merged contact
  const handleMergeContacts = (keepId: string, mergingId: string) => {
    const keepContact = allContacts.find(c => c.id === keepId);
    const mergingContact = allContacts.find(c => c.id === mergingId);
    if (!keepContact || !mergingContact) return;

    const matchesContact = (name: string, email?: string) => {
      const nameLower = name.trim().toLowerCase();
      const emailLower = email?.trim().toLowerCase();
      return (
        nameLower === mergingContact.name.trim().toLowerCase() ||
        (emailLower && mergingContact.email && emailLower === mergingContact.email.trim().toLowerCase())
      );
    };

    // Update transactions: replace merging contact's party data with keep contact's data
    const updatedTransactions: Transaction[] = [];
    setTransactions(prev => {
      const next = prev.map(t => {
        let changed = false;
        const updateParty = (p: Party): Party => {
          if (matchesContact(p.name, p.email)) {
            changed = true;
            return { ...p, name: keepContact.name, entity: keepContact.entity || p.entity, email: keepContact.email || p.email, phone: keepContact.phone || p.phone };
          }
          return p;
        };
        const newBuyer = updateParty(t.buyer);
        const newSeller = updateParty(t.seller);
        const newOtherParties = t.otherParties.map(updateParty);
        if (!changed) return t;
        const updated = { ...t, buyer: newBuyer, seller: newSeller, otherParties: newOtherParties };
        updatedTransactions.push(updated);
        return updated;
      });
      return next;
    });
    // Persist changed transactions
    updatedTransactions.forEach(t => {
      fetch(`/api/transactions/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) }).catch(console.error);
    });

    // Update leads: replace merging contact references with keep contact's data
    const updatedLeads: Lead[] = [];
    setLeads(prev => {
      const next = prev.map(l => {
        let changed = false;
        let newLead = { ...l };
        if (l.contactName && matchesContact(l.contactName, l.contactEmail)) {
          newLead = { ...newLead, contactName: keepContact.name, contactEmail: keepContact.email || l.contactEmail, contactPhone: keepContact.phone || l.contactPhone };
          changed = true;
        }
        const newContacts = (l.contacts || []).map(c => {
          if (matchesContact(c.name, c.email)) {
            changed = true;
            return { ...c, name: keepContact.name, email: keepContact.email || c.email, phone: keepContact.phone || c.phone };
          }
          return c;
        });
        if (!changed) return l;
        const updated = { ...newLead, contacts: newContacts };
        updatedLeads.push(updated);
        return updated;
      });
      return next;
    });
    // Persist changed leads
    updatedLeads.forEach(l => {
      fetch(`/api/leads/${l.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(l) }).catch(console.error);
    });

    // Remove merged contact from standalone contacts if present (match by ID, not name/email)
    const mergingStandaloneId = mergingContact.sources.find(s => s.type === 'standalone')?.id;
    if (mergingStandaloneId) {
      setStandaloneContacts(prev => prev.filter(c => c.id !== mergingStandaloneId));
      fetch(`/api/contacts/${mergingStandaloneId}`, { method: 'DELETE' }).catch(console.error);
    }

    // Navigate to the kept contact
    setSelectedContactId(keepId);
  };

  const handleUpdateTransaction = (updated: Transaction) => {
    setTransactions(prev => {
      const old = prev.find(t => t.id === updated.id);
      let description = `Updated "${updated.dealName}"`;
      if (old) {
        const changes: string[] = [];
        if (old.dealName !== updated.dealName) changes.push(`renamed from "${old.dealName}"`);
        if (old.stage !== updated.stage) changes.push(`stage: ${old.stage} → ${updated.stage}`);
        if (old.price !== updated.price) changes.push(`price: ${formatCurrency(old.price)} → ${formatCurrency(updated.price)}`);
        if (old.grossCommissionPercent !== updated.grossCommissionPercent) changes.push(`commission: ${old.grossCommissionPercent}% → ${updated.grossCommissionPercent}%`);
        if (old.coeDate !== updated.coeDate) changes.push(`COE date updated`);
        if (old.psaDate !== updated.psaDate) changes.push(`PSA date updated`);
        if (old.address !== updated.address) changes.push(`address updated`);
        if ((old.notesLog?.length ?? 0) !== (updated.notesLog?.length ?? 0)) changes.push(`note ${(updated.notesLog?.length ?? 0) > (old.notesLog?.length ?? 0) ? 'added' : 'removed'}`);
        if ((old.documents?.length ?? 0) !== (updated.documents?.length ?? 0)) changes.push(`document ${(updated.documents?.length ?? 0) > (old.documents?.length ?? 0) ? 'added' : 'removed'}`);
        if ((old.reminders?.length ?? 0) !== (updated.reminders?.length ?? 0)) changes.push(`reminder ${(updated.reminders?.length ?? 0) > (old.reminders?.length ?? 0) ? 'added' : 'removed'}`);
        if (changes.length > 0) description = `"${updated.dealName}": ${changes.join('; ')}`;
      }
      logAction({
        type: 'transaction_update',
        entityId: updated.id,
        entityType: 'transaction',
        entityName: updated.dealName,
        description,
        previousState: old,
      });
      return prev.map(t => t.id === updated.id ? updated : t);
    });
    fetch(`/api/transactions/${updated.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
      .catch(() => showToast(`Failed to save "${updated.dealName}". Changes may not persist.`, 'error'));
  };

  const handleCreateTransaction = (newDeal: Transaction) => {
    setTransactions(prev => [...prev, newDeal]);
    logAction({
      type: 'transaction_create',
      entityId: newDeal.id,
      entityType: 'transaction',
      entityName: newDeal.dealName,
      description: `Created transaction "${newDeal.dealName}"`,
    });
    setIsNewDealModalOpen(false);
    setSelectedDealId(newDeal.id);
    setCurrentView('detail');
    fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newDeal) })
      .catch(() => showToast(`Failed to create "${newDeal.dealName}". Changes may not persist.`, 'error'));
  };

  const handleConvertLeadToTransaction = (lead: Lead) => {
    const conversionDate = new Date().toISOString();
    const newTransactionId = Math.random().toString(36).substr(2, 9);

    // Build a new transaction pre-populated from the lead
    const newTransaction: Transaction = {
      id: newTransactionId,
      dealName: lead.projectName || 'Converted Lead',
      stage: 'LOI',
      price: lead.estValue || 0,
      grossCommissionPercent: 3,
      treyLaoPercent: 35,
      kirkLaoPercent: 30,
      treySplitPercent: 50,
      kirkSplitPercent: 50,
      earnestMoney: 0,
      psaDate: '',
      feasibilityDate: '',
      coeDate: '',
      address: '',
      acreage: 0,
      zoning: '',
      clientContact: lead.contactName || '',
      clientPhone: lead.contactPhone || '',
      clientEmail: lead.contactEmail || '',
      coBroker: '',
      titleCompany: '',
      referralSource: '',
      notes: '',
      notesLog: [],
      buyer: { role: 'Buyer', name: lead.stage === 'Buyer Lead' ? lead.contactName : '', entity: '' },
      seller: { role: 'Seller', name: lead.stage !== 'Buyer Lead' ? lead.contactName : '', entity: '' },
      otherParties: [],
      // Inject conversion date annotation into timeline
      customDates: [{
        id: Math.random().toString(36).substr(2, 9),
        label: `Lead Converted (from ${lead.stage}: ${lead.projectName})`,
        date: conversionDate,
        completed: true,
        type: 'event',
      }],
      documents: [],
      projectYear: String(new Date().getFullYear()),
    };

    // Mark the lead as converted
    const updatedLead: Lead = {
      ...lead,
      convertedToTransactionId: newTransactionId,
      convertedAt: conversionDate,
    };

    setTransactions(prev => [...prev, newTransaction]);
    setLeads(prev => prev.map(l => l.id === lead.id ? updatedLead : l));

    logAction({
      type: 'transaction_create',
      entityId: newTransactionId,
      entityType: 'transaction',
      entityName: newTransaction.dealName,
      description: `Converted lead "${lead.projectName}" to transaction at LOI stage`,
    });

    // Persist both
    fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTransaction) })
      .catch(() => showToast(`Failed to save transaction "${newTransaction.dealName}". Changes may not persist.`, 'error'));
    fetch(`/api/leads/${lead.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedLead) })
      .catch(console.error);

    showToast(`Lead "${lead.projectName}" converted to Pipeline at LOI stage.`, 'success');

    // Navigate to the new transaction
    setSelectedDealId(newTransactionId);
    setCurrentView('detail');
  };

  const handleImportTransactions = (newTransactions: Transaction[]) => {
    setTransactions(prev => [...prev, ...newTransactions]);
    setCurrentView('pipeline');
    fetch('/api/transactions/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTransactions) }).catch(console.error);
  };

  const handleUpdateLead = (updated: Lead) => {
    setLeads(prev => {
      const old = prev.find(l => l.id === updated.id);
      let description = `Updated lead "${updated.projectName}"`;
      if (old) {
        const changes: string[] = [];
        if (old.projectName !== updated.projectName) changes.push(`renamed from "${old.projectName}"`);
        if (old.stage !== updated.stage) changes.push(`stage: ${old.stage} → ${updated.stage}`);
        if (old.summary !== updated.summary) changes.push(`summary updated`);
        if (old.contactName !== updated.contactName) changes.push(`contact: ${old.contactName} → ${updated.contactName}`);
        if ((old.notesLog?.length ?? 0) !== (updated.notesLog?.length ?? 0)) changes.push(`note ${(updated.notesLog?.length ?? 0) > (old.notesLog?.length ?? 0) ? 'added' : 'removed'}`);
        if ((old.contacts?.length ?? 0) !== (updated.contacts?.length ?? 0)) changes.push(`contact ${(updated.contacts?.length ?? 0) > (old.contacts?.length ?? 0) ? 'added' : 'removed'}`);
        if ((old.reminders?.length ?? 0) !== (updated.reminders?.length ?? 0)) changes.push(`reminder ${(updated.reminders?.length ?? 0) > (old.reminders?.length ?? 0) ? 'added' : 'removed'}`);
        if (changes.length > 0) description = `"${updated.projectName}": ${changes.join('; ')}`;
      }
      logAction({
        type: 'lead_update',
        entityId: updated.id,
        entityType: 'lead',
        entityName: updated.projectName,
        description,
        previousState: old,
      });
      return prev.map(l => l.id === updated.id ? updated : l);
    });
    fetch(`/api/leads/${updated.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
      .catch(() => showToast(`Failed to save lead "${updated.projectName}". Changes may not persist.`, 'error'));
  };

  const handleImportLeads = (newLeads: Lead[]) => {
    setLeads(prev => [...prev, ...newLeads]);
    setCurrentView('leads');
    fetch('/api/leads/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newLeads) })
      .then(() => showToast(`Imported ${newLeads.length} lead${newLeads.length !== 1 ? 's' : ''}.`, 'success'))
      .catch(() => showToast('Import saved locally but failed to sync to server.', 'error'));
  };

  const handleDeleteTransaction = (id: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'single',
      ids: [id],
      target: 'transaction'
    });
  };

  const handleDeleteLead = (id: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'single',
      ids: [id],
      target: 'lead'
    });
  };

  const handleBatchDelete = (ids: string[]) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'batch',
      ids: ids,
      target: 'transaction'
    });
  };

  const handleBatchDeleteLeads = (ids: string[]) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'batch',
      ids: ids,
      target: 'lead'
    });
  };

  const handleRestoreTransaction = (id: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id !== id) return t;
      const restored = { ...t, isDeleted: false, deletedAt: undefined };
      logAction({ type: 'transaction_restore', entityId: id, entityType: 'transaction', entityName: t.dealName, description: `Restored transaction "${t.dealName}"` });
      fetch(`/api/transactions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(restored) }).catch(console.error);
      return restored;
    }));
  };

  const handlePermanentDeleteTransaction = (id: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'permanent',
      ids: [id],
      target: 'transaction'
    });
  };

  const handleRestoreLead = (id: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id !== id) return l;
      const restored = { ...l, isDeleted: false, deletedAt: undefined };
      logAction({ type: 'lead_restore', entityId: id, entityType: 'lead', entityName: l.projectName, description: `Restored lead "${l.projectName}"` });
      fetch(`/api/leads/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(restored) }).catch(console.error);
      return restored;
    }));
  };

  const handlePermanentDeleteLead = (id: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'permanent',
      ids: [id],
      target: 'lead'
    });
  };

  const handleAddReminder = (targetId: string, targetType: 'transaction' | 'lead', reminder: LeadReminder) => {
    if (targetType === 'transaction') {
      setTransactions(prev => prev.map(t => {
        if (t.id !== targetId) return t;
        const updated = { ...t, reminders: [...(t.reminders || []), reminder] };
        fetch(`/api/transactions/${targetId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) }).catch(console.error);
        return updated;
      }));
    } else {
      setLeads(prev => prev.map(l => {
        if (l.id !== targetId) return l;
        const updated = { ...l, reminders: [...(l.reminders || []), reminder] };
        fetch(`/api/leads/${targetId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) }).catch(console.error);
        return updated;
      }));
    }
  };

  const executeDelete = () => {
    haptic([50, 30, 80]); // double-pulse for destructive action
    const { type, ids, target } = deleteConfirmation;

    if (target === 'transaction') {
        if (type === 'permanent') {
          setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
          if (ids.length === 1) {
            fetch(`/api/transactions/${ids[0]}/permanent`, { method: 'DELETE' }).catch(console.error);
          } else {
            fetch('/api/transactions/batch-delete-permanent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }).catch(console.error);
          }
        } else {
          // Soft delete (single or batch)
          setTransactions(prev => {
            const toDelete = prev.filter(t => ids.includes(t.id));
            toDelete.forEach(t => logAction({ type: 'transaction_delete', entityId: t.id, entityType: 'transaction', entityName: t.dealName, description: `Moved "${t.dealName}" to trash`, previousState: t }));
            return prev.map(t => ids.includes(t.id) ? { ...t, isDeleted: true, deletedAt: new Date().toISOString() } : t);
          });
          fetch('/api/transactions/batch-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }).catch(console.error);

          // If the currently viewed deal is deleted, go back to pipeline
          if (selectedDealId && ids.includes(selectedDealId)) {
            setSelectedDealId(null);
            setCurrentView('pipeline');
          }
        }
    } else {
        if (type === 'permanent') {
          setLeads(prev => prev.filter(l => !ids.includes(l.id)));
          if (ids.length === 1) {
            fetch(`/api/leads/${ids[0]}/permanent`, { method: 'DELETE' }).catch(console.error);
          } else {
            fetch('/api/leads/batch-delete-permanent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }).catch(console.error);
          }
        } else {
          // Soft delete leads
          setLeads(prev => {
            const toDelete = prev.filter(l => ids.includes(l.id));
            toDelete.forEach(l => logAction({ type: 'lead_delete', entityId: l.id, entityType: 'lead', entityName: l.projectName, description: `Moved lead "${l.projectName}" to trash`, previousState: l }));
            return prev.map(l => ids.includes(l.id) ? { ...l, isDeleted: true, deletedAt: new Date().toISOString() } : l);
          });
          fetch('/api/leads/batch-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }).catch(console.error);
          if (selectedLeadId && ids.includes(selectedLeadId)) {
            setSelectedLeadId(null);
            setCurrentView('leads');
          }
        }
    }

    setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
  };

  const selectedTransaction = useMemo(() => 
    transactions.find(t => t.id === selectedDealId), 
  [transactions, selectedDealId]);

  const selectedLead = useMemo(() => 
    leads.find(l => l.id === selectedLeadId), 
  [leads, selectedLeadId]);

  const handleUndo = (entry: ActionLogEntry) => {
    if (!entry.previousState) return;
    if (entry.entityType === 'transaction') {
      const prev = entry.previousState as Transaction;
      if (entry.type === 'transaction_delete') {
        setTransactions(t => t.map(x => x.id === prev.id ? { ...x, isDeleted: false, deletedAt: undefined } : x));
      } else if (entry.type === 'transaction_update') {
        setTransactions(t => t.map(x => x.id === prev.id ? prev : x));
        fetch(`/api/transactions/${prev.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prev) }).catch(console.error);
      }
    } else {
      const prev = entry.previousState as Lead;
      if (entry.type === 'lead_delete') {
        setLeads(l => l.map(x => x.id === prev.id ? { ...x, isDeleted: false, deletedAt: undefined } : x));
      } else if (entry.type === 'lead_update') {
        setLeads(l => l.map(x => x.id === prev.id ? prev : x));
        fetch(`/api/leads/${prev.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prev) }).catch(console.error);
      }
    }
    // Remove the undone entry from the log (locally + server)
    setActionLog(log => log.filter(e => e.id !== entry.id));
    fetch(`/api/action-log/${entry.id}`, { method: 'DELETE' }).catch(console.error);
  };

  // --- Inbox handlers ---
  const handleMarkInboxRead = (id: string, isRead: boolean) => {
    setInboxItems(prev => prev.map(i => i.id === id ? { ...i, isRead } : i));
    fetch(`/api/inbox/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead }),
    }).catch(console.error);
  };

  const handleDeleteInboxItem = (id: string) => {
    setInboxItems(prev => prev.filter(i => i.id !== id));
    fetch(`/api/inbox/${id}`, { method: 'DELETE' }).catch(console.error);
  };

  // Assign email to a transaction or lead — also pushes email as a document entry
  const handleAssignEmail = (
    emailId: string,
    target: { type: 'transaction' | 'lead'; id: string; name: string }
  ) => {
    const email = inboxItems.find(i => i.id === emailId);
    if (!email) return;

    // Mark the inbox item as assigned + read
    const updatedEmail = { ...email, isRead: true, assignedTo: target };
    setInboxItems(prev => prev.map(i => i.id === emailId ? updatedEmail : i));
    fetch(`/api/inbox/${emailId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true, assignedTo: target }),
    }).catch(console.error);

    // Build a document record for the email body
    const emailDoc: TransactionDocument = {
      id: `doc_email_${emailId}`,
      name: `✉ ${email.subject}`,
      type: 'email',
      size: email.bodyText.length,
      dateUploaded: email.receivedAt,
      sourceEmailId: emailId,
      emailBodyText: email.bodyText,
      emailBodyHtml: email.bodyHtml,
    };

    // Build document records for each attachment
    const attachmentDocs: TransactionDocument[] = email.attachments.map(att => ({
      id: `doc_att_${att.id}`,
      name: att.filename,
      type: att.contentType,
      size: att.size,
      dateUploaded: email.receivedAt,
      url: `data:${att.contentType};base64,${att.data}`,
      sourceEmailId: emailId,
    }));

    const allNewDocs = [emailDoc, ...attachmentDocs];

    if (target.type === 'transaction') {
      const tx = transactions.find(t => t.id === target.id);
      if (!tx) return;
      const updated = { ...tx, documents: [...(tx.documents || []), ...allNewDocs] };
      handleUpdateTransaction(updated);
    } else {
      // For leads, store docs in a new optional `documents` field
      const lead = leads.find(l => l.id === target.id);
      if (!lead) return;
      const updated = { ...lead, documents: [...((lead as any).documents || []), ...allNewDocs] };
      handleUpdateLead(updated as Lead);
    }
  };

  // Unread count for badge
  const inboxUnreadCount = inboxItems.filter(i => !i.isRead && !i.isDeleted).length;

  const NavItem = ({ view, icon: Icon, label, badge }: { view: 'dashboard' | 'pipeline' | 'reports' | 'leads' | 'import' | 'deleted' | 'contacts' | 'recent-actions' | 'inbox' | 'settings', icon: any, label: string, badge?: number }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setSelectedDealId(null);
        setSelectedLeadId(null);
        setSelectedContactId(null);
        setIsMobileMenuOpen(false);
      }}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-sm relative",
        currentView === view && !selectedDealId && !selectedLeadId
          ? "bg-indigo-50 text-indigo-700"
          : darkMode ? "text-slate-300 hover:bg-slate-700 hover:text-slate-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        isSidebarCollapsed && "justify-center px-2"
      )}
      title={isSidebarCollapsed ? label : undefined}
    >
      <span className="relative shrink-0">
        <Icon className="w-5 h-5" />
        {isSidebarCollapsed && badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-600 rounded-full" />
        )}
      </span>
      {!isSidebarCollapsed && <span className="flex-1 text-left">{label}</span>}
      {!isSidebarCollapsed && badge !== undefined && badge > 0 && (
        <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );

  // Loading screen (before auth check completes)
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 text-indigo-300 animate-spin" />
        </div>
      </div>
    );
  }

  // Login screen (when auth is enabled and user is not authenticated)
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} isLoading={loginLoading} error={loginError} sessionExpiredMessage={sessionExpired ? 'Your session has expired. Please sign in again.' : undefined} />;
  }

  // Initial data loading skeleton
  if (dataLoading) {
    return (
      <div className={cn("min-h-screen font-sans flex transition-colors duration-300", darkMode ? "bg-slate-900" : "bg-slate-50")}>
        <div className="w-64 shrink-0 hidden md:flex flex-col border-r animate-pulse" style={{ borderColor: darkMode ? '#334155' : '#e2e8f0', background: darkMode ? '#1e293b' : '#fff' }}>
          <div className="p-6 h-16 bg-slate-200 rounded m-4" />
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg" />)}
          </div>
        </div>
        <div className="flex-1 p-6 space-y-4">
          <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-xl animate-pulse" />)}
          </div>
          <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen font-sans flex transition-colors duration-300", darkMode ? "bg-slate-900 text-slate-100 dark" : "bg-slate-50 text-slate-900")}>
      {/* Mobile Header */}
      <div className={cn("md:hidden fixed top-0 left-0 right-0 h-16 border-b z-50 flex items-center justify-between px-4", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
        <button onClick={() => { setCurrentView('dashboard'); setSelectedDealId(null); setSelectedLeadId(null); setSelectedContactId(null); }} className="flex items-center gap-2 font-bold text-slate-900 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="dark:text-slate-100">LAO Pipeline</span>
        </button>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-40 h-screen border-r transition-all duration-300 ease-in-out flex flex-col shrink-0",
        darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200",
        "transform md:transform-none",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <button onClick={() => { setCurrentView('dashboard'); setSelectedDealId(null); setSelectedLeadId(null); setSelectedContactId(null); }} className={cn("p-6 hidden md:flex items-center gap-3 font-bold text-xl hover:opacity-80 transition-opacity", darkMode ? "text-slate-100" : "text-slate-900", isSidebarCollapsed && "justify-center px-2")}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm shadow-indigo-200 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          {!isSidebarCollapsed && <span className="whitespace-nowrap">LAO Pipeline</span>}
        </button>

        <div className="flex-1 px-4 py-6 flex flex-col mt-14 md:mt-0">
          {!isSidebarCollapsed && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-2">Menu</div>}
          <div className="space-y-2">
            <NavItem view="dashboard" icon={LayoutDashboard} label="Executive Dashboard" />
            <NavItem view="pipeline" icon={List} label="Pipeline Manager" />
            <NavItem view="reports" icon={BarChart2} label="Reports" />
            <NavItem view="leads" icon={Users} label="Leads Tracker" />
            <NavItem view="inbox" icon={Inbox} label="Email Inbox" badge={inboxUnreadCount || undefined} />
            <NavItem view="contacts" icon={BookUser} label="Contacts" />
            <NavItem view="import" icon={Upload} label="Data Import" />
          </div>
          
          <div className={cn("pt-4 mt-4 border-t border-slate-100", isSidebarCollapsed && "flex justify-center")}>
            <button 
              onClick={() => {
                setIsNewDealModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm",
                isSidebarCollapsed ? "p-3 justify-center" : "w-full px-4 py-3"
              )}
              title={isSidebarCollapsed ? "New Deal" : undefined}
            >
              <Plus className="w-5 h-5 shrink-0" />
              {!isSidebarCollapsed && <span>New Deal</span>}
            </button>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100 space-y-1">
             <NavItem view="recent-actions" icon={History} label="Recent Actions" />
             <NavItem view="deleted" icon={Trash2} label="Recently Deleted" />
             <NavItem view="settings" icon={Settings} label="Settings" />
          </div>
        </div>

        {/* Sidebar bottom — add pb-20 on mobile so content clears the bottom nav bar */}
        <div className={cn("p-4 border-t pb-20 md:pb-4", darkMode ? "border-slate-700" : "border-slate-100")}>
          <div className={cn("flex items-center gap-3 px-4 py-2", isSidebarCollapsed && "justify-center px-0")}>
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0", darkMode ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-600")}>
              {`${preferences.agent1Name.charAt(0)}${preferences.agent2Name.charAt(0)}`.toUpperCase()}
            </div>
            {!isSidebarCollapsed && (
              <div className="text-sm overflow-hidden">
                <p className={cn("font-medium truncate", darkMode ? "text-slate-100" : "text-slate-900")}>{preferences.agent1Name} &amp; {preferences.agent2Name}</p>
                <p className={cn("text-xs truncate", darkMode ? "text-slate-400" : "text-slate-500")}>{preferences.teamName}</p>
              </div>
            )}
          </div>

          {/* Collapse Toggle (Desktop Only) */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex w-full mt-1 p-2 items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-lg transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <div className="flex items-center gap-2 text-xs font-medium"><ChevronRight className="w-4 h-4 rotate-180" /> Collapse Sidebar</div>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 pt-16 md:pt-0 pb-[env(safe-area-inset-bottom)]">
        {/* Pull-to-refresh indicator */}
        <div
          className={cn(
            "md:hidden flex items-center justify-center overflow-hidden transition-all duration-200",
            darkMode ? "text-slate-400" : "text-slate-500"
          )}
          style={{ height: pullDistance > 0 ? `${pullDistance}px` : 0 }}
        >
          <div className={cn(
            "flex items-center gap-2 text-xs font-medium",
            (isPulling || isRefreshing) && "text-indigo-600"
          )}>
            <RotateCcw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? 'Refreshing…' : isPulling ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        </div>
        <div className="p-4 sm:p-6 lg:p-6 pb-24 md:pb-8">
          <AnimatePresence mode="wait">
          {currentView === 'dashboard' && !selectedDealId && (
            <motion.div key="dashboard" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <div className="mb-8">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Executive Dashboard</h1>
                <p className="text-slate-500">Welcome back. Here's your pipeline overview.</p>
              </div>
              <DashboardView
                transactions={activeTransactions}
                leads={leads}
                actionLog={actionLog}
                onSelectDeal={handleSelectDeal}
                onSelectLead={handleSelectLead}
                onAddReminder={handleAddReminder}
                onNavigate={setCurrentView}
                onNavigateToInbox={() => setCurrentView('inbox')}
                inboxItems={inboxItems}
                darkMode={darkMode}
                bulletinItems={bulletinItems}
                onAddBulletinItem={handleAddBulletinItem}
                onToggleBulletinItem={handleToggleBulletinItem}
                onDeleteBulletinItem={handleDeleteBulletinItem}
                onUpdateTransaction={handleUpdateTransaction}
              />
            </motion.div>
          )}

          {currentView === 'pipeline' && !selectedDealId && (
            <motion.div key="pipeline" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <PipelineView
                transactions={activeTransactions}
                onSelectDeal={handleSelectDeal}
                onDeleteDeal={handleDeleteTransaction}
                onBatchDelete={handleBatchDelete}
                onUpdateTransaction={handleUpdateTransaction}
              />
            </motion.div>
          )}

          {currentView === 'leads' && !selectedLeadId && (
            <motion.div key="leads" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <LeadsView
                leads={activeLeads}
                onSelectLead={handleSelectLead}
                onDeleteLead={handleDeleteLead}
                onBatchDelete={handleBatchDeleteLeads}
                onUpdateLead={handleUpdateLead}
                onConvertLeadToTransaction={handleConvertLeadToTransaction}
              />
            </motion.div>
          )}

          {currentView === 'reports' && !selectedDealId && (
            <motion.div key="reports" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <ReportsView
                transactions={activeTransactions}
                leads={activeLeads}
                contacts={allContacts}
                preferences={preferences}
                darkMode={darkMode}
              />
            </motion.div>
          )}

          {currentView === 'contacts' && (
            <motion.div key="contacts" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <ContactsView
                contacts={allContacts}
                selectedContactId={selectedContactId}
                onSelectContact={handleSelectContact}
                onBack={() => setSelectedContactId(null)}
                onSelectDeal={handleSelectDeal}
                onSelectLead={handleSelectLead}
                onAddContact={handleAddStandaloneContact}
                onUpdateContact={handleUpdateStandaloneContact}
                onMerge={handleMergeContacts}
              />
            </motion.div>
          )}

          {currentView === 'import' && !selectedDealId && (
            <motion.div key="import" variants={pageVariants} initial="initial" animate="animate" exit="exit">
               <DataManagementView
                 transactions={activeTransactions}
                 leads={leads}
                 onUpdateTransaction={handleUpdateTransaction}
                 onUpdateLead={handleUpdateLead}
                 onImport={handleImportTransactions}
                 onImportLeads={handleImportLeads}
               />
            </motion.div>
          )}

          {currentView === 'recent-actions' && !selectedDealId && (
            <motion.div key="recent-actions" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <RecentActionsView
                actions={actionLog}
                onSelectDeal={handleSelectDeal}
                onSelectLead={handleSelectLead}
                onUndo={handleUndo}
              />
            </motion.div>
          )}

          {currentView === 'inbox' && !selectedDealId && (
            <motion.div key="inbox" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <InboxView
                items={inboxItems}
                transactions={activeTransactions}
                leads={activeLeads}
                onMarkRead={handleMarkInboxRead}
                onDelete={handleDeleteInboxItem}
                onAssign={handleAssignEmail}
                onSelectDeal={handleSelectDeal}
                onSelectLead={handleSelectLead}
                darkMode={darkMode}
              />
            </motion.div>
          )}

          {currentView === 'deleted' && !selectedDealId && (
            <motion.div key="deleted" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <div className="mb-8">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Recently Deleted</h1>
                <p className="text-slate-500">Restore or permanently delete items.</p>
              </div>
              <RecentlyDeletedView
                transactions={deletedTransactions}
                leads={deletedLeads}
                onRestore={handleRestoreTransaction}
                onPermanentDelete={handlePermanentDeleteTransaction}
                onRestoreLead={handleRestoreLead}
                onPermanentDeleteLead={handlePermanentDeleteLead}
              />
            </motion.div>
          )}

          {currentView === 'detail' && selectedTransaction && (
            <motion.div key={`detail-${selectedTransaction.id}`} variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <TransactionDetailView
                transaction={selectedTransaction}
                onSave={handleUpdateTransaction}
                onClose={() => { setSelectedDealId(null); setCurrentView('pipeline'); }}
                contacts={allContacts}
                onSelectContact={(contactId) => {
                  setSelectedContactId(contactId);
                  setSelectedDealId(null);
                  setCurrentView('contacts');
                }}
              />
            </motion.div>
          )}

          {currentView === 'leads' && selectedLead && (
            <motion.div key={`lead-detail-${selectedLead.id}`} variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <LeadDetailView
                lead={selectedLead}
                onSave={(updatedLead) => { handleUpdateLead(updatedLead); }}
                onClose={() => { setSelectedLeadId(null); }}
                onSelectContact={(contactId) => {
                  setSelectedContactId(contactId);
                  setSelectedLeadId(null);
                  setCurrentView('contacts');
                }}
              />
            </motion.div>
          )}

          {currentView === 'settings' && (
            <motion.div key="settings" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <SettingsView
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode(d => { const next = !d; try { localStorage.setItem('darkMode', String(next)); } catch {} return next; })}
                preferences={preferences}
                onSavePreferences={savePreferences}
                onLogout={handleLogout}
                authEnabled={AUTH_ENABLED_CLIENT}
              />
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Modals */}
      <NewTransactionModal
        isOpen={isNewDealModalOpen}
        onClose={() => setIsNewDealModalOpen(false)}
        onSave={handleCreateTransaction}
        contacts={allContacts}
      />

      <ConfirmDialog 
        isOpen={deleteConfirmation.isOpen}
        title={
            deleteConfirmation.target === 'lead' 
            ? "Delete Lead(s)?" 
            : deleteConfirmation.type === 'permanent' ? "Delete Permanently?" : "Move to Trash?"
        }
        message={
          deleteConfirmation.target === 'lead'
            ? `Are you sure you want to permanently delete ${deleteConfirmation.ids.length > 1 ? `${deleteConfirmation.ids.length} leads` : 'this lead'}? This action cannot be undone.`
            : deleteConfirmation.type === 'permanent' 
              ? "This action cannot be undone. This transaction will be permanently removed."
              : deleteConfirmation.type === 'batch'
                ? `Are you sure you want to move ${deleteConfirmation.ids.length} transactions to Recently Deleted?`
                : "Are you sure you want to move this transaction to Recently Deleted? You can restore it later."
        }
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentView={currentView}
        selectedDealId={selectedDealId}
        selectedLeadId={selectedLeadId}
        onNavigate={(view) => {
          setCurrentView(view);
          setSelectedDealId(null);
          setSelectedLeadId(null);
          setSelectedContactId(null);
          setIsMobileMenuOpen(false);
        }}
        onNewDeal={() => {
          setIsNewDealModalOpen(true);
          setIsMobileMenuOpen(false);
        }}
        darkMode={darkMode}
        inboxUnreadCount={inboxUnreadCount}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Onboarding */}
      {showOnboarding && (
        <OnboardingModal onComplete={() => {
          setShowOnboarding(false);
          try { localStorage.setItem('onboarding_done', 'true'); } catch {}
        }} />
      )}

      {/* Page Tutorial */}
      {showTutorial && (
        <TutorialModal
          pageKey={selectedDealId ? 'deal-detail' : selectedLeadId ? 'lead-detail' : currentView}
          onComplete={() => setShowTutorial(false)}
        />
      )}

      {/* Floating Help Button */}
      {!showTutorial && !showOnboarding && (
        <button
          onClick={() => setShowTutorial(true)}
          title="Page Help"
          className={cn(
            "fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 text-sm font-medium",
            darkMode
              ? "bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          )}
        >
          <HelpCircle className="w-4 h-4 text-indigo-500" />
          <span className="hidden sm:inline">Help</span>
        </button>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
