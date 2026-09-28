import type { IssuePriority, IssueStatus } from '../../types.js';

export const ISSUE_STATUSES: readonly IssueStatus[] = ['open', 'in_triage', 'resolved', 'closed'];
export const ISSUE_PRIORITIES: readonly IssuePriority[] = ['P0', 'P1', 'P2'];

export function isIssueStatus(value: string): value is IssueStatus {
  return ISSUE_STATUSES.some(status => status === value);
}
export function isIssuePriority(value: string): value is IssuePriority {
  return ISSUE_PRIORITIES.some(priority => priority === value);
}
export function issueQueuePath(status: IssueStatus | '', priority: IssuePriority | ''): string {
  const query = new URLSearchParams({ limit: '20' });
  if (status) query.set('status', status);
  if (priority) query.set('priority', priority);
  return `/admin/issues?${query}`;
}

/** Keep the original key/body after ambiguous failures so retries cannot duplicate notes. */
export function isAmbiguousMutation(status: number | undefined): boolean {
  return status === undefined || status === 408 || status >= 500;
}
