/**
 * Every word the components say on their own, in English, by component.
 *
 * Each component keeps its own table in a `messages.ts` beside it and imports
 * only that, so a page that uses `Button` does not ship the agent console's
 * sentences. This file gathers them for the two readers that want all of
 * them: a translator, who starts from `defaultMessages`, and the type of
 * `MessagesProvider`'s `messages`. src/test/messages.test.ts fails a
 * component that renders an English string literal instead of reading one of
 * these tables, and a table that is missing here.
 */
import { type AgentRunMessages, agentRunMessages } from '../components/ai/agent-run/messages'
import {
  type ChangeCountMessages,
  type ChangeReviewMessages,
  type FieldChangesMessages,
  type FileDiffMessages,
  changeCountMessages,
  changeReviewMessages,
  fieldChangesMessages,
  fileDiffMessages,
} from '../components/ai/change-review/messages'
import {
  type ConfidenceMessages,
  type UncertaintyNoteMessages,
  confidenceMessages,
  uncertaintyNoteMessages,
} from '../components/ai/confidence/messages'
import { type MarkdownMessages, markdownMessages } from '../components/ai/markdown/messages'
import { type MessageMessages, type ThreadMessages, messageMessages, threadMessages } from '../components/ai/message/messages'
import {
  type AttachmentChipMessages,
  type PromptInputMessages,
  attachmentChipMessages,
  promptInputMessages,
} from '../components/ai/prompt-input/messages'
import { type ReasoningMessages, reasoningMessages } from '../components/ai/reasoning/messages'
import {
  type PartialOutputMessages,
  type RunErrorMessages,
  partialOutputMessages,
  runErrorMessages,
} from '../components/ai/run-error/messages'
import { type RunStatusMessages, runStatusMessages } from '../components/ai/run-status/messages'
import { type SideBySideDiffMessages, sideBySideDiffMessages } from '../components/ai/side-by-side-diff/messages'
import { type SourcesMessages, sourcesMessages } from '../components/ai/sources/messages'
import { type StreamingTextMessages, streamingTextMessages } from '../components/ai/streaming-text/messages'
import { type TokenUsageMessages, tokenUsageMessages } from '../components/ai/token-usage/messages'
import {
  type ToolCallGroupMessages,
  type ToolCallMessages,
  toolCallGroupMessages,
  toolCallMessages,
} from '../components/ai/tool-call/messages'
import { type AppShellMessages, appShellMessages } from '../components/app-shell/messages'
import { type AvatarGroupMessages, avatarGroupMessages } from '../components/avatar/messages'
import { type RecommendationBadgeMessages, recommendationBadgeMessages } from '../components/badge/messages'
import { type BannerMessages, bannerMessages } from '../components/banner/messages'
import { type BreadcrumbMessages, breadcrumbMessages } from '../components/breadcrumb/messages'
import { type CalloutMessages, calloutMessages } from '../components/callout/messages'
import { type CodeBlockMessages, codeBlockMessages } from '../components/code/messages'
import {
  type AutocompleteMessages,
  type ComboboxMessages,
  autocompleteMessages,
  comboboxMessages,
} from '../components/combobox/messages'
import { type CommandPaletteMessages, commandPaletteMessages } from '../components/command/messages'
import {
  type CalendarMessages,
  type DatePickerMessages,
  type DateRangePickerMessages,
  calendarMessages,
  datePickerMessages,
  dateRangePickerMessages,
} from '../components/date-picker/messages'
import { type AlertDialogMessages, type DialogMessages, alertDialogMessages, dialogMessages } from '../components/dialog/messages'
import { type DrawerMessages, drawerMessages } from '../components/drawer/messages'
import { type LabelMessages, type SearchInputMessages, labelMessages, searchInputMessages } from '../components/field/messages'
import { type FileUploadMessageTemplates, fileUploadMessages } from '../components/file-upload/messages'
import { type FormErrorSummaryMessages, formErrorSummaryMessages } from '../components/form/messages'
import { type LinkMessages, linkMessages } from '../components/link/messages'
import { type NotificationsMessages, notificationsMessages } from '../components/notification-centre/messages'
import { type NumberInputMessages, numberInputMessages } from '../components/number-input/messages'
import { type PaginationMessages, paginationMessages } from '../components/pagination/messages'
import { type PlaceholderMessages, placeholderMessages } from '../components/placeholder/messages'
import { type SelectMessages, selectMessages } from '../components/select/messages'
import {
  type HotkeysMessages,
  type ShortcutsDialogMessages,
  hotkeysMessages,
  shortcutsDialogMessages,
} from '../components/shortcuts/messages'
import { type StatMessages, statMessages } from '../components/stat/messages'
import { type StepperMessages, stepperMessages } from '../components/stepper/messages'
import { type DataTableMessages, type TableMessages, dataTableMessages, tableMessages } from '../components/table/messages'
import { type TagGroupMessages, tagGroupMessages } from '../components/tag-group/messages'
import {
  type DateTimePickerMessages,
  type TimePickerMessages,
  dateTimePickerMessages,
  timePickerMessages,
} from '../components/time-picker/messages'
import { type ToastMessages, toastMessages } from '../components/toast/messages'
import { type ToolbarOverflowMessages, toolbarOverflowMessages } from '../components/toolbar/messages'
import { type TooltipMessages, tooltipMessages } from '../components/tooltip/messages'

