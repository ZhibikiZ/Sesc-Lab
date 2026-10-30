export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0); // Noon to avoid timezone day shifts
}

export function formatLongDatePtBR(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  const formatted = date.toLocaleDateString('pt-BR', options);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatShortDatePtBR(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const weekday = weekdayNames[date.getDay()];
  return `${weekday}, ${day}/${month}`;
}

export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  // Normalize time to midday (12:00:00) so timezone offsets or DST transitions never flip the day
  date.setHours(12, 0, 0, 0);
  const day = date.getDay();
  // day: 0 is Sun, 1 is Mon, 2 is Tue, etc.
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

export function getWeekDays(referenceDate: Date, includeSaturday = false): { dateKey: string; date: Date; isToday: boolean }[] {
  const monday = getMondayOfWeek(referenceDate);
  const daysCount = includeSaturday ? 6 : 5;
  const days = [];
  const todayKey = formatDateKey(new Date());

  for (let i = 0; i < daysCount; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    current.setHours(12, 0, 0, 0);
    const key = formatDateKey(current);
    days.push({
      dateKey: key,
      date: current,
      isToday: key === todayKey,
    });
  }

  return days;
}

export function isPastDate(dateKey: string): boolean {
  const todayKey = formatDateKey(new Date());
  return dateKey < todayKey;
}

export function formatDatePtBR(dateKey: string): string {
  const parts = dateKey.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateKey;
}
