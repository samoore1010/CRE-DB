import { useMemo } from 'react';
import { addDays } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Transaction, Party, AppPreferences } from './types';

// --- Class Name Utility ---

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Haptic Feedback ---

export function haptic(pattern: number | number[] = 50) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

// --- Shared Animation Variants ---

export const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 28, stiffness: 320 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.12 } },
};

export const drawerVariants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { type: 'spring' as const, damping: 30, stiffness: 300 } },
  exit: { x: '100%', transition: { type: 'spring' as const, damping: 36, stiffness: 380 } },
};

export const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalVariants = {
  hidden: { scale: 0.96, opacity: 0, y: 10 },
  visible: { scale: 1, opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 26, stiffness: 320 } },
  exit: { scale: 0.96, opacity: 0, y: 8, transition: { duration: 0.12 } },
};

export const listContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

export const listItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 300 } },
};

// --- Formatting Utilities ---

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

// --- ICS Calendar Generation ---

export function generateICS(events: { title: string, start: Date, description?: string }[]) {
  let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//LAO Pipeline Pro//NONSGML v1.0//EN\n";

  events.forEach(event => {
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    icsContent += "BEGIN:VEVENT\n";
    icsContent += `UID:${Math.random().toString(36).substr(2)}@laopipeline.com\n`;
    icsContent += `DTSTAMP:${formatDate(new Date())}\n`;
    icsContent += `DTSTART:${formatDate(event.start)}\n`;
    icsContent += `DTEND:${formatDate(addDays(event.start, 1))}\n`;
    icsContent += `SUMMARY:${event.title}\n`;
    if (event.description) icsContent += `DESCRIPTION:${event.description}\n`;
    icsContent += "END:VEVENT\n";
  });

  icsContent += "END:VCALENDAR";
  return icsContent;
}

// --- Party Factory ---

export const mkParty = (role: string, side?: Party['side']): Party => ({
  id: Math.random().toString(36).substr(2, 9),
  role,
  side,
  name: '',
  entity: '',
  email: '',
  phone: '',
});

// --- Preferences ---

export const DEFAULT_PREFERENCES: AppPreferences = {
  teamName: 'LAO Team',
  agent1Name: 'Trey',
  agent2Name: 'Kirk',
  defaultTreySplit: 60,
  defaultKirkSplit: 40,
  defaultTreyLaoPercent: 35,
  defaultKirkLaoPercent: 30,
  defaultGrossCommissionPercent: 3,
};

export function loadPrefsFromStorage(): AppPreferences {
  try {
    const raw = localStorage.getItem('lao_preferences');
    if (raw) return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_PREFERENCES };
}

// --- Validation Helpers ---

export function getMissingTransactionFields(t: Transaction): { key: string; label: string }[] {
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

export function getMissingLeadFields(l: { projectName: string; contactName: string; lastSpokeDate?: string }): { key: string; label: string }[] {
  const missing: { key: string; label: string }[] = [];
  if (!l.projectName) missing.push({ key: 'projectName', label: 'Project Name' });
  if (!l.contactName) missing.push({ key: 'contactName', label: 'Contact' });
  return missing;
}

// --- Lead Summary ---

export function getLeadSummary(lead: { notesLog?: { date: string; content: string }[] }): string {
  if (!lead.notesLog || lead.notesLog.length === 0) return '';
  const sorted = [...lead.notesLog].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return sorted[0]?.content || '';
}

// --- Commission Math Hook ---

export function useCommissionMath(transaction: Transaction) {
  return useMemo(() => {
    return calculateCommission(transaction);
  }, [transaction.price, transaction.grossCommissionPercent, transaction.treyLaoPercent, transaction.kirkLaoPercent, transaction.treySplitPercent, transaction.kirkSplitPercent]);
}

// Pure function for use in tests (no React dependency)
export function calculateCommission(transaction: {
  price: number;
  grossCommissionPercent: number;
  treySplitPercent: number;
  kirkSplitPercent: number;
  treyLaoPercent: number;
  kirkLaoPercent: number;
}) {
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
}
