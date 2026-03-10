import React, { useState, useMemo, useEffect } from 'react';
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
  ChevronLeft
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
  url?: string; // In a real app, this would be a URL. For now we might use blob URLs.
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

interface ContactSource {
  type: 'transaction-buyer' | 'transaction-seller' | 'transaction-party' | 'lead';
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

interface Lead {
  id: string;
  type: string;
  projectName: string;
  contactName: string;
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
}

interface Transaction {
  id: string;
  dealName: string;
  stage: PipelineStage;
  price: number;
  grossCommissionPercent: number;
  laoCutPercent: number;
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

// --- Validation Helpers ---

function getMissingTransactionFields(t: Transaction): { key: string; label: string }[] {
  const missing: { key: string; label: string }[] = [];
  if (!t.buyer?.name) missing.push({ key: 'buyer.name', label: 'Buyer' });
  if (!t.seller?.name) missing.push({ key: 'seller.name', label: 'Seller' });
  if (!t.coeDate) missing.push({ key: 'coeDate', label: 'COE Date' });
  if (!t.price) missing.push({ key: 'price', label: 'Price' });
  if (t.grossCommissionPercent === undefined || t.grossCommissionPercent === null) missing.push({ key: 'grossCommissionPercent', label: 'Gross Comm %' });
  if (t.laoCutPercent === undefined || t.laoCutPercent === null) missing.push({ key: 'laoCutPercent', label: 'LAO Cut %' });
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

// --- Business Logic Hook ---

function useCommissionMath(transaction: Transaction) {
  return useMemo(() => {
    const grossCommission = transaction.price * (transaction.grossCommissionPercent / 100);
    const laoCut = grossCommission * (transaction.laoCutPercent / 100);
    const netCommission = grossCommission - laoCut;
    const treyTake = netCommission * (transaction.treySplitPercent / 100);
    const kirkTake = netCommission * (transaction.kirkSplitPercent / 100);

    return {
      grossCommission,
      laoCut,
      netCommission,
      treyTake,
      kirkTake
    };
  }, [transaction.price, transaction.grossCommissionPercent, transaction.laoCutPercent, transaction.treySplitPercent, transaction.kirkSplitPercent]);
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

        {documents.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
            <File className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No documents uploaded</p>
            <p className="text-xs text-slate-400 mt-1">Upload PSAs, LOIs, and other deal docs here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
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
      laoCutPercent: parsePercent(row['LAO Split']),
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
    const l: Lead = {
      id: Math.random().toString(36).substr(2, 9),
      type: row['Lead Type']?.trim() || 'True Lead',
      projectName: row['Project Name'] || `Lead ${index + 1}`,
      contactName: row['Contact'] || '',
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
                                        <td className="px-3 py-2">{l.type}</td>
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
          </div>
    </div>
  );
};

const DashboardView = ({ transactions, leads, onSelectDeal, onSelectLead, onAddReminder, darkMode }: { transactions: Transaction[], leads: Lead[], onSelectDeal: (id: string) => void, onSelectLead: (id: string) => void, onAddReminder?: (targetId: string, targetType: 'transaction' | 'lead', reminder: LeadReminder) => void, darkMode?: boolean }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showQuickReminder, setShowQuickReminder] = useState(false);
  const [quickReminderTarget, setQuickReminderTarget] = useState<{ id: string, type: 'transaction' | 'lead' }>({ id: '', type: 'transaction' });
  const [quickReminderDate, setQuickReminderDate] = useState('');
  const [quickReminderDesc, setQuickReminderDesc] = useState('');
  const [notesSearch, setNotesSearch] = useState('');

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
      const net = gross - (gross * (t.laoCutPercent / 100));
      return sum + (net * (t.treySplitPercent / 100));
    }, 0);