/** Each component's table type, so a translation can be typed one component at a time. */
export type {
  AgentRunMessages,
  AlertDialogMessages,
  AppShellMessages,
  AttachmentChipMessages,
  AutocompleteMessages,
  AvatarGroupMessages,
  BannerMessages,
  BreadcrumbMessages,
  CalendarMessages,
  CalloutMessages,
  ChangeCountMessages,
  ChangeReviewMessages,
  CodeBlockMessages,
  ComboboxMessages,
  CommandPaletteMessages,
  ConfidenceMessages,
  DataTableMessages,
  DatePickerMessages,
  DateRangePickerMessages,
  DateTimePickerMessages,
  DialogMessages,
  DrawerMessages,
  FieldChangesMessages,
  FileDiffMessages,
  FileUploadMessageTemplates,
  FormErrorSummaryMessages,
  HotkeysMessages,
  LabelMessages,
  LinkMessages,
  MarkdownMessages,
  MessageMessages,
  NotificationsMessages,
  NumberInputMessages,
  PaginationMessages,
  PartialOutputMessages,
  PlaceholderMessages,
  PromptInputMessages,
  ReasoningMessages,
  RecommendationBadgeMessages,
  RunErrorMessages,
  RunStatusMessages,
  SearchInputMessages,
  SelectMessages,
  ShortcutsDialogMessages,
  SideBySideDiffMessages,
  SourcesMessages,
  StatMessages,
  StepperMessages,
  StreamingTextMessages,
  TableMessages,
  TagGroupMessages,
  ThreadMessages,
  TimePickerMessages,
  ToastMessages,
  TokenUsageMessages,
  ToolCallGroupMessages,
  ToolCallMessages,
  ToolbarOverflowMessages,
  TooltipMessages,
  UncertaintyNoteMessages,
}

/** The part DatePicker and DateRangePicker share. */
export type { DateEntryMessages } from '../components/date-picker/messages'

