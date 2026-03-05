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
  Calendar
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
  Legend
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
  role: string;
  name: string;
  entity?: string;
  email?: string;
  phone?: string;
}

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

interface Lead {
  id: string;
  type: string;
  projectName: string;
  contactName: string;
  details: string;
  lastSpokeDate: string;
  summary: string;
  isDeleted: boolean;
  notesLog?: Note[];
  followUpDate?: string; // Deprecated in favor of reminders, but kept for backward compatibility if needed
  contacts?: LeadContact[];
  reminders?: LeadReminder[];
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
  const colors = {
    'LOI': 'bg-slate-100 text-slate-700 border-slate-200',
    'Contract': 'bg-blue-50 text-blue-700 border-blue-200',
    'Escrow': 'bg-amber-50 text-amber-700 border-amber-200',
    'Closed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
      t.otherParties.push({ role: 'Buyer 2', name: row['Buyer:2'], entity: '' });
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
  const [activeTab, setActiveTab] = useState<'import' | 'manage'>('import');
  const [dataType, setDataType] = useState<'transactions' | 'leads'>('transactions');

  const [showIncompleteOnly, setShowIncompleteOnly] = useState(true);
  const [filterYear, setFilterYear] = useState<string>('All');
  const [isDragging, setIsDragging] = useState(false);
  
  // Preview State
  const [previewData, setPreviewData] = useState<Transaction[]>([]);
  const [previewLeads, setPreviewLeads] = useState<Lead[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPreviewIds, setSelectedPreviewIds] = useState<Set<string>>(new Set());

  // Validation Logic
  const getMissingFields = (t: Transaction) => {
    const missing: string[] = [];
    if (!t.projectYear) missing.push('Year');
    if (!t.stage) missing.push('Stage');
    if (!t.seller.name) missing.push('Seller');
    if (!t.buyer.name) missing.push('Buyer');
    if (!t.price) missing.push('Price');
    if (t.grossCommissionPercent === undefined) missing.push('Base Comm');
    if (t.laoCutPercent === undefined) missing.push('LAO Split');
    if (t.treySplitPercent === undefined) missing.push('Trey Comm');
    if (t.kirkSplitPercent === undefined) missing.push('Kirk Comm');
    if (!t.feasibilityDate) missing.push('Feas Date');
    if (!t.coeDate) missing.push('COE');
    if (!t.pid) missing.push('PID');
    return missing;
  };

  const getMissingLeadFields = (l: Lead) => {
    const missing: string[] = [];
    if (!l.type) missing.push('Type');
    if (!l.projectName) missing.push('Project Name');
    if (!l.contactName) missing.push('Contact');
    return missing;
  };

  const filteredTransactions = useMemo(() => {
    let data = [...transactions];
    if (showIncompleteOnly) {
      data = data.filter(t => getMissingFields(t).length > 0);
    }
    if (filterYear !== 'All') {
      data = data.filter(t => t.projectYear === filterYear);
    }
    return data;
  }, [transactions, showIncompleteOnly, filterYear]);

  const filteredLeads = useMemo(() => {
      let data = [...leads];
      if (showIncompleteOnly) {
          data = data.filter(l => getMissingLeadFields(l).length > 0);
      }
      return data;
  }, [leads, showIncompleteOnly]);

  const uniqueYears = useMemo(() => {
    const years = new Set(transactions.map(t => t.projectYear).filter(Boolean));
    return Array.from(years).sort().reverse();
  }, [transactions]);

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
          <p className="text-slate-500">Import and validate your pipeline data.</p>
        </div>
      </div>

      {/* Subtabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
            <button
                onClick={() => setActiveTab('import')}
                className={cn(
                    "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    activeTab === 'import'
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                )}
            >
                Data Import
            </button>
            <button
                onClick={() => setActiveTab('manage')}
                className={cn(
                    "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    activeTab === 'manage'
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                )}
            >
                Data Validation
            </button>
        </nav>
      </div>

      {activeTab === 'import' && (
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
      )}

      {activeTab === 'manage' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setDataType('transactions')}
                        className={cn(
                            "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                            dataType === 'transactions' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Transactions
                    </button>
                    <button
                        onClick={() => setDataType('leads')}
                        className={cn(
                            "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                            dataType === 'leads' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Leads
                    </button>
                </div>

                <div className="flex gap-2">
                    {dataType === 'transactions' && (
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            <option value="All">All Years</option>
                            {uniqueYears.map(year => (
                                <option key={year} value={year as string}>{year}</option>
                            ))}
                        </select>
                    )}
                    <button 
                        onClick={() => setShowIncompleteOnly(!showIncompleteOnly)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                            showIncompleteOnly 
                                ? "bg-amber-50 text-amber-700 border-amber-200" 
                                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                        )}
                    >
                        <Filter className="w-4 h-4" />
                        {showIncompleteOnly ? 'Showing Incomplete' : 'Showing All'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    {dataType === 'transactions' ? (
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-2 w-8"></th>
                                    <th className="px-3 py-2 min-w-[60px]">Year</th>
                                    <th className="px-3 py-2 min-w-[80px]">Stage</th>
                                    <th className="px-3 py-2 min-w-[120px]">Deal Name</th>
                                    <th className="px-3 py-2 min-w-[100px]">Seller</th>
                                    <th className="px-3 py-2 min-w-[100px]">Buyer</th>
                                    <th className="px-3 py-2 min-w-[100px] text-right">Price</th>
                                    <th className="px-3 py-2 min-w-[60px] text-right">Base %</th>
                                    <th className="px-3 py-2 min-w-[60px] text-right">LAO %</th>
                                    <th className="px-3 py-2 min-w-[60px] text-right">Trey %</th>
                                    <th className="px-3 py-2 min-w-[60px] text-right">Kirk %</th>
                                    <th className="px-3 py-2 min-w-[100px]">Feas Date</th>
                                    <th className="px-3 py-2 min-w-[100px]">COE Date</th>
                                    <th className="px-3 py-2 min-w-[80px]">PID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTransactions.map((t) => {
                                    const missing = getMissingFields(t);
                                    const hasErrors = missing.length > 0;
                                    
                                    return (
                                        <tr key={t.id} className={cn("hover:bg-slate-50 group", hasErrors ? "bg-amber-50/30" : "")}>
                                            <td className="px-3 py-2">
                                                {hasErrors ? (
                                                    <div className="group relative">
                                                        <AlertCircle className="w-4 h-4 text-amber-500 cursor-help" />
                                                        <div className="absolute left-6 top-0 hidden group-hover:block bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg z-50 w-32">
                                                            Missing: {missing.join(', ')}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-50" />
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <EditableCell 
                                                    value={t.projectYear} 
                                                    onChange={(val) => onUpdateTransaction({...t, projectYear: val})}
                                                    className={!t.projectYear ? "bg-amber-100" : ""}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <EditableCell 
                                                    value={t.stage} 
                                                    type="select"
                                                    onChange={(val) => onUpdateTransaction({...t, stage: val})}
                                                    className={!t.stage ? "bg-amber-100" : ""}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <EditableCell 
                                                    value={t.dealName} 
                                                    onChange={(val) => onUpdateTransaction({...t, dealName: val})}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <EditableCell 
                                                    value={t.seller.name} 
                                                    onChange={(val) => onUpdateTransaction({...t, seller: {...t.seller, name: val}})}
                                                    className={!t.seller.name ? "bg-amber-100" : ""}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <EditableCell 
                                                    value={t.buyer.name} 
                                                    onChange={(val) => onUpdateTransaction({...t, buyer: {...t.buyer, name: val}})}
                                                    className={!t.buyer.name ? "bg-amber-100" : ""}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <EditableCell 
                                                    value={t.price} 
                                                    type="number"
                                                    onChange={(val) => onUpdateTransaction({...t, price: Number(val)})}
                                                    className={!t.price ? "bg-amber-100 text-right" : "text-right"}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <EditableCell 
                                                    value={t.grossCommissionPercent} 
                                                    type="number"
                                                    onChange={(val) => onUpdateTransaction({...t, grossCommissionPercent: Number(val)})}
                                                    className={t.grossCommissionPercent === undefined ? "bg-amber-100 text-right" : "text-right"}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <EditableCell 
                                                    value={t.laoCutPercent} 
                                                    type="number"
                                                    onChange={(val) => onUpdateTransaction({...t, laoCutPercent: Number(val)})}
                                                    className={t.laoCutPercent === undefined ? "bg-amber-100 text-right" : "text-right"}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <EditableCell 
                                                    value={t.treySplitPercent} 
                                                    type="number"
                                                    onChange={(val) => onUpdateTransaction({...t, treySplitPercent: Number(val)})}
                                                    className={t.treySplitPercent === undefined ? "bg-amber-100 text-right" : "text-right"}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <EditableCell 
                                                    value={t.kirkSplitPercent} 
                                                    type="number"
                                                    onChange={(val) => onUpdateTransaction({...t, kirkSplitPercent: Number(val)})}
                                                    className={t.kirkSplitPercent === undefined ? "bg-amber-100 text-right" : "text-right"}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <EditableCell 
                                                    value={t.feasibilityDate ? format(parseISO(t.feasibilityDate), 'yyyy-MM-dd') : ''} 
                                                    type="date"
                                                    onChange={(val) => onUpdateTransaction({...t, feasibilityDate: val})}
                                                    className={!t.feasibilityDate ? "bg-amber-100" : ""}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <EditableCell 
                                                    value={t.coeDate ? format(parseISO(t.coeDate), 'yyyy-MM-dd') : ''} 
                                                    type="date"
                                                    onChange={(val) => onUpdateTransaction({...t, coeDate: val})}
                                                    className={!t.coeDate ? "bg-amber-100" : ""}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <EditableCell 
                                                    value={t.pid} 
                                                    onChange={(val) => onUpdateTransaction({...t, pid: val, apn: val})}
                                                    className={!t.pid ? "bg-amber-100" : ""}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-2 w-8"></th>
                                    <th className="px-3 py-2">Type</th>
                                    <th className="px-3 py-2">Project Name</th>
                                    <th className="px-3 py-2">Contact</th>
                                    <th className="px-3 py-2">Details</th>
                                    <th className="px-3 py-2">Last Spoke</th>
                                    <th className="px-3 py-2">Summary</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLeads.map((l) => {
                                    const missing = getMissingLeadFields(l);
                                    const hasErrors = missing.length > 0;
                                    return (
                                        <tr key={l.id} className={cn("hover:bg-slate-50 group", hasErrors ? "bg-amber-50/30" : "")}>
                                            <td className="px-3 py-2">
                                                {hasErrors ? (
                                                    <div className="group relative">
                                                        <AlertCircle className="w-4 h-4 text-amber-500 cursor-help" />
                                                        <div className="absolute left-6 top-0 hidden group-hover:block bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg z-50 w-32">
                                                            Missing: {missing.join(', ')}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-50" />
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <EditableCell value={l.type} onChange={(v) => onUpdateLead({...l, type: v})} />
                                            </td>
                                            <td className="px-3 py-2">
                                                <EditableCell value={l.projectName} onChange={(v) => onUpdateLead({...l, projectName: v})} />
                                            </td>
                                            <td className="px-3 py-2">
                                                <EditableCell value={l.contactName} onChange={(v) => onUpdateLead({...l, contactName: v})} />
                                            </td>
                                            <td className="px-3 py-2">
                                                <EditableCell value={l.details} onChange={(v) => onUpdateLead({...l, details: v})} />
                                            </td>
                                            <td className="px-3 py-2">
                                                <EditableCell value={l.lastSpokeDate ? l.lastSpokeDate.split('T')[0] : ''} onChange={(v) => onUpdateLead({...l, lastSpokeDate: v ? new Date(v).toISOString() : ''})} type="date" />
                                            </td>
                                            <td className="px-3 py-2">
                                                <EditableCell value={l.summary} onChange={(v) => onUpdateLead({...l, summary: v})} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
        </div>
        {((dataType === 'transactions' && filteredTransactions.length === 0) || (dataType === 'leads' && filteredLeads.length === 0)) && (
            <div className="p-12 text-center text-slate-500">
                {showIncompleteOnly ? (
                    <>
                        <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
                        <h3 className="text-lg font-medium text-slate-900">All Clean!</h3>
                        <p>No incomplete {dataType === 'transactions' ? 'transactions' : 'leads'} found.</p>
                    </>
                ) : (
                    <p>No {dataType === 'transactions' ? 'transactions' : 'leads'} found.</p>
                )}
            </div>
        )}
      </div>
          </div>
      )}
    </div>
  );
};

const DashboardView = ({ transactions, leads, onSelectDeal, onSelectLead }: { transactions: Transaction[], leads: Lead[], onSelectDeal: (id: string) => void, onSelectLead: (id: string) => void }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
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

    return allDates
      .filter(d => d.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [transactions, leads]);

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
          {/* Calendar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <CalendarIcon className="w-4 h-4 text-slate-500" /> Deal Calendar
              </h2>
              <div className="flex items-center gap-4">
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
              }).map((day, i) => {
                const events = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                
                return (
                  <div key={day.toISOString()} className={cn(
                    "bg-white min-h-[110px] p-2 flex flex-col gap-1 relative group transition-colors border border-slate-50",
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

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <History className="w-4 h-4 text-slate-500" /> Recent Developments
                </h2>
            </div>
            <div className="divide-y divide-slate-100">
                {recentActivity.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic text-sm">No recent activity logged.</div>
                ) : (
                    recentActivity.map((act, i) => (
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
          {/* Monthly Closing Progress */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col flex-1">
            <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider flex items-center justify-between">
                <span>Closing in {format(currentDate, 'MMMM')}</span>
                <span className="text-[10px] text-slate-400">{metrics.monthlyDeals.length} Deals</span>
            </h3>
          
          {metrics.monthlyDeals.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm py-12">
              <CalendarIcon className="w-8 h-8 mb-2 opacity-10" />
              <p className="italic">No deals closing this month.</p>
            </div>
          ) : (
            <div className="space-y-6">
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
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-700 ease-out" 
                        style={{ width: `${percentOfTotal}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-tighter">
                      <span>{format(parseISO(deal.coeDate), 'MMM d')}</span>
                      <span>{Math.round(percentOfTotal)}% of month</span>
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-6 border-t border-slate-100 mt-auto">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Projected</p>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(metrics.monthlyGross)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Trey's Take</p>
                    <p className="text-lg font-bold text-emerald-600 tracking-tight">{formatCurrency(metrics.monthlyTrey)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

          {/* Upcoming Deadlines Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
              <Clock className="w-4 h-4 text-slate-500" /> Upcoming Deadlines
            </h3>
            <div className="space-y-3">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No upcoming deadlines.</p>
              ) : (
                upcomingDeadlines.map((item, i) => (
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
    </div>
  );
};

const LeadsView = ({ 
  leads, 
  onSelectLead,
  onDeleteLead,
  onBatchDelete
}: { 
  leads: Lead[], 
  onSelectLead: (id: string) => void,
  onDeleteLead: (id: string) => void,
  onBatchDelete: (ids: string[]) => void
}) => {
  const [search, setSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(['True Lead', 'Live Contract', 'Converted Lead (Escrow)', 'Dead Deal']));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const toggleTypeFilter = (type: string) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedTypes(newSet);
  };

  const filteredLeads = useMemo(() => {
    let data = [...leads];
    
    if (selectedTypes.size > 0) {
      data = data.filter(l => selectedTypes.has(l.type));
    } else {
      data = [];
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
  }, [leads, search, sortConfig, selectedTypes]);

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
        <div className="flex gap-2 w-full sm:w-auto">
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
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
        <Filter className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
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
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2">
            <span className="text-sm text-indigo-700 font-medium">{selectedIds.size} selected</span>
            <button 
                onClick={() => {
                    onBatchDelete(Array.from(selectedIds));
                    setSelectedIds(new Set());
                }}
                className="text-xs bg-white text-red-600 border border-red-200 px-3 py-1.5 rounded-md hover:bg-red-50 font-medium transition-colors flex items-center gap-1"
            >
                <Trash2 className="w-3 h-3" /> Delete Selected
            </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input 
                    type="checkbox" 
                    checked={filteredLeads.length > 0 && selectedIds.size === filteredLeads.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('type')}>
                    <div className="flex items-center gap-1">Type <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('projectName')}>
                    <div className="flex items-center gap-1">Project Name <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('contactName')}>
                    <div className="flex items-center gap-1">Contact <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('lastSpokeDate')}>
                    <div className="flex items-center gap-1">Last Spoke <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3">Summary</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => (
                <tr 
                  key={lead.id} 
                  onClick={(e) => {
                    // Prevent row click when clicking checkbox or delete button
                    if ((e.target as HTMLElement).closest('input[type="checkbox"]') || (e.target as HTMLElement).closest('button')) return;
                    onSelectLead(lead.id);
                  }}
                  className={cn(
                    "hover:bg-slate-50 transition-colors group cursor-pointer",
                    selectedIds.has(lead.id) && "bg-indigo-50/50"
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
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {lead.lastSpokeDate ? format(parseISO(lead.lastSpokeDate), 'MMM d, yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-[250px] truncate" title={lead.summary}>{lead.summary}</td>
                  <td className="px-4 py-3">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLead(lead.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Lead"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLeads.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <p>No leads found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const LeadDetailView = ({ 
  lead, 
  onSave, 
  onClose 
}: { 
  lead: Lead, 
  onSave: (l: Lead) => void, 
  onClose: () => void 
}) => {
  const [formData, setFormData] = useState<Lead>(lead);
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

      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 divide-x divide-slate-200">
            {/* Left Column: Info & Contacts */}
            <div className="lg:col-span-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
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
                                <div className="font-medium text-slate-900">{contact.name}</div>
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
            <div className="lg:col-span-1 overflow-y-auto p-6 bg-white flex flex-col">
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
            <div className="lg:col-span-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
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

const PipelineView = ({ 
  transactions, 
  onSelectDeal,
  onDeleteDeal,
  onBatchDelete
}: { 
  transactions: Transaction[], 
  onSelectDeal: (id: string) => void,
  onDeleteDeal: (id: string) => void,
  onBatchDelete: (ids: string[]) => void
}) => {
  const [search, setSearch] = useState('');
  const [selectedStages, setSelectedStages] = useState<Set<PipelineStage>>(new Set(['LOI', 'Contract', 'Escrow', 'Closed', 'Option']));
  const [filterYear, setFilterYear] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
  }, [transactions, search, sortConfig, selectedStages, filterYear]);

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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-col gap-4 bg-slate-50">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <List className="w-5 h-5 text-slate-500" />
            All Transactions
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search deals..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
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
            </div>

            {selectedIds.size > 0 && (
                <button
                    onClick={() => {
                        onBatchDelete(Array.from(selectedIds));
                        setSelectedIds(new Set());
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                >
                    <Trash2 className="w-3 h-3" />
                    Delete Selected ({selectedIds.size})
                </button>
            )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 whitespace-nowrap">
            <tr>
              <th className="px-4 py-3 w-10">
                <input 
                  type="checkbox" 
                  checked={selectedIds.size === filteredData.length && filteredData.length > 0}
                  onChange={toggleAll}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('projectYear')}>
                  <div className="flex items-center">Year <SortIcon columnKey="projectYear" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('stage')}>
                  <div className="flex items-center">Stage <SortIcon columnKey="stage" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('dealName')}>
                  <div className="flex items-center">Deal Name <SortIcon columnKey="dealName" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('buyer')}>
                  <div className="flex items-center">Buyer <SortIcon columnKey="buyer" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700 text-right" onClick={() => handleSort('price')}>
                  <div className="flex items-center justify-end">Price <SortIcon columnKey="price" /></div>
              </th>
              <th className="px-4 py-3 text-right">Base %</th>
              <th className="px-4 py-3 text-right">LAO %</th>
              <th className="px-4 py-3 text-right">Trey %</th>
              <th className="px-4 py-3 text-right">Kirk %</th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('feasibilityDate')}>
                  <div className="flex items-center">Feas Date <SortIcon columnKey="feasibilityDate" /></div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('coeDate')}>
                  <div className="flex items-center">COE Date <SortIcon columnKey="coeDate" /></div>
              </th>
              <th className="px-4 py-3">PID</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map((deal) => {
              return (
                <tr 
                  key={deal.id} 
                  onClick={() => onSelectDeal(deal.id)}
                  className={cn(
                    "hover:bg-slate-50 cursor-pointer transition-colors group",
                    selectedIds.has(deal.id) && "bg-indigo-50/50"
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
                  <td className="px-4 py-3 font-medium text-slate-900 group-hover:text-indigo-600 max-w-[150px] truncate" title={deal.dealName}>{deal.dealName}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate" title={deal.buyer.name}>{deal.buyer.name || '-'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(deal.price)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{deal.grossCommissionPercent}%</td>
                  <td className="px-4 py-3 text-right text-slate-500">{deal.laoCutPercent}%</td>
                  <td className="px-4 py-3 text-right text-slate-500">{deal.treySplitPercent}%</td>
                  <td className="px-4 py-3 text-right text-slate-500">{deal.kirkSplitPercent}%</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {deal.feasibilityDate ? format(parseISO(deal.feasibilityDate), 'MM/dd/yy') : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {deal.coeDate ? format(parseISO(deal.coeDate), 'MM/dd/yy') : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-[10px] font-mono">{deal.pid || '-'}</td>
                  <td className="px-4 py-3">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDeal(deal.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Transaction"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filteredData.length === 0 && (
        <div className="p-12 text-center text-slate-500">
            <p>No transactions found matching your filters.</p>
        </div>
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

const PartiesSummary = ({ transaction }: { transaction: Transaction }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
      <Users className="w-4 h-4 text-slate-400" /> Parties
    </h3>
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">B</div>
        <div>
          <p className="text-xs text-slate-500 uppercase font-bold">Buyer</p>
          <p className="text-sm font-medium text-slate-900">{transaction.buyer.name || 'Unknown'}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">S</div>
        <div>
          <p className="text-xs text-slate-500 uppercase font-bold">Seller</p>
          <p className="text-sm font-medium text-slate-900">{transaction.seller.name || 'Unknown'}</p>
        </div>
      </div>
      {transaction.otherParties.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-2">Other Parties ({transaction.otherParties.length})</p>
          <div className="flex flex-wrap gap-1">
            {transaction.otherParties.map((p, i) => (
              <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">{p.role}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);

const TransactionDetailView = ({ 
  transaction, 
  onSave, 
  onClose 
}: { 
  transaction: Transaction, 
  onSave: (t: Transaction) => void, 
  onClose: () => void 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'parties' | 'timeline' | 'documents'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Transaction>(transaction);
  
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">{formData.dealName}</h1>
            <StatusBadge stage={formData.stage} />
          </div>
          <p className="text-slate-500 flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4" /> {formData.address}
          </p>
        </div>
        <div className="flex gap-3">
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
          ) : (
            <>
              <button 
                onClick={() => {
                    setActiveTab('overview');
                    setTimeout(() => {
                        const assistantElement = document.getElementById('ai-assistant-widget');
                        if (assistantElement) {
                            assistantElement.scrollIntoView({ behavior: 'smooth' });
                        }
                    }, 100);
                }}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 font-medium rounded-lg hover:bg-indigo-100 shadow-sm flex items-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" /> Ask AI
              </button>
              <button 
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 shadow-sm flex items-center gap-2 transition-colors"
              >
                <Edit3 className="w-4 h-4" /> Edit Details
              </button>
            </>
          )}
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
        <div className={cn("space-y-6", "lg:col-span-2")}>
          
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Property Details */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" /> Property Details
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
                <PartiesSummary transaction={formData} />
                <TimelineSummary transaction={formData} />
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

          {activeTab === 'parties' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Buyer Card */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" /> Buyer
                  </h3>
                  <div className="space-y-4">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                          <input type="text" value={formData.buyer.name} onChange={e => handlePartyChange('buyer', 'name', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Entity</label>
                          <input type="text" value={formData.buyer.entity} onChange={e => handlePartyChange('buyer', 'entity', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                            {formData.buyer.name.charAt(0) || 'B'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{formData.buyer.name || 'Unknown Buyer'}</p>
                            <p className="text-xs text-slate-500">{formData.buyer.entity || 'No Entity Listed'}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-slate-600 flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> {formData.buyer.email || '-'}</p>
                          <p className="text-sm text-slate-600 flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> {formData.buyer.phone || '-'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Seller Card */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" /> Seller
                  </h3>
                  <div className="space-y-4">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                          <input type="text" value={formData.seller.name} onChange={e => handlePartyChange('seller', 'name', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Entity</label>
                          <input type="text" value={formData.seller.entity} onChange={e => handlePartyChange('seller', 'entity', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                            {formData.seller.name.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{formData.seller.name || 'Unknown Seller'}</p>
                            <p className="text-xs text-slate-500">{formData.seller.entity || 'No Entity Listed'}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Other Parties */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" /> Other Parties
                  </h3>
                  {isEditing && (
                    <button onClick={addOtherParty} className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Party
                    </button>
                  )}
                </div>
                
                {formData.otherParties.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No other parties listed.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.otherParties.map((party, index) => (
                      <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200 relative group">
                        {isEditing && (
                          <button 
                            onClick={() => removeOtherParty(index)}
                            className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        
                        {isEditing ? (
                          <div className="space-y-3">
                            <input 
                              type="text" 
                              value={party.role}
                              onChange={e => updateOtherParty(index, 'role', e.target.value)}
                              placeholder="Role (e.g. Title Officer)"
                              className="w-full p-2 border border-slate-300 rounded text-xs font-medium"
                            />
                            <input 
                              type="text" 
                              value={party.name}
                              onChange={e => updateOtherParty(index, 'name', e.target.value)}
                              placeholder="Name"
                              className="w-full p-2 border border-slate-300 rounded text-sm"
                            />
                            <input 
                              type="text" 
                              value={party.email || ''}
                              onChange={e => updateOtherParty(index, 'email', e.target.value)}
                              placeholder="Email"
                              className="w-full p-2 border border-slate-300 rounded text-sm"
                            />
                            <input 
                              type="text" 
                              value={party.phone || ''}
                              onChange={e => updateOtherParty(index, 'phone', e.target.value)}
                              placeholder="Phone"
                              className="w-full p-2 border border-slate-300 rounded text-sm"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">{party.role || 'Unknown Role'}</p>
                            <p className="font-medium text-slate-900">{party.name}</p>
                            {party.email && (
                              <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                                <Mail className="w-3 h-3 text-slate-400" /> {party.email}
                              </p>
                            )}
                            {party.phone && (
                              <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                                <Phone className="w-3 h-3 text-slate-400" /> {party.phone}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

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
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            <div className={cn(
              "rounded-xl border shadow-sm overflow-hidden transition-colors duration-300",
              isEditing ? "bg-slate-900 border-slate-800 text-white ring-4 ring-indigo-500/20" : "bg-white border-slate-200"
            )}>
              <div className="p-6 border-b border-white/10">
                <h3 className={cn("text-sm font-semibold uppercase tracking-wider mb-1", isEditing ? "text-slate-400" : "text-slate-500")}>
                  Financial Breakdown
                </h3>
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

            {/* AI Assistant Widget */}
            <AIAssistant 
                transaction={formData} 
                onUpdateTransaction={handleAIUpdate} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const NewTransactionModal = ({ 
  isOpen, 
  onClose, 
  onSave 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (t: Transaction) => void 
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Buyer */}
                    <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Buyer
                      </h4>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                        <input 
                          type="text" 
                          value={formData.buyer.name} 
                          onChange={e => handlePartyChange('buyer', 'name', e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                          placeholder="Buyer Name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Entity</label>
                        <input 
                          type="text" 
                          value={formData.buyer.entity || ''} 
                          onChange={e => handlePartyChange('buyer', 'entity', e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                          placeholder="LLC / Trust"
                        />
                      </div>
                    </div>

                    {/* Seller */}
                    <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Seller
                      </h4>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                        <input 
                          type="text" 
                          value={formData.seller.name} 
                          onChange={e => handlePartyChange('seller', 'name', e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                          placeholder="Seller Name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Entity</label>
                        <input 
                          type="text" 
                          value={formData.seller.entity || ''} 
                          onChange={e => handlePartyChange('seller', 'entity', e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                          placeholder="LLC / Trust"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Other Parties */}
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Other Parties
                      </h4>
                      <button type="button" onClick={addOtherParty} className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add Party
                      </button>
                    </div>
                    
                    {formData.otherParties.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No other parties added.</p>
                    ) : (
                      <div className="space-y-3">
                        {formData.otherParties.map((party, index) => (
                          <div key={index} className="flex gap-2 items-start animate-in fade-in slide-in-from-top-1">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
                              <input 
                                type="text" 
                                value={party.role}
                                onChange={e => updateOtherParty(index, 'role', e.target.value)}
                                placeholder="Role"
                                className="p-2 border border-slate-300 rounded-lg text-sm"
                              />
                              <input 
                                type="text" 
                                value={party.name}
                                onChange={e => updateOtherParty(index, 'name', e.target.value)}
                                placeholder="Name"
                                className="p-2 border border-slate-300 rounded-lg text-sm"
                              />
                              <input 
                                type="text" 
                                value={party.email || ''}
                                onChange={e => updateOtherParty(index, 'email', e.target.value)}
                                placeholder="Email"
                                className="p-2 border border-slate-300 rounded-lg text-sm"
                              />
                              <input 
                                type="text" 
                                value={party.phone || ''}
                                onChange={e => updateOtherParty(index, 'phone', e.target.value)}
                                placeholder="Phone"
                                className="p-2 border border-slate-300 rounded-lg text-sm"
                              />
                            </div>
                            <button type="button" onClick={() => removeOtherParty(index)} className="p-2 text-slate-400 hover:text-red-500 mt-1">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
  onRestore, 
  onPermanentDelete 
}: { 
  transactions: Transaction[], 
  onRestore: (id: string) => void,
  onPermanentDelete: (id: string) => void
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-slate-500" />
          Recently Deleted
        </h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Deal Name</th>
              <th className="px-6 py-3">Deleted At</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((deal) => (
              <tr key={deal.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{deal.dealName}</td>
                <td className="px-6 py-4 text-slate-500">
                  {deal.deletedAt ? format(parseISO(deal.deletedAt), 'MMM d, yyyy h:mm a') : '-'}
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button 
                    onClick={() => onRestore(deal.id)}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    Restore
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm('Are you sure you want to permanently delete this transaction? This cannot be undone.')) {
                        onPermanentDelete(deal.id);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    Delete Forever
                  </button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                  No recently deleted transactions.
                </td>
              </tr>
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
  const [currentView, setCurrentView] = useState<'dashboard' | 'pipeline' | 'leads' | 'detail' | 'import' | 'deleted'>('dashboard');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [transRes, leadsRes] = await Promise.all([
          fetch('/transactions.csv'),
          fetch('/leads.csv')
        ]);
        if (transRes.ok) {
          const text = await transRes.text();
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
              const parsed = processTransactionCSV(results.data);
              if (parsed.length > 0) setTransactions(parsed);
            }
          });
        }
        if (leadsRes.ok) {
          const text = await leadsRes.text();
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
              const parsed = processLeadCSV(results.data);
              if (parsed.length > 0) setLeads(parsed);
            }
          });
        }
      } catch (e) {
        console.log('Could not load CSV data files:', e);
      }
    };
    loadInitialData();
  }, []);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  const handleSelectDeal = (id: string) => {
    setSelectedDealId(id);
    setSelectedLeadId(null);
    setCurrentView('detail');
    setIsMobileMenuOpen(false);
  };

  const handleSelectLead = (id: string) => {
    setSelectedLeadId(id);
    setSelectedDealId(null);
    setCurrentView('leads');
    setIsMobileMenuOpen(false);
  };

  const handleUpdateTransaction = (updated: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const handleCreateTransaction = (newDeal: Transaction) => {
    setTransactions(prev => [...prev, newDeal]);
    setIsNewDealModalOpen(false);
    setSelectedDealId(newDeal.id);
    setCurrentView('detail');
  };

  const handleImportTransactions = (newTransactions: Transaction[]) => {
    setTransactions(prev => [...prev, ...newTransactions]);
    setCurrentView('pipeline');
  };

  const handleUpdateLead = (updated: Lead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
  };

  const handleImportLeads = (newLeads: Lead[]) => {
    setLeads(prev => [...prev, ...newLeads]);
    setCurrentView('leads');
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
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, isDeleted: false, deletedAt: undefined } : t
    ));
  };

  const handlePermanentDeleteTransaction = (id: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'permanent',
      ids: [id],
      target: 'transaction'
    });
  };

  const executeDelete = () => {
    const { type, ids, target } = deleteConfirmation;
    
    if (target === 'transaction') {
        if (type === 'permanent') {
        setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
        } else {
        // Soft delete (single or batch)
        setTransactions(prev => prev.map(t => 
            ids.includes(t.id) ? { ...t, isDeleted: true, deletedAt: new Date().toISOString() } : t
        ));
        
        // If the currently viewed deal is deleted, go back to pipeline
        if (selectedDealId && ids.includes(selectedDealId)) {
            setSelectedDealId(null);
            setCurrentView('pipeline');
        }
        }
    } else {
        // Lead deletion (currently permanent as we don't have soft delete view for leads yet, or maybe we should soft delete?)
        // Let's soft delete to be safe, but we don't have a restore view for leads yet.
        // For now, let's just permanently delete leads to keep it simple as requested, or soft delete but filter them out.
        // The user didn't ask for restore leads, so let's just filter them out.
        setLeads(prev => prev.filter(l => !ids.includes(l.id)));
        
        if (selectedLeadId && ids.includes(selectedLeadId)) {
            setSelectedLeadId(null);
            setCurrentView('leads');
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

  const NavItem = ({ view, icon: Icon, label }: { view: 'dashboard' | 'pipeline' | 'leads' | 'import' | 'deleted', icon: any, label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setSelectedDealId(null);
        setSelectedLeadId(null);
        setIsMobileMenuOpen(false);
      }}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-sm",
        currentView === view && !selectedDealId && !selectedLeadId
          ? "bg-indigo-50 text-indigo-700" 
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        isSidebarCollapsed && "justify-center px-2"
      )}
      title={isSidebarCollapsed ? label : undefined}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!isSidebarCollapsed && <span>{label}</span>}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
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
        "fixed md:sticky top-0 left-0 z-40 h-screen bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col shrink-0",
        // Mobile behavior: fixed, transform based on state
        "transform md:transform-none",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        // Width behavior
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className={cn("p-6 hidden md:flex items-center gap-3 font-bold text-xl text-slate-900", isSidebarCollapsed && "justify-center px-2")}>
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
          
          {/* Collapse Toggle (Desktop Only) */}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex w-full mt-2 p-2 items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-lg transition-colors"
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
                <p className="text-slate-500">Restore or permanently delete transactions.</p>
              </div>
              <RecentlyDeletedView 
                transactions={deletedTransactions}
                onRestore={handleRestoreTransaction}
                onPermanentDelete={handlePermanentDeleteTransaction}
              />
            </div>
          )}

          {currentView === 'detail' && selectedTransaction && (
            <TransactionDetailView 
              transaction={selectedTransaction} 
              onSave={handleUpdateTransaction}
              onClose={() => {
                setSelectedDealId(null);
                // Return to previous view logic could be better, but defaulting to dashboard or pipeline based on where we came from is tricky without history. 
                // For now, we just clear ID, which renders the 'currentView' list again.
              }}
            />
          )}

          {currentView === 'leads' && selectedLead && (
            <LeadDetailView 
              lead={selectedLead} 
              onSave={(updatedLead) => {
                handleUpdateLead(updatedLead);
                // Optional: Close after save or keep open? Usually keep open or show success.
                // For now let's keep it open.
              }}
              onClose={() => {
                setSelectedLeadId(null);
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
