export interface FinanceEntry {
  id: string;
  type: 'income' | 'expense';
  amount: string;
  category: string;
  description: string | null;
  date: string;
}
export interface FinanceBudget {
  id: string;
  category: string;
  limit: string;
  period: string;
}
export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  topCategories: { category: string; total: number }[];
  monthly: { month: string; income: number; expenses: number }[];
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done';
  tags: string[];
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  frequency: string;
  targetPerWeek: number;
  logs: string[];
}
export interface HabitStats {
  totalCompletions: number;
  currentStreak: number;
  longestStreak: number;
  completionRate30: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string;
  targetValue: string;
  currentValue: string;
  unit: string;
  status: 'active' | 'completed' | 'archived';
  deadline: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  color: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
}

export interface DiaryEntry {
  id: string;
  title: string | null;
  content: string;
  mood: number;
  tags: string[];
  date: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  similarity?: number;
}

export interface HealthLog {
  id: string;
  type: 'workout' | 'water' | 'sleep' | 'weight';
  value: string;
  unit: string;
  notes: string | null;
  date: string;
}
export type HealthSummary = Record<
  string,
  { total: number; count: number; latest: number; unit: string; series: { date: string; value: number }[] }
>;