export interface MolaMessages {
  agentRun: AgentRunMessages
  alertDialog: AlertDialogMessages
  appShell: AppShellMessages
  attachmentChip: AttachmentChipMessages
  autocomplete: AutocompleteMessages
  avatarGroup: AvatarGroupMessages
  banner: BannerMessages
  breadcrumb: BreadcrumbMessages
  calendar: CalendarMessages
  callout: CalloutMessages
  changeCount: ChangeCountMessages
  changeReview: ChangeReviewMessages
  codeBlock: CodeBlockMessages
  combobox: ComboboxMessages
  commandPalette: CommandPaletteMessages
  confidence: ConfidenceMessages
  dataTable: DataTableMessages
  datePicker: DatePickerMessages
  dateRangePicker: DateRangePickerMessages
  dateTimePicker: DateTimePickerMessages
  dialog: DialogMessages
  drawer: DrawerMessages
  fieldChanges: FieldChangesMessages
  fileDiff: FileDiffMessages
  fileUpload: FileUploadMessageTemplates
  formErrorSummary: FormErrorSummaryMessages
  hotkeys: HotkeysMessages
  label: LabelMessages
  link: LinkMessages
  markdown: MarkdownMessages
  message: MessageMessages
  notifications: NotificationsMessages
  numberInput: NumberInputMessages
  pagination: PaginationMessages
  partialOutput: PartialOutputMessages
  placeholder: PlaceholderMessages
  promptInput: PromptInputMessages
  reasoning: ReasoningMessages
  recommendationBadge: RecommendationBadgeMessages
  runError: RunErrorMessages
  runStatus: RunStatusMessages
  searchInput: SearchInputMessages
  select: SelectMessages
  shortcutsDialog: ShortcutsDialogMessages
  sideBySideDiff: SideBySideDiffMessages
  sources: SourcesMessages
  stat: StatMessages
  stepper: StepperMessages
  streamingText: StreamingTextMessages
  table: TableMessages
  tagGroup: TagGroupMessages
  thread: ThreadMessages
  timePicker: TimePickerMessages
  toast: ToastMessages
  tokenUsage: TokenUsageMessages
  toolCall: ToolCallMessages
  toolCallGroup: ToolCallGroupMessages
  toolbarOverflow: ToolbarOverflowMessages
  tooltip: TooltipMessages
  uncertaintyNote: UncertaintyNoteMessages
}

export const defaultMessages: MolaMessages = {
  agentRun: agentRunMessages,
  alertDialog: alertDialogMessages,
  appShell: appShellMessages,
  attachmentChip: attachmentChipMessages,
  autocomplete: autocompleteMessages,
  avatarGroup: avatarGroupMessages,
  banner: bannerMessages,
  breadcrumb: breadcrumbMessages,
  calendar: calendarMessages,
  callout: calloutMessages,
  changeCount: changeCountMessages,
  changeReview: changeReviewMessages,
  codeBlock: codeBlockMessages,
  combobox: comboboxMessages,
  commandPalette: commandPaletteMessages,
  confidence: confidenceMessages,
  dataTable: dataTableMessages,
  datePicker: datePickerMessages,
  dateRangePicker: dateRangePickerMessages,
  dateTimePicker: dateTimePickerMessages,
  dialog: dialogMessages,
  drawer: drawerMessages,
  fieldChanges: fieldChangesMessages,
  fileDiff: fileDiffMessages,
  fileUpload: fileUploadMessages,
  formErrorSummary: formErrorSummaryMessages,
  hotkeys: hotkeysMessages,
  label: labelMessages,
  link: linkMessages,
  markdown: markdownMessages,
  message: messageMessages,
  notifications: notificationsMessages,
  numberInput: numberInputMessages,
  pagination: paginationMessages,
  partialOutput: partialOutputMessages,
  placeholder: placeholderMessages,
  promptInput: promptInputMessages,
  reasoning: reasoningMessages,
  recommendationBadge: recommendationBadgeMessages,
  runError: runErrorMessages,
  runStatus: runStatusMessages,
  searchInput: searchInputMessages,
  select: selectMessages,
  shortcutsDialog: shortcutsDialogMessages,
  sideBySideDiff: sideBySideDiffMessages,
  sources: sourcesMessages,
  stat: statMessages,
  stepper: stepperMessages,
  streamingText: streamingTextMessages,
  table: tableMessages,
  tagGroup: tagGroupMessages,
  thread: threadMessages,
  timePicker: timePickerMessages,
  toast: toastMessages,
  tokenUsage: tokenUsageMessages,
  toolCall: toolCallMessages,
  toolCallGroup: toolCallGroupMessages,
  toolbarOverflow: toolbarOverflowMessages,
  tooltip: tooltipMessages,
  uncertaintyNote: uncertaintyNoteMessages,
}
