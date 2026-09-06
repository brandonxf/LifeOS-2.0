export interface FinanceEntry {
  id: string;
  type: 'income' | 'expense';
  amount: string;
  category: string;
  description: string | null;
  date: string;
  recurringId: string | null;
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
export interface FinanceRecurring {
  id: string;
  type: 'income' | 'expense';
  amount: string;
  category: string;
  description: string | null;
  frequency: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string | null;
  lastGeneratedDate: string | null;
  active: boolean;
}

export interface TaskAssignee {
  id: string;
  name: string;
  avatar: string | null;
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
  isOwner: boolean;
  assignees?: TaskAssignee[];
}

export interface TaskInvite {
  id: string;
  task: { id: string; title: string };
  invitedBy: { name: string };
}

export interface HabitMemberProgress {
  id: string;
  name: string;
  avatar: string | null;
  streak: number;
  doneToday: boolean;
  dates: string[];
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
  isOwner: boolean;
  members?: HabitMemberProgress[];
}

export interface HabitInvite {
  id: string;
  habit: { id: string; name: string; icon: string; color: string };
  invitedBy: { name: string };
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
export interface GoalMilestone {
  id: string;
  goalId: string;
  title: string;
  done: boolean;
  sortOrder: number;
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
  photos: string[];
  date: string;
  updatedAt: string;
}

export type NoteFont = 'sans' | 'serif' | 'mono' | 'display';
export type NoteFontSize = 'sm' | 'md' | 'lg';
export type NoteAlign = 'left' | 'center' | 'right';

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  tags: string[];
  pinned: boolean;
  font: NoteFont;
  fontSize: NoteFontSize;
  align: NoteAlign;
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

export interface FriendUser {
  id: string;
  name: string;
  avatar: string | null;
}

export interface Friendship {
  id: string;
  since: string | null;
  friend: FriendUser;
}

export interface FriendRequest {
  id: string;
  createdAt: string;
  user: FriendUser;
}
