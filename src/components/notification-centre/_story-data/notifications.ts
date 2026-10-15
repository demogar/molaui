/**
 * STORY-ONLY. Cayuco notifications shared by the notification centre's
 * stories and the app shell's, so both show the same morning. Not exported
 * from the package.
 */
import type { NotificationItem } from '../notification-centre'

export const cayucoNotifications = (onAction: (label: string) => void = () => {}): NotificationItem[] => [
  {
    id: 'n1',
    tone: 'danger',
    title: 'Re-index failed for Billing FAQ',
    description: '812 of 1,204 documents · embedding quota reached',
    time: '4 min ago',
    dateTime: '2026-10-14T09:56:00Z',
    action: { label: 'View run', onClick: () => onAction('View run') },
  },
  {
    id: 'n2',
    tone: 'warn',
    title: 'Refund agent is waiting for approval',
    description: 'Order CY-20931 · $184.00 over the auto-approve limit',
    time: '18 min ago',
    dateTime: '2026-10-14T09:42:00Z',
    action: { label: 'Review', onClick: () => onAction('Review') },
  },
  {
    id: 'n3',
    tone: 'success',
    title: 'Evaluation passed for Returns triage v4',
    description: '298 of 300 prompts matched the reference answer',
    time: '1 h ago',
    dateTime: '2026-10-14T09:00:00Z',
    read: true,
  },
  {
    id: 'n4',
    tone: 'neutral',
    title: 'Ana Pérez shared the Escalations view with you',
    time: 'Yesterday 16:20',
    dateTime: '2026-10-13T16:20:00Z',
    read: true,
  },
]
