const POST_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  // YAML calendar dates are parsed as UTC midnight. Formatting in the machine's
  // local timezone shifts them one day earlier anywhere west of UTC.
  timeZone: 'UTC',
});

export function formatPostDate(date: Date): string {
  return POST_DATE_FORMATTER.format(date);
}

export function serializePostDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
