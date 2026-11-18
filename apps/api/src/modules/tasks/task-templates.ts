import { Prisma } from '@/generated/prisma/client';
import { activityText } from '@/modules/activities/activity-templates';

/**
 * E2E-9: the tasks the system makes on its own, as a template key plus raw
 * values, so the web app shows the title in the reader's language
 * (tasks:autoTitles.<key>), the way activities and notifications work. The
 * English here is what's stored in Task.title: the fallback, and what search
 * and exports see. A person editing the title takes the task over, and the
 * key is dropped (TasksService.update).
 */
const TASK_TEMPLATES = {
  // Made when a lead is created; done once the lead converts.
  firstContactCall: (p: { name: string }) => `Call ${p.name}`,
  // Made at reservation; done once the contract is signed.
  confirmDealDocuments: (p: { dealNumber: string }) =>
    `Confirm documents for deal ${p.dealNumber}`,
} as const;

export type TaskTemplateKey = keyof typeof TASK_TEMPLATES;
type ParamsOf<K extends TaskTemplateKey> = Parameters<(typeof TASK_TEMPLATES)[K]>[0];

export type TaskTitle = {
  title: string;
  templateKey: TaskTemplateKey;
  templateParams: Record<string, string>;
};

export function taskText<K extends TaskTemplateKey>(key: K, params: ParamsOf<K>): TaskTitle {
  const render = TASK_TEMPLATES[key] as (p: ParamsOf<K>) => string;
  return { title: render(params), templateKey: key, templateParams: { ...params } };
}

type TaskRef = { title: string; templateKey?: string | null; templateParams?: unknown };

/**
 * What a notification or activity about a task carries next to its English
 * title, so the web app can name a system task in the reader's language.
 */
export function taskTitleTemplate(task: { templateKey?: string | null; templateParams?: unknown }) {
  return task.templateKey
    ? { taskTemplateKey: task.templateKey, taskTemplateParams: task.templateParams as Record<string, string> }
    : {};
}

type TaskActivityKey =
  | 'taskCreated' | 'taskAutoCreated' | 'taskAutoCompleted' | 'taskReassigned' | 'taskCompleted'
  | 'taskStatusChanged' | 'taskUpdated' | 'taskRestored' | 'taskCancelledWithDeal';

/** activityText(key, { task: title }), plus the task's own template. */
export function taskActivityText(key: TaskActivityKey, task: TaskRef) {
  const text = activityText(key, { task: task.title });
  return {
    ...text,
    templateParams: { ...text.templateParams, ...taskTitleTemplate(task) } as Prisma.InputJsonValue,
  };
}
