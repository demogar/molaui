import type { PluralMessage } from '../../lib/messages'

/** The words Calendar says on its own. */
export interface CalendarMessages {
  /** The previous-month button's name. `{month}` is that month and year, as the locale writes them. */
  previousMonth: string
  /** The next-month button's name. `{month}` is that month and year, as the locale writes them. */
  nextMonth: string
}

export const calendarMessages: CalendarMessages = {
  previousMonth: 'Previous month, {month}',
  nextMonth: 'Next month, {month}',
}

/**
 * The sentences both date pickers refuse a typed or pressed day with. `{date}`
 * is a day as the locale writes it, `{typed}` what the person typed.
 */
export interface DateEntryMessages {
  /** A day before `min`. `{date}` is `min`. */
  tooEarly: string
  /** A day after `max`. `{date}` is `max`. */
  tooLate: string
  /** A day `isDateDisabled` refuses. `{date}` is that day. */
  unavailable: string
  /** Typed text that reads as a date that does not exist, 31/02. */
  notInCalendar: string
  /** The line that tells a screen reader the typed format. `{pattern}` is `DD/MM/YYYY` or the locale's order. */
  format: string
}

const dateEntryMessages: DateEntryMessages = {
  tooEarly: 'Choose {date} or later.',
  tooLate: 'Choose {date} or earlier.',
  unavailable: '{date} is not available. Choose another day.',
  notInCalendar: '{typed} does not exist in the calendar. Check the day and month.',
  format: 'Format: {pattern}',
}

/** The words DatePicker says on its own. */
export interface DatePickerMessages extends DateEntryMessages {
  /** Typed text that is not a date. `{pattern}` is the locale's order. */
  notADate: string
  /** The calendar button's name with no date chosen. */
  chooseDate: string
  /** The calendar button's name with a date. `{date}` is the date, in full. */
  changeDate: string
}

export const datePickerMessages: DatePickerMessages = {
  ...dateEntryMessages,
  notADate: '“{typed}” is not a date. Type it as {pattern}.',
  chooseDate: 'Choose date',
  changeDate: 'Change date, {date}',
}

/** The words DateRangePicker says on its own. */
export interface DateRangePickerMessages extends DateEntryMessages {
  /** The trigger's text with no range chosen, when `placeholder` is not set. */
  placeholder: string
  /** Typed text in the start input that is not a date. `{pattern}` is the locale's order. */
  notADateStart: string
  /** Typed text in the end input that is not a date. `{pattern}` is the locale's order. */
  notADateEnd: string
  /** A typed start after the end. `{date}` is the end. */
  startAfterEnd: string
  /** A typed end before the start. `{date}` is the start. */
  endBeforeStart: string
  /** The status line for a whole range. `{range}` is the period, `{count}` its days. */
  rangeChosen: PluralMessage
  /** The status line with only the start. `{date}` is the start. */
  startChosen: string
  /** The status line with only the end. `{date}` is the end. */
  endChosen: string
  /** The status line before either end is chosen. */
  chooseStart: string
  /** The start input's label. */
  startDate: string
  /** The end input's label. */
  endDate: string
  /** The name of the group of preset buttons. */
  presets: string
  /** The name of the group of typed inputs. */
  typeTheDates: string
  /** The labels of `defaultRangePresets`. A preset of your own carries its own label. */
  presetLabels: {
    last7Days: string
    last30Days: string
    last90Days: string
    thisMonth: string
    lastMonth: string
  }
}

export const dateRangePickerMessages: DateRangePickerMessages = {
  ...dateEntryMessages,
  placeholder: 'Choose a period',
  notADateStart: '“{typed}” is not a date. Type the start date as {pattern}.',
  notADateEnd: '“{typed}” is not a date. Type the end date as {pattern}.',
  startAfterEnd: 'The start date is after the end date, {date}. Choose that day or earlier.',
  endBeforeStart: 'The end date is before the start date, {date}. Choose that day or later.',
  rangeChosen: { one: '{range}, {count} day.', other: '{range}, {count} days.' },
  startChosen: 'Start {date}. Choose the end date.',
  endChosen: 'End {date}. Choose the start date.',
  chooseStart: 'Choose the start date.',
  startDate: 'Start date',
  endDate: 'End date',
  presets: 'Presets',
  typeTheDates: 'Type the dates',
  presetLabels: {
    last7Days: 'Last 7 days',
    last30Days: 'Last 30 days',
    last90Days: 'Last 90 days',
    thisMonth: 'This month',
    lastMonth: 'Last month',
  },
}
