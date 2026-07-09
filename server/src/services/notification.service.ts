import { and, eq, gte, isNull, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tasks, calendarEvents } from '../db/schema/index.js';

export interface Notification {
  id: string;
  type: 'task_due' | 'event_soon' | 'info';
  title: string;
  message: string;
  at: string;
}

/**
 * Compute in-app notifications for a user: tasks due today/overdue and events
 * starting within the next 24h. This is intentionally pull-based (queried on
 * demand by the client) so it works on serverless without a background worker.
 */
export async function getNotifications(userId: string): Promise<Notification[]> {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [dueTasks, upcomingEvents] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
          lte(tasks.dueDate, endOfDay),
        ),
      ),
    db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, userId),
          isNull(calendarEvents.deletedAt),
          gte(calendarEvents.startTime, now),
          lte(calendarEvents.startTime, in24h),
        ),
      ),
  ]);

  const notifications: Notification[] = [];

  for (const t of dueTasks) {
    if (t.status === 'done') continue;
    const overdue = t.dueDate ? t.dueDate < now : false;
    notifications.push({
      id: `task-${t.id}`,
      type: 'task_due',
      title: overdue ? 'Task overdue' : 'Task due today',
      message: t.title,
      at: (t.dueDate ?? now).toISOString(),
    });
  }

  for (const e of upcomingEvents) {
    notifications.push({
      id: `event-${e.id}`,
      type: 'event_soon',
      title: 'Upcoming event',
      message: `${e.title} at ${e.startTime.toLocaleString()}`,
      at: e.startTime.toISOString(),
    });
  }

  notifications.sort((a, b) => a.at.localeCompare(b.at));
  return notifications;
}
