/** The words TimePicker says on its own. */
export interface TimePickerMessages {
  /** The hour segment's name. */
  hour: string
  /** The minute segment's name. */
  minute: string
  /** The day-period segment's name, on a 12-hour clock. */
  dayPeriod: string
  /** What a screen reader hears for a segment with nothing in it. */
  empty: string
  /** A time left with a segment empty. */
  incomplete: string
  /** A time before `min`. `{time}` is `min` as the locale writes it. */
  tooEarly: string
  /** A time after `max`. `{time}` is `max` as the locale writes it. */
  tooLate: string
}

export const timePickerMessages: TimePickerMessages = {
  hour: 'Hour',
  minute: 'Minute',
  dayPeriod: 'AM/PM',
  empty: 'Empty',
  incomplete: 'Enter the hour and the minutes.',
  tooEarly: 'Choose {time} or later.',
  tooLate: 'Choose {time} or earlier.',
}

/**
 * The words DateTimePicker says on its own, and the TimePicker words it
 * hands to its time half. The time half reads them from here rather than
 * from the `timePicker` table, so one table words the whole control; in
 * `tooEarly` and `tooLate`, `{time}` is the whole moment, date and time.
 */
export interface DateTimePickerMessages extends TimePickerMessages {
  /** The word that names the date half, read after the field's label: "Departure Date". */
  date: string
  /** The word that names the time half, read after the field's label: "Departure Time". */
  time: string
}

export const dateTimePickerMessages: DateTimePickerMessages = {
  ...timePickerMessages,
  date: 'Date',
  time: 'Time',
}