    const projectedKirk = activeDeals.reduce((sum, t) => {
      const gross = t.price * (t.grossCommissionPercent / 100);
      const net = gross - (gross * (t.laoCutPercent / 100));
      return sum + (net * (t.kirkSplitPercent / 100));
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
      const net = gross - (gross * (t.laoCutPercent / 100));
      return sum + (net * (t.treySplitPercent / 100));
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
        'Converted Lead': activeLeads.filter(l => l.type === 'Converted Lead (Escrow)').length,
        'Live Contract': activeLeads.filter(l => l.type === 'Live Contract').length,
        'True Lead': activeLeads.filter(l => l.type === 'True Lead').length,
        'Dead Deal': activeLeads.filter(l => l.type === 'Dead Deal').length,
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
          const net = gross - (gross * (t.laoCutPercent / 100));
          trey += net * (t.treySplitPercent / 100);
          kirk += net * (t.kirkSplitPercent / 100);
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
        const net = gross - (gross * (t.laoCutPercent / 100));
        return {
          name: t.dealName.length > 15 ? t.dealName.substring(0, 15) + '...' : t.dealName,
          trey: Math.round(net * (t.treySplitPercent / 100)),
          kirk: Math.round(net * (t.kirkSplitPercent / 100)),
          lao: Math.round(gross * (t.laoCutPercent / 100)),
        };
      })
      .sort((a, b) => (b.trey + b.kirk + b.lao) - (a.trey + a.kirk + a.lao))
      .slice(0, 6);
  }, [transactions]);

  // Lead conversion funnel
  const leadFunnel = useMemo(() => {
    const allLeads = leads.filter(l => !l.isDeleted);
    return [
      { name: 'True Lead', count: allLeads.filter(l => l.type === 'True Lead').length, color: '#f59e0b' },
      { name: 'Live Contract', count: allLeads.filter(l => l.type === 'Live Contract').length, color: '#6366f1' },
      { name: 'Converted', count: allLeads.filter(l => l.type === 'Converted Lead (Escrow)').length, color: '#10b981' },
      { name: 'Dead', count: allLeads.filter(l => l.type === 'Dead Deal').length, color: '#94a3b8' },
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
  };

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

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Bento Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between min-h-[160px]">
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Active Pipeline Value</p>
                <h3 className="text-3xl font-bold tracking-tight">{formatCurrency(metrics.activePipelineValue)}</h3>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mt-4">
                <TrendingUp className="w-4 h-4" />
                <span>Gross Potential Commission</span>
            </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[160px]">
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

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[160px]">
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
                                    stage === 'Converted Lead' ? "bg-emerald-500" : stage === 'Live Contract' ? "bg-indigo-500" : stage === 'True Lead' ? "bg-amber-500" : "bg-slate-400"
                                )} 
                                style={{ width: `${((count as number) / metrics.leadCount) * 100}%` }} 
                            />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 truncate">{stage === 'Converted Lead' ? 'Converted' : stage === 'Live Contract' ? 'Contract' : stage === 'True Lead' ? 'Lead' : 'Dead'}</span>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between min-h-[160px]">
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

          {/* Deal Calendar — month nav is shared with widget above */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <CalendarIcon className="w-4 h-4 text-slate-500" /> Deal Calendar
              </h2>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <span className="text-xs font-bold w-28 text-center uppercase tracking-tighter">{format(currentDate, 'MMMM yyyy')}</span>
                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                  <ChevronRight className="w-4 h-4" />
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

          {/* Recent Activity Feed with Notes Search */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider shrink-0">
                <History className="w-4 h-4 text-slate-500" /> {notesSearch ? 'Notes Search' : 'Recent Developments'}
              </h2>
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
            </div>
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {displayedActivity.length === 0 ? (
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
        <div className="flex flex-col gap-6">
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
        </div>
      </div>

    {/* Quick Add Reminder Modal */}
    {showQuickReminder && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowQuickReminder(false)}>
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Add Reminder</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Deal or Lead</label>
              <select
                value={`${quickReminderTarget.type}:${quickReminderTarget.id}`}
                onChange={e => {
                  const [type, id] = e.target.value.split(':');
                  setQuickReminderTarget({ type: type as 'transaction' | 'lead', id });
                }}
                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="transaction:">Select...</option>
                <optgroup label="Deals">
                  {transactions.filter(t => !t.isDeleted).map(t => (
                    <option key={t.id} value={`transaction:${t.id}`}>{t.dealName}</option>
                  ))}
                </optgroup>
                <optgroup label="Leads">
                  {leads.filter(l => !l.isDeleted).map(l => (
                    <option key={l.id} value={`lead:${l.id}`}>{l.projectName}</option>
                  ))}
                </optgroup>
              </select>
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
            <button onClick={() => setShowQuickReminder(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">Cancel</button>
            <button onClick={handleQuickReminderSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors" disabled={!quickReminderTarget.id || !quickReminderDate || !quickReminderDesc.trim()}>Add Reminder</button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

const LeadsView = ({
  leads,
  onSelectLead,
  onDeleteLead,
  onBatchDelete,
  onUpdateLead
}: {
  leads: Lead[],
  onSelectLead: (id: string) => void,
  onDeleteLead: (id: string) => void,
  onBatchDelete: (ids: string[]) => void,
  onUpdateLead?: (l: Lead) => void
}) => {
  const [search, setSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(['True Lead', 'Live Contract', 'Converted Lead (Escrow)', 'Dead Deal']));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [incompleteFilter, setIncompleteFilter] = useState(false);
  const [drawerLeads, setDrawerLeads] = useState<Lead[] | null>(null);

  const toggleTypeFilter = (type: string) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedTypes(newSet);
  };

  const incompleteCount = useMemo(
    () => leads.filter(l => getMissingLeadFields(l).length > 0).length,
    [leads]
  );

  const filteredLeads = useMemo(() => {
    let data = [...leads];

    if (selectedTypes.size > 0) {
      data = data.filter(l => selectedTypes.has(l.type));
    } else {
      data = [];
    }

    if (incompleteFilter) {
      data = data.filter(l => getMissingLeadFields(l).length > 0);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      data = data.filter(l =>
        l.projectName.toLowerCase().includes(lowerSearch) ||
        l.contactName.toLowerCase().includes(lowerSearch) ||
        l.details.toLowerCase().includes(lowerSearch) ||
        l.summary.toLowerCase().includes(lowerSearch)
      );
    }

    if (sortConfig) {
      data.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Lead];
        let bValue: any = b[sortConfig.key as keyof Lead];

        if (sortConfig.key === 'lastSpokeDate') {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [leads, search, sortConfig, selectedTypes, incompleteFilter]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads Tracker</h1>
          <p className="text-slate-500">Manage and track your potential deals.</p>
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
            onClick={() => {
              const headers = ['Type', 'Project Name', 'Contact', 'Details', 'Last Spoke', 'Summary'];
              const rows = filteredLeads.map(l => [l.type, l.projectName, l.contactName, l.details, l.lastSpokeDate || '', l.summary]);
              const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'leads_export.csv';
              a.click();
            }}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200 shrink-0"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400 mr-1 shrink-0" />
        {(['True Lead', 'Live Contract', 'Converted Lead (Escrow)', 'Dead Deal'] as const).map(type => (
          <button
            key={type}
            onClick={() => toggleTypeFilter(type)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap border",
              selectedTypes.has(type)
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            {type}
          </button>
        ))}
        {incompleteCount > 0 && (
          <button
            onClick={() => setIncompleteFilter(!incompleteFilter)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
              incompleteFilter
                ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
            )}
          >
            <AlertTriangle className="w-3 h-3" />
            {incompleteCount} incomplete
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 w-10 bg-slate-50">
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && selectedIds.size === filteredLeads.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-700 bg-slate-50" onClick={() => handleSort('type')}>
                    <div className="flex items-center gap-1">Type <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-700 bg-slate-50" onClick={() => handleSort('projectName')}>
                    <div className="flex items-center gap-1">Project Name <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-700 bg-slate-50" onClick={() => handleSort('contactName')}>
                    <div className="flex items-center gap-1">Contact <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3 bg-slate-50">Details</th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-700 bg-slate-50" onClick={() => handleSort('lastSpokeDate')}>
                    <div className="flex items-center gap-1">Contact Age <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3 bg-slate-50">Summary</th>
                <th className="px-4 py-3 w-10 bg-slate-50"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => {
                const missingFields = getMissingLeadFields(lead);
                return (
                    <tr
                      key={lead.id}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('input[type="checkbox"]') || (e.target as HTMLElement).closest('button')) return;
                        onSelectLead(lead.id);
                      }}
                      className={cn(
                        "hover:bg-slate-50 transition-colors group cursor-pointer",
                        selectedIds.has(lead.id) && "bg-indigo-50/50",
                        missingFields.length > 0 && "border-l-2 border-l-amber-300"
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelection(lead.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                          lead.type.includes('Converted') ? "bg-emerald-100 text-emerald-700" :
                          lead.type.includes('Live') ? "bg-blue-100 text-blue-700" :
                          lead.type.includes('True') ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {lead.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{lead.projectName}</td>
                      <td className="px-4 py-3 text-slate-600">{lead.contactName}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate" title={lead.details}>{lead.details}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(() => {
                          if (!lead.lastSpokeDate) return <span className="text-slate-400 text-xs">Never</span>;
                          const days = Math.floor((new Date().getTime() - parseISO(lead.lastSpokeDate).getTime()) / 86400000);
                          const label = days === 0 ? 'Today' : days === 1 ? '1d ago' : `${days}d ago`;
                          const color = days <= 7 ? 'bg-emerald-50 text-emerald-700' : days <= 30 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
                          return <span className={cn("px-2 py-1 rounded-full text-xs font-semibold", color)}>{label}</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[250px] truncate" title={lead.summary}>{lead.summary}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {missingFields.length > 0 && onUpdateLead && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDrawerLeads([lead]); }}
                              className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                              title={`Missing: ${missingFields.map(f => f.label).join(', ')}`}
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteLead(lead.id); }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredLeads.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <p>No leads found matching your search.</p>
          </div>
        )}
      </div>

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-full shadow-2xl z-50 animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-medium pr-1">{selectedIds.size} selected</span>
          <div className="w-px h-4 bg-slate-600" />
          {onUpdateLead && (
            <button
              onClick={() => setDrawerLeads(filteredLeads.filter(l => selectedIds.has(l.id)))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full text-xs font-medium transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              Bulk Edit
            </button>
          )}
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
      {drawerLeads && onUpdateLead && (
        <QuickEditLeadDrawer
          leads={drawerLeads}
          onSave={(updated) => updated.forEach(l => onUpdateLead(l))}
          onClose={() => setDrawerLeads(null)}
        />
      )}
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
  const goToContact = (name: string, email?: string) => {
    if (!onSelectContact || !name.trim()) return;
    const id = email?.trim().toLowerCase() || name.trim().toLowerCase();
    onSelectContact(id);
  };
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  // Timeline State
  const [newNote, setNewNote] = useState('');
  const [newNoteDate, setNewNoteDate] = useState(new Date().toISOString().slice(0, 16)); // YYYY-MM-DDTHH:mm
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [editingNoteDate, setEditingNoteDate] = useState('');

  // Contact State
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState<LeadContact>({ id: '', name: '', role: '', phone: '', email: '' });

  // Reminder State
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newReminder, setNewReminder] = useState<LeadReminder>({ id: '', date: '', description: '', completed: false });

  // Mobile tab navigation (info | activity | details)
  const [mobileLeadTab, setMobileLeadTab] = useState<'info' | 'activity' | 'details'>('activity');

  useEffect(() => {
    setFormData(lead);
  }, [lead]);

  const handleInputChange = (field: keyof Lead, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  // --- Timeline Logic ---
  const addNote = () => {
    if (!newNote.trim()) return;
    
    const note: Note = {
      id: Math.random().toString(36).substr(2, 9),
      content: newNote,
      date: new Date(newNoteDate).toISOString()
    };

    setFormData(prev => ({
      ...prev,
      notesLog: [note, ...(prev.notesLog || [])],
      lastSpokeDate: new Date(newNoteDate).toISOString() // Auto update last spoke date
    }));
    setNewNote('');
    setNewNoteDate(new Date().toISOString().slice(0, 16));
  };

  const deleteNote = (noteId: string) => {
    setFormData(prev => ({
        ...prev,
        notesLog: prev.notesLog?.filter(n => n.id !== noteId) || []
    }));
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
        notesLog: prev.notesLog?.map(n => 
            n.id === editingNoteId 
                ? { ...n, content: editingNoteContent, date: new Date(editingNoteDate).toISOString() }
                : n
        ) || []
    }));
    setEditingNoteId(null);
  };

  // --- Contact Logic ---
  const addContact = () => {
    if (!newContact.name) return;
    const contact: LeadContact = { ...newContact, id: Math.random().toString(36).substr(2, 9) };
    setFormData(prev => ({
        ...prev,
        contacts: [...(prev.contacts || []), contact]
    }));
    setNewContact({ id: '', name: '', role: '', phone: '', email: '' });
    setIsAddingContact(false);
  };

  const deleteContact = (id: string) => {
      setFormData(prev => ({
          ...prev,
          contacts: prev.contacts?.filter(c => c.id !== id) || []
      }));
  };

  // --- Reminder Logic ---
  const addReminder = () => {
      if (!newReminder.date || !newReminder.description) return;
      const reminder: LeadReminder = { ...newReminder, id: Math.random().toString(36).substr(2, 9) };
      setFormData(prev => ({
          ...prev,
          reminders: [...(prev.reminders || []), reminder]
      }));
      setNewReminder({ id: '', date: '', description: '', completed: false });
      setIsAddingReminder(false);
  };

  const toggleReminder = (id: string) => {
      setFormData(prev => ({
          ...prev,
          reminders: prev.reminders?.map(r => 
            r.id === id ? { ...r, completed: !r.completed } : r
          ) || []
      }));
  };

  const deleteReminder = (id: string) => {
      setFormData(prev => ({
          ...prev,
          reminders: prev.reminders?.filter(r => r.id !== id) || []
      }));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-300 flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50 p-4 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-slate-900 text-lg">{formData.projectName || 'Untitled Lead'}</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className={cn(
                "w-2 h-2 rounded-full",
                formData.type.includes('Converted') ? "bg-emerald-500" :
                formData.type.includes('Live') ? "bg-blue-500" :
                formData.type.includes('True') ? "bg-amber-500" :
                "bg-slate-400"
              )} />
              {formData.type}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showSaveSuccess && (
            <span className="text-sm text-emerald-600 font-medium animate-in fade-in">Saved!</span>
          )}
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="flex border-b border-slate-200 bg-white lg:hidden shrink-0">
        {([['info', 'Info & Contacts'], ['activity', 'Activity'], ['details', 'Reminders']] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setMobileLeadTab(tab)}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors relative",
              mobileLeadTab === tab ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {label}
            {mobileLeadTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 divide-x divide-slate-200">
            {/* Left Column: Info & Contacts */}
            <div className={cn("lg:col-span-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50", mobileLeadTab !== 'info' ? "hidden lg:block" : "")}>
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4" /> Lead Information
                    </h3>
                    
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Lead Type</label>
                            <select 
                                value={formData.type} 
                                onChange={e => handleInputChange('type', e.target.value)}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {['True Lead', 'Live Contract', 'Converted Lead (Escrow)', 'Dead Deal'].map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Project Name</label>
                            <input 
                                type="text" 
                                value={formData.projectName} 
                                onChange={e => handleInputChange('projectName', e.target.value)}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Primary Contact</label>
                            <input 
                                type="text" 
                                value={formData.contactName} 
                                onChange={e => handleInputChange('contactName', e.target.value)}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Users className="w-4 h-4" /> Additional Contacts
                        </h3>
                        <button 
                            onClick={() => setIsAddingContact(true)}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                        >
                            <Plus className="w-3 h-3" /> Add
                        </button>
                    </div>

                    <div className="space-y-3">
                        {formData.contacts?.map(contact => (
                            <div key={contact.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm group relative">
                                <button 
                                    onClick={() => deleteContact(contact.id)}
                                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                {onSelectContact && contact.name
                                  ? <button onClick={() => goToContact(contact.name, contact.email)} className="font-medium text-slate-900 hover:text-indigo-600 transition-colors text-left">{contact.name}</button>
                                  : <div className="font-medium text-slate-900">{contact.name}</div>}
                                <div className="text-xs text-slate-500">{contact.role}</div>
                                <div className="mt-2 space-y-1">
                                    {contact.phone && (
                                        <div className="text-xs text-slate-600 flex items-center gap-2">
                                            <Phone className="w-3 h-3 text-slate-400" /> {contact.phone}
                                        </div>
                                    )}
                                    {contact.email && (
                                        <div className="text-xs text-slate-600 flex items-center gap-2">
                                            <Mail className="w-3 h-3 text-slate-400" /> {contact.email}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        
                        {isAddingContact && (
                            <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-sm space-y-2 animate-in fade-in">
                                <input 
                                    placeholder="Name"
                                    className="w-full p-1.5 text-sm border border-slate-200 rounded"
                                    value={newContact.name}
                                    onChange={e => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                                />
                                <input 
                                    placeholder="Role (e.g. CEO)"
                                    className="w-full p-1.5 text-sm border border-slate-200 rounded"
                                    value={newContact.role}
                                    onChange={e => setNewContact(prev => ({ ...prev, role: e.target.value }))}
                                />
                                <input 
                                    placeholder="Phone"
                                    className="w-full p-1.5 text-sm border border-slate-200 rounded"
                                    value={newContact.phone}
                                    onChange={e => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                                />
                                <input 
                                    placeholder="Email"
                                    className="w-full p-1.5 text-sm border border-slate-200 rounded"
                                    value={newContact.email}
                                    onChange={e => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                                />
                                <div className="flex justify-end gap-2 pt-2">
                                    <button onClick={() => setIsAddingContact(false)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                                    <button onClick={addContact} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">Add</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Middle Column: Activity Timeline */}
            <div className={cn("lg:col-span-1 overflow-y-auto p-6 bg-white flex flex-col", mobileLeadTab !== 'activity' ? "hidden lg:flex" : "")}>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <History className="w-4 h-4" /> Activity Timeline
                </h3>

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

            {/* Right Column: Reminders & Details */}
            <div className={cn("lg:col-span-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50", mobileLeadTab !== 'details' ? "hidden lg:block" : "")}>
                {/* Reminders Widget */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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

                {/* Details & Summary */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Details & Context</h3>
                    
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Lead Details</label>
                        <textarea 
                            value={formData.details} 
                            onChange={e => handleInputChange('details', e.target.value)}
                            className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
                            placeholder="Requirements, budget, location preferences..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Discussion Summary</label>
                        <textarea 
                            value={formData.summary} 
                            onChange={e => handleInputChange('summary', e.target.value)}
                            className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
                            placeholder="High level summary of where things stand..."
                        />
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
  const [grossCommPct, setGrossCommPct] = useState(isBulk ? '' : (t0.grossCommissionPercent != null ? String(t0.grossCommissionPercent) : ''));
  const [laoCutPct, setLaoCutPct] = useState(isBulk ? '' : (t0.laoCutPercent != null ? String(t0.laoCutPercent) : ''));
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
      { label: 'Gross Commission %', hasValue: t => t.grossCommissionPercent != null, newValFilled: !!grossCommPct },
      { label: 'LAO Cut %', hasValue: t => t.laoCutPercent != null, newValFilled: !!laoCutPct },
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
      if (!isBulk || grossCommPct) next = { ...next, grossCommissionPercent: grossCommPct !== '' ? parseFloat(grossCommPct) : next.grossCommissionPercent };
      if (!isBulk || laoCutPct) next = { ...next, laoCutPercent: laoCutPct !== '' ? parseFloat(laoCutPct) : next.laoCutPercent };
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
        <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between p-5 border-b border-slate-200">
            <div>
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Confirm Overrides
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Some deals already have values for these fields.</p>
            </div>
            <button onClick={() => setShowOverrideConfirm(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
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
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-900">
              {isBulk ? `Bulk Edit — ${transactions.length} deals` : transactions[0].dealName}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isBulk ? 'Values applied to all selected deals. Leave blank to skip.' : 'Edit fields below. Amber fields are currently missing.'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
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
                  LAO Cut %
                  {!isBulk && missingKeys.has('laoCutPercent') && <span className="text-amber-500">*</span>}
                </label>
                <input type="number" value={laoCutPct} onChange={e => setLaoCutPct(e.target.value)}
                  className={inputClass(!isBulk && missingKeys.has('laoCutPercent'))} placeholder="0" min="0" max="100" step="0.5" />
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
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSaveClick} className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
            Save Changes
          </button>
        </div>
      </div>
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
        <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between p-5 border-b border-slate-200">
            <div>
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Confirm Overrides
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Some leads already have values for these fields.</p>
            </div>
            <button onClick={() => setShowOverrideConfirm(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
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
            <button onClick={applySave} className="flex-1 px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium">
              Confirm & Save
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-900">
              {isBulk ? `Bulk Edit — ${leads.length} leads` : l0.projectName || 'Edit Lead'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isBulk ? 'Values applied to all selected leads. Leave blank to skip.' : 'Edit fields below. Amber fields are currently missing.'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
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
          <button onClick={handleSaveClick} className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
            Save Changes
          </button>
        </div>
      </div>
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
  const [dragDealId, setDragDealId] = useState<string | null>(null);
  const [incompleteFilter, setIncompleteFilter] = useState(false);
  const [drawerTransactions, setDrawerTransactions] = useState<Transaction[] | null>(null);

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
    const headers = ['Year', 'Stage', 'Deal Name', 'Buyer', 'Seller', 'Price', 'Base %', 'LAO %', 'Trey %', 'Kirk %', 'Feas Date', 'COE Date', 'PID'];
    const rows = filteredData.map(d => [
      d.projectYear || '', d.stage, d.dealName, d.buyer.name, d.seller.name,
      d.price, d.grossCommissionPercent, d.laoCutPercent, d.treySplitPercent, d.kirkSplitPercent,
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
    <div className="space-y-4">
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-col gap-4 bg-slate-50">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <List className="w-5 h-5 text-slate-500" />
            All Transactions
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search deals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('table')} className={cn("p-2 transition-colors", viewMode === 'table' ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-50")} title="Table View">
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('kanban')} className={cn("p-2 transition-colors", viewMode === 'kanban' ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-50")} title="Kanban View">
                <Columns3 className="w-4 h-4" />
              </button>
            </div>
            <button onClick={exportCSV} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200" title="Export CSV">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                <Filter className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                {(['LOI', 'Contract', 'Escrow', 'Closed', 'Option'] as const).map(stage => (
                    <button
                    key={stage}
                    onClick={() => toggleStageFilter(stage)}
                    className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap border",
                        selectedStages.has(stage)
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                    >
                    {stage}
                    </button>
                ))}
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">Year:</span>
                    <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                        <option value="All">All</option>
                        {uniqueYears.map(year => (
                            <option key={year} value={year as string}>{year}</option>
                        ))}
                    </select>
                </div>

                {incompleteCount > 0 && (
                  <button
                    onClick={() => setIncompleteFilter(!incompleteFilter)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                      incompleteFilter
                        ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                        : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    )}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {incompleteCount} incomplete
                  </button>
                )}
            </div>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
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
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('buyer')}>
                  <div className="flex items-center">Buyer <SortIcon columnKey="buyer" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700 bg-slate-50" onClick={() => handleSort('seller')}>
                  <div className="flex items-center">Seller <SortIcon columnKey="seller" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700 text-right bg-slate-50" onClick={() => handleSort('price')}>
                  <div className="flex items-center justify-end">Price <SortIcon columnKey="price" /></div>
              </th>
              <th className="px-4 py-3 text-right bg-slate-50">Gross Comm</th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700 bg-slate-50" onClick={() => handleSort('coeDate')}>
                  <div className="flex items-center">COE Date <SortIcon columnKey="coeDate" /></div>
              </th>
              <th className="px-4 py-3 w-10 bg-slate-50"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map((deal) => {
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
                  <td className="px-4 py-3 text-slate-600 max-w-[110px] truncate" title={deal.buyer.name}>{deal.buyer.name || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[110px] truncate" title={deal.seller.name}>{deal.seller.name || '-'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{formatCurrency(deal.price)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">{formatCurrency(grossComm)}</td>
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
                  <td colSpan={6} className="px-4 py-3 text-slate-400 uppercase tracking-wider">
                    {filteredData.length} deal{filteredData.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalPrice)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatCurrency(totalGross)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            );
          })()}
        </table>
      </div>
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
              <div className="space-y-2">
                {stageDeals.map(deal => {
                  const missingFields = getMissingTransactionFields(deal);
                  const grossComm = deal.price * (deal.grossCommissionPercent / 100);
                  return (
                    <div
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
                    </div>
                  );
                })}
              </div>
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
    {drawerTransactions && onUpdateTransaction && (
      <QuickEditTransactionDrawer
        transactions={drawerTransactions}
        onSave={(updated) => updated.forEach(t => onUpdateTransaction(t))}
        onClose={() => setDrawerTransactions(null)}
      />
    )}
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
  const buyers = [transaction.buyer, ...transaction.otherParties.filter(p => p.side === 'buyer')];
  const sellers = [transaction.seller, ...transaction.otherParties.filter(p => p.side === 'seller')];
  const thirds = transaction.otherParties.filter(p => !p.side || p.side === 'third-party');
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

// Helper to derive all contacts from transactions + leads
function deriveContacts(transactions: Transaction[], leads: Lead[]): DerivedContact[] {
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
        upsert(p.name, p.entity, p.email, p.phone, p.role || 'Other', {
          type: 'transaction-party', id: t.id, label: t.dealName, role: p.role, stage: t.stage, coeDate: t.coeDate
        }, dateHint);
      }
    }
  }

  for (const l of leads) {
    if (l.isDeleted) continue;
    if (l.contactName) {
      // Also pull in any lead contacts
      const lc = l.contacts?.find(c => c.name === l.contactName);
      upsert(l.contactName, undefined, lc?.email, lc?.phone, 'Lead Contact', {
        type: 'lead', id: l.id, label: l.projectName || l.contactName, role: 'Lead Contact'
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

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

const ContactDetailView = ({
  contact,
  onBack,
  onSelectDeal,
  onSelectLead,
}: {
  contact: DerivedContact;
  onBack: () => void;
  onSelectDeal: (id: string) => void;
  onSelectLead: (id: string) => void;
}) => {
  const txSources = contact.sources.filter(s => s.type !== 'lead');
  const leadSources = contact.sources.filter(s => s.type === 'lead');
  const initials = contact.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

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
            <h1 className="text-2xl font-bold text-slate-900">{contact.name}</h1>
            {contact.entity && <p className="text-slate-500 text-sm mt-0.5">{contact.entity}</p>}
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full">{contact.primaryRole}</span>
              {contact.sources.length > 1 && (
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">{contact.sources.length} associations</span>
              )}
            </div>
          </div>
        </div>

        {/* Contact info */}
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
}: {
  contacts: DerivedContact[];
  selectedContactId: string | null;
  onSelectContact: (id: string) => void;
  onBack: () => void;
  onSelectDeal: (id: string) => void;
  onSelectLead: (id: string) => void;
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Buyer' | 'Seller' | 'Other' | 'Lead Contact'>('all');

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  if (selectedContact) {
    return (
      <ContactDetailView
        contact={selectedContact}
        onBack={onBack}
        onSelectDeal={onSelectDeal}
        onSelectLead={onSelectLead}
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

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
        <p className="text-slate-500">All contacts across your pipeline and leads.</p>
      </div>

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

      {/* Contact list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No contacts found</p>
          <p className="text-slate-400 text-sm mt-1">Contacts are automatically pulled from your deals and leads.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(contact => {
              const initials = contact.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              const txCount = contact.sources.filter(s => s.type !== 'lead').length;
              const leadCount = contact.sources.filter(s => s.type === 'lead').length;
              return (
                <button
                  key={contact.id}
                  onClick={() => onSelectContact(contact.id)}
                  className="w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 truncate">{contact.name}</p>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded shrink-0">{contact.primaryRole}</span>
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const TransactionDetailView = ({
  transaction,
  onSave,
  onClose,
  onSelectContact,
}: {
  transaction: Transaction,
  onSave: (t: Transaction) => void,
  onClose: () => void,
  onSelectContact?: (contactId: string) => void,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'parties' | 'timeline' | 'documents'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Transaction>(transaction);

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
    setFormData(transaction);
    setIsEditing(false);
  }, [transaction]);

  const math = useCommissionMath(formData);

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

  const dragInfo = React.useRef<{ side: string; idx: number } | null>(null);

  const handleDragStart = (side: string, idx: number) => {
    dragInfo.current = { side, idx };
  };

  const handleDropOnParty = (side: 'buyer' | 'seller' | 'third-party', dropIdx: number) => {
    if (!dragInfo.current || dragInfo.current.side !== side) return;
    const fromIdx = dragInfo.current.idx;
    if (fromIdx === dropIdx) return;
    if (side === 'third-party') {
      const arr = [...getThirdParties()];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(dropIdx, 0, moved);
      setThirdParties(arr);
    } else {
      const arr = [...getCombined(side)];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(dropIdx, 0, moved);
      setCombined(side, arr);
    }
    dragInfo.current = null;
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

            const PartyGroup = ({
              side,
              parties,
              color,
              label,
              addLabel,
            }: {
              side: 'buyer' | 'seller' | 'third-party';
              parties: Party[];
              color: 'indigo' | 'emerald' | 'slate';
              label: string;
              addLabel: string;
            }) => {
              const bg = color === 'indigo' ? 'bg-indigo-100 text-indigo-700' : color === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600';
              const pill = color === 'indigo' ? 'bg-indigo-50 border-indigo-200' : color === 'emerald' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200';
              return (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                      return (
                        <div
                          key={party.id || idx}
                          draggable={isEditing}
                          onDragStart={() => handleDragStart(side, idx)}
                          onDragOver={e => { e.preventDefault(); }}
                          onDrop={() => handleDropOnParty(side, idx)}
                          className={cn("px-5 py-4 transition-colors", isEditing && "hover:bg-slate-50/80")}
                        >
                          {isEditing ? (
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center gap-2 pt-1 shrink-0">
                                <GripVertical className="w-4 h-4 text-slate-300 cursor-grab active:cursor-grabbing" />
                              </div>
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
                                <input
                                  type="text"
                                  value={party.name}
                                  onChange={e => updatePartyInGroup(side, idx, 'name', e.target.value)}
                                  placeholder="Name"
                                  className="p-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                                />
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
                <PartyGroup side="buyer" parties={buyers} color="indigo" label="Buyers" addLabel="Add Buyer" />
                <PartyGroup side="seller" parties={sellers} color="emerald" label="Sellers" addLabel="Add Seller" />
                <PartyGroup side="third-party" parties={thirds} color="slate" label="Third Parties" addLabel="Add Third Party" />
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
                {/* Waterfall */}
                <div className="space-y-3">
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

                  <div className="flex justify-between items-center">
                    <span className={cn("text-sm", isEditing ? "text-slate-400" : "text-slate-500")}>LAO Cut (House)</span>
                    <div className="flex items-center gap-2">
                      {isEditing && (
                        <div className="flex items-center w-20 bg-slate-800 rounded px-2 py-1 border border-slate-700">
                          <input 
                            type="number" 
                            value={formData.laoCutPercent}
                            onChange={e => handleInputChange('laoCutPercent', Number(e.target.value))}
                            className="w-full bg-transparent text-right text-xs text-white focus:outline-none"
                          />
                          <span className="text-slate-500 text-xs ml-1">%</span>
                        </div>
                      )}
                      <span className={cn("font-mono text-sm", isEditing ? "text-red-400" : "text-red-500")}>
                        -{formatCurrency(math.laoCut)}
                      </span>
                    </div>
                  </div>

                  <div className={cn("h-px my-2", isEditing ? "bg-slate-700" : "bg-slate-200")}></div>

                  <div className="flex justify-between items-center">
                    <span className={cn("font-medium", isEditing ? "text-white" : "text-slate-900")}>Net Commission</span>
                    <span className={cn("font-mono font-bold", isEditing ? "text-white" : "text-slate-900")}>
                      {formatCurrency(math.netCommission)}
                    </span>
                  </div>
                </div>

                {/* Splits */}
                <div className={cn("mt-6 p-4 rounded-lg space-y-4", isEditing ? "bg-slate-800/50" : "bg-slate-50")}>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={isEditing ? "text-slate-400" : "text-slate-500"}>Trey's Split</span>
                      <span className={isEditing ? "text-slate-400" : "text-slate-500"}>{formData.treySplitPercent}%</span>
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
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full" style={{ width: `${formData.treySplitPercent}%` }} />
                      </div>
                    )}
                    <div className={cn("text-right font-mono font-bold mt-1", isEditing ? "text-indigo-400" : "text-indigo-600")}>
                      {formatCurrency(math.treyTake)}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={isEditing ? "text-slate-400" : "text-slate-500"}>Kirk's Split</span>
                      <span className={isEditing ? "text-slate-400" : "text-slate-500"}>{formData.kirkSplitPercent}%</span>
                    </div>
                    {isEditing ? (
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="0.5"
                        value={formData.kirkSplitPercent}
                        onChange={e => handleInputChange('kirkSplitPercent', Number(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                    ) : (
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-sky-400 h-full" style={{ width: `${formData.kirkSplitPercent}%` }} />
                      </div>
                    )}
                    <div className={cn("text-right font-mono font-bold mt-1", isEditing ? "text-sky-400" : "text-sky-600")}>
                      {formatCurrency(math.kirkTake)}
                    </div>
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
    laoCutPercent: 30.0,
    treySplitPercent: 17.5,
    kirkSplitPercent: 82.5,
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
    apn: '',
    county: ''
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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
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

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">LAO Cut %</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={formData.laoCutPercent} 
                  onChange={e => handleInputChange('laoCutPercent', Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="h-px bg-slate-200 my-4"></div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Gross</span>
                  <span className="font-mono font-medium text-slate-900">{formatCurrency(math.grossCommission)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">LAO Cut</span>
                  <span className="font-mono font-medium text-red-500">-{formatCurrency(math.laoCut)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200">
                  <span className="text-slate-900">Net</span>
                  <span className="font-mono text-slate-900">{formatCurrency(math.netCommission)}</span>
                </div>
              </div>

              <div className="h-px bg-slate-200 my-4"></div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Trey ({formData.treySplitPercent}%)</span>
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
                <div className="text-right font-mono font-bold text-indigo-600">
                  {formatCurrency(math.treyTake)}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Kirk ({formData.kirkSplitPercent}%)</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="0.5"
                  value={formData.kirkSplitPercent}
                  onChange={e => handleInputChange('kirkSplitPercent', Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500 mb-1"
                />
                <div className="text-right font-mono font-bold text-sky-600">
                  {formatCurrency(math.kirkTake)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white z-10">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">Cancel</button>
            <button type="submit" form="new-deal-form" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm transition-colors">Create Deal</button>
        </div>
      </div>
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

  const DeleteRow = ({ name, deletedAt, onRestore, onDelete, confirmMsg }: { key?: string, name: string, deletedAt?: string, onRestore: () => void, onDelete: () => void, confirmMsg: string }) => (
    <tr className="hover:bg-slate-50">
      <td className="px-6 py-4 font-medium text-slate-900">{name}</td>
      <td className="px-6 py-4 text-slate-500">
        {deletedAt ? format(parseISO(deletedAt), 'MMM d, yyyy h:mm a') : '-'}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-2">
          <button onClick={onRestore} className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Restore
          </button>
          <button
            onClick={() => { if (confirm(confirmMsg)) onDelete(); }}
            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            Delete Forever
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-slate-500" />
          Recently Deleted
        </h2>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button onClick={() => setTab('transactions')} className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors", tab === 'transactions' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            Transactions {transactions.length > 0 && <span className="ml-1 bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{transactions.length}</span>}
          </button>
          <button onClick={() => setTab('leads')} className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors", tab === 'leads' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            Leads {leads.length > 0 && <span className="ml-1 bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{leads.length}</span>}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">{tab === 'transactions' ? 'Deal Name' : 'Project Name'}</th>
              <th className="px-6 py-3">Deleted At</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tab === 'transactions' ? (
              transactions.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500">No recently deleted transactions.</td></tr>
              ) : transactions.map(deal => (
                <DeleteRow
                  key={deal.id}
                  name={deal.dealName}
                  deletedAt={deal.deletedAt}
                  onRestore={() => onRestore(deal.id)}
                  onDelete={() => onPermanentDelete(deal.id)}
                  confirmMsg="Permanently delete this transaction? This cannot be undone."
                />
              ))
            ) : (
              leads.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500">No recently deleted leads.</td></tr>
              ) : leads.map(lead => (
                <DeleteRow
                  key={lead.id}
                  name={lead.projectName}
                  deletedAt={lead.deletedAt}
                  onRestore={() => onRestoreLead(lead.id)}
                  onDelete={() => onPermanentDeleteLead(lead.id)}
                  confirmMsg="Permanently delete this lead? This cannot be undone."
                />
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
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 scale-100">
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel} 
            className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 shadow-sm transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'pipeline' | 'leads' | 'detail' | 'import' | 'deleted' | 'contacts'>('dashboard');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [transRes, leadsRes] = await Promise.all([
          fetch('/api/transactions'),
          fetch('/api/leads')
        ]);
        if (transRes.ok) {
          const data = await transRes.json();
          if (data.length > 0) setTransactions(data);
        }
        if (leadsRes.ok) {
          const data = await leadsRes.json();
          if (data.length > 0) setLeads(data);
        }
      } catch (e) {
        console.log('Could not load data from API:', e);
      }
    };
    loadInitialData();
  }, []);

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
  const allContacts = useMemo(() => deriveContacts(activeTransactions, activeLeads), [activeTransactions, activeLeads]);

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

  const handleUpdateTransaction = (updated: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
    fetch(`/api/transactions/${updated.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) }).catch(console.error);
  };

  const handleCreateTransaction = (newDeal: Transaction) => {
    setTransactions(prev => [...prev, newDeal]);
    setIsNewDealModalOpen(false);
    setSelectedDealId(newDeal.id);
    setCurrentView('detail');
    fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newDeal) }).catch(console.error);
  };

  const handleImportTransactions = (newTransactions: Transaction[]) => {
    setTransactions(prev => [...prev, ...newTransactions]);
    setCurrentView('pipeline');
    fetch('/api/transactions/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTransactions) }).catch(console.error);
  };

  const handleUpdateLead = (updated: Lead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    fetch(`/api/leads/${updated.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) }).catch(console.error);
  };

  const handleImportLeads = (newLeads: Lead[]) => {
    setLeads(prev => [...prev, ...newLeads]);
    setCurrentView('leads');
    fetch('/api/leads/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newLeads) }).catch(console.error);
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
          setTransactions(prev => prev.map(t =>
            ids.includes(t.id) ? { ...t, isDeleted: true, deletedAt: new Date().toISOString() } : t
          ));
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
          setLeads(prev => prev.map(l =>
            ids.includes(l.id) ? { ...l, isDeleted: true, deletedAt: new Date().toISOString() } : l
          ));
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

  const NavItem = ({ view, icon: Icon, label }: { view: 'dashboard' | 'pipeline' | 'leads' | 'import' | 'deleted' | 'contacts', icon: any, label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setSelectedDealId(null);
        setSelectedLeadId(null);
        setSelectedContactId(null);
        setIsMobileMenuOpen(false);
      }}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-sm",
        currentView === view && !selectedDealId && !selectedLeadId
          ? "bg-indigo-50 text-indigo-700"
          : darkMode ? "text-slate-300 hover:bg-slate-700 hover:text-slate-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        isSidebarCollapsed && "justify-center px-2"
      )}
      title={isSidebarCollapsed ? label : undefined}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!isSidebarCollapsed && <span>{label}</span>}
    </button>
  );

  return (
    <div className={cn("min-h-screen font-sans flex transition-colors duration-300", darkMode ? "bg-slate-900 text-slate-100 dark" : "bg-slate-50 text-slate-900")}>
      {/* Mobile Header */}
      <div className={cn("md:hidden fixed top-0 left-0 right-0 h-16 border-b z-50 flex items-center justify-between px-4", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span>LAO Pipeline</span>
        </div>
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
        <div className={cn("p-6 hidden md:flex items-center gap-3 font-bold text-xl", darkMode ? "text-slate-100" : "text-slate-900", isSidebarCollapsed && "justify-center px-2")}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm shadow-indigo-200 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          {!isSidebarCollapsed && <span className="whitespace-nowrap">LAO Pipeline</span>}
        </div>

        <div className="flex-1 px-4 py-6 flex flex-col mt-14 md:mt-0">
          {!isSidebarCollapsed && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-2">Menu</div>}
          <div className="space-y-2">
            <NavItem view="dashboard" icon={LayoutDashboard} label="Executive Dashboard" />
            <NavItem view="pipeline" icon={List} label="Pipeline Manager" />
            <NavItem view="leads" icon={Users} label="Leads Tracker" />
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

          <div className="mt-auto pt-4 border-t border-slate-100">
             <NavItem view="deleted" icon={Trash2} label="Recently Deleted" />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className={cn("flex items-center gap-3 px-4 py-2", isSidebarCollapsed && "justify-center px-0")}>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
              TK
            </div>
            {!isSidebarCollapsed && (
              <div className="text-sm overflow-hidden">
                <p className="font-medium text-slate-900 truncate">Trey & Kirk</p>
                <p className="text-xs text-slate-500 truncate">LAO Team</p>
              </div>
            )}
          </div>
          
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(d => !d)}
            className="w-full mt-2 p-2 flex items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-lg transition-colors"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode
              ? <Sun className="w-4 h-4" />
              : <Moon className="w-4 h-4" />}
            {!isSidebarCollapsed && <span className="text-xs font-medium">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

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
      <main className="flex-1 min-w-0 pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {currentView === 'dashboard' && !selectedDealId && (
            <div className="animate-in fade-in duration-500">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Executive Dashboard</h1>
                <p className="text-slate-500">Welcome back. Here's your pipeline overview.</p>
              </div>
              <DashboardView
                transactions={activeTransactions}
                leads={leads}
                onSelectDeal={handleSelectDeal}
                onSelectLead={handleSelectLead}
                onAddReminder={handleAddReminder}
                darkMode={darkMode}
              />
            </div>
          )}

          {currentView === 'pipeline' && !selectedDealId && (
            <div className="animate-in fade-in duration-500">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Pipeline Manager</h1>
                <p className="text-slate-500">Manage your active and closed transactions.</p>
              </div>
              <PipelineView
                transactions={activeTransactions}
                onSelectDeal={handleSelectDeal}
                onDeleteDeal={handleDeleteTransaction}
                onBatchDelete={handleBatchDelete}
                onUpdateTransaction={handleUpdateTransaction}
              />
            </div>
          )}

          {currentView === 'leads' && !selectedLeadId && (
            <div className="animate-in fade-in duration-500">
              <LeadsView
                leads={activeLeads}
                onSelectLead={handleSelectLead}
                onDeleteLead={handleDeleteLead}
                onBatchDelete={handleBatchDeleteLeads}
                onUpdateLead={handleUpdateLead}
              />
            </div>
          )}

          {currentView === 'contacts' && (
            <div className="animate-in fade-in duration-500">
              <ContactsView
                contacts={allContacts}
                selectedContactId={selectedContactId}
                onSelectContact={handleSelectContact}
                onBack={() => setSelectedContactId(null)}
                onSelectDeal={handleSelectDeal}
                onSelectLead={handleSelectLead}
              />
            </div>
          )}

          {currentView === 'import' && !selectedDealId && (
            <div className="animate-in fade-in duration-500">
               <DataManagementView 
                 transactions={activeTransactions}
                 leads={leads}
                 onUpdateTransaction={handleUpdateTransaction}
                 onUpdateLead={handleUpdateLead}
                 onImport={handleImportTransactions} 
                 onImportLeads={handleImportLeads}
               />
            </div>
          )}

          {currentView === 'deleted' && !selectedDealId && (
            <div className="animate-in fade-in duration-500">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Recently Deleted</h1>
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
            </div>
          )}

          {currentView === 'detail' && selectedTransaction && (
            <TransactionDetailView
              transaction={selectedTransaction}
              onSave={handleUpdateTransaction}
              onClose={() => { setSelectedDealId(null); }}
              onSelectContact={(contactId) => {
                setSelectedContactId(contactId);
                setSelectedDealId(null);
                setCurrentView('contacts');
              }}
            />
          )}

          {currentView === 'leads' && selectedLead && (
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
          )}
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
    </div>
  );
};
