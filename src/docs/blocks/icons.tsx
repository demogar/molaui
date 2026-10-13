import {
  ArrowDown,
  ArrowDownRight,
  ArrowDownToLine,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock,
  Columns3,
  Copy,
  Ellipsis,
  Inbox,
  Info,
  Lock,
  type LucideIcon,
  Menu,
  MessageSquareWarning,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  SearchX,
  ShieldAlert,
  Square,
  StepForward,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
  Upload,
  WifiOff,
  WrapText,
  Wrench,
  X,
} from 'lucide-react'

/**
 * Every Lucide icon a shipped component draws, with the one meaning it has
 * in this system. icons.test.ts compares this list with the components'
 * imports, so a component that starts using a new icon fails until the
 * icon is listed here with its meaning.
 */
export const ICONS: { name: string; Icon: LucideIcon; means: string }[] = [
  { name: 'Check', Icon: Check, means: 'Chosen, done or approved' },
  { name: 'X', Icon: X, means: 'Close, dismiss, remove or clear' },
  { name: 'Plus', Icon: Plus, means: 'Expand in place (turns into a cross); increase' },
  { name: 'Minus', Icon: Minus, means: 'Decrease; partly selected; no change' },
  { name: 'RotateCcw', Icon: RotateCcw, means: 'Retry' },
  { name: 'StepForward', Icon: StepForward, means: 'Retry from a step' },
  { name: 'Copy', Icon: Copy, means: 'Copy to the clipboard' },
  { name: 'Search', Icon: Search, means: 'Search or filter' },
  { name: 'SearchX', Icon: SearchX, means: 'No results' },
  { name: 'ChevronLeft', Icon: ChevronLeft, means: 'Back: previous page or month' },
  { name: 'ChevronRight', Icon: ChevronRight, means: 'Forward: next page or month, a submenu' },
  { name: 'ChevronsUpDown', Icon: ChevronsUpDown, means: 'Opens a list of options' },
  { name: 'ArrowRight', Icon: ArrowRight, means: 'A button that moves you on' },
  { name: 'ArrowUpDown', Icon: ArrowUpDown, means: 'Sortable, not sorted' },
  { name: 'ArrowUp', Icon: ArrowUp, means: 'Sorted ascending; send a prompt' },
  { name: 'ArrowDown', Icon: ArrowDown, means: 'Sorted descending; jump to latest' },
  { name: 'ArrowUpRight', Icon: ArrowUpRight, means: 'Trend up; opens a source' },
  { name: 'ArrowDownRight', Icon: ArrowDownRight, means: 'Trend down' },
  { name: 'Square', Icon: Square, means: 'Stop a response, cancel a run' },
  { name: 'Ellipsis', Icon: Ellipsis, means: 'More actions' },
  { name: 'Menu', Icon: Menu, means: 'Open navigation' },
  { name: 'PanelLeftClose', Icon: PanelLeftClose, means: 'Collapse the sidebar' },
  { name: 'PanelLeftOpen', Icon: PanelLeftOpen, means: 'Expand the sidebar' },
  { name: 'Columns3', Icon: Columns3, means: 'Choose columns' },
  { name: 'WrapText', Icon: WrapText, means: 'Wrap long lines' },
  { name: 'CalendarDays', Icon: CalendarDays, means: 'Pick a date' },
  { name: 'Upload', Icon: Upload, means: 'Upload' },
  { name: 'ArrowDownToLine', Icon: ArrowDownToLine, means: 'Drop files here' },
  { name: 'Paperclip', Icon: Paperclip, means: 'An attached file' },
  { name: 'Clock', Icon: Clock, means: 'Queued' },
  { name: 'Info', Icon: Info, means: 'Information, a neutral note' },
  { name: 'CircleCheck', Icon: CircleCheck, means: 'Success' },
  { name: 'CircleAlert', Icon: CircleAlert, means: 'Danger, an error' },
  { name: 'TriangleAlert', Icon: TriangleAlert, means: 'Warning; a failed upload' },
  { name: 'CircleHelp', Icon: CircleHelp, means: 'Uncertain' },
  { name: 'ShieldAlert', Icon: ShieldAlert, means: 'Needs approval before it runs' },
  { name: 'Wrench', Icon: Wrench, means: 'A tool call' },
  { name: 'MessageSquareWarning', Icon: MessageSquareWarning, means: 'Changes requested' },
  { name: 'ThumbsUp', Icon: ThumbsUp, means: 'Good response' },
  { name: 'ThumbsDown', Icon: ThumbsDown, means: 'Bad response' },
  { name: 'WifiOff', Icon: WifiOff, means: 'Offline' },
  { name: 'Inbox', Icon: Inbox, means: 'Nothing here yet' },
  { name: 'Lock', Icon: Lock, means: 'No access' },
]

export function IconSet() {
  return (
    <ul className="sb-unstyled not-prose my-6 grid list-none grid-cols-1 bg-cloth-pale p-0 font-ui text-sm text-ink shadow-cut sm:grid-cols-2 lg:grid-cols-3">
      {ICONS.map(({ name, Icon, means }) => (
        <li key={name} className="m-0 -mt-px flex items-start gap-3 border-t border-keyline p-3">
          <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span className="grid gap-0.5">
            <code className="literal text-xs text-ink-muted">{name}</code>
            <span className="text-ink-2">{means}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
