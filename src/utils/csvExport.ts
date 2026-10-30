import { Booking, ShiftType } from '../types';
import { formatDatePtBR, parseDateKey, formatDateKey } from './dateUtils';

export interface CSVExportOptions {
  delimiter?: ';' | ',';
  shiftFilter?: 'all' | ShiftType;
}

const LESSON_TIMES: Record<string, Record<number, string>> = {
  matutino: {
    1: '07:00 - 07:50',
    2: '07:50 - 08:40',
    3: '08:55 - 09:45',
    4: '09:45 - 10:35',
    5: '10:35 - 11:25',
  },
  vespertino: {
    1: '13:00 - 13:50',
    2: '13:50 - 14:40',
    3: '14:55 - 15:45',
  },
};

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export function escapeCSVValue(val: unknown): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
  return `"${str}"`;
}

/**
 * Generates RFC 4180 compliant CSV text with UTF-8 BOM for seamless Excel compatibility in Brazil.
 */
export function generateBookingsCSV(
  bookings: Booking[],
  options: CSVExportOptions = {}
): string {
  const delimiter = options.delimiter || ';';
  const shiftFilter = options.shiftFilter || 'all';

  // Filter if shiftFilter specified
  let filtered = bookings;
  if (shiftFilter !== 'all') {
    filtered = filtered.filter((b) => b.shift === shiftFilter);
  }

  // Sort chronologically: date -> shift (matutino first) -> lessonNumber
  const sorted = [...filtered].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.shift !== b.shift) return a.shift === 'matutino' ? -1 : 1;
    return a.lessonNumber - b.lessonNumber;
  });

  const headers = [
    'Data (ISO)',
    'Data Formatada',
    'Dia da Semana',
    'Turno',
    'Aula',
    'Horário Previsto',
    'Professor(a)',
    'Disciplina',
    'Turma',
    'Descrição da Atividade',
    'Equipamentos Solicitados',
    'Qtd. Alunos',
    'Observações',
    'Tipo de Agendamento',
    'Data de Registro',
  ];

  const rows = sorted.map((b) => {
    const dateObj = parseDateKey(b.date);
    const dayOfWeek = WEEKDAY_NAMES[dateObj.getDay()] || '';
    const shiftLabel = b.shift === 'matutino' ? 'Matutino' : 'Vespertino';
    const lessonLabel = `${b.lessonNumber}ª Aula`;
    const timeRange = LESSON_TIMES[b.shift]?.[b.lessonNumber] || '';
    const teacher = b.isMaintenance ? '[MANUTENÇÃO DO LABORATÓRIO]' : b.teacherName;
    const equipment = (b.equipment || []).join(', ');
    const bookingType = b.isMaintenance ? 'Manutenção' : 'Reserva de Aula';
    const createdStr = b.createdAt ? new Date(b.createdAt).toLocaleString('pt-BR') : '';

    return [
      escapeCSVValue(b.date),
      escapeCSVValue(formatDatePtBR(b.date)),
      escapeCSVValue(dayOfWeek),
      escapeCSVValue(shiftLabel),
      escapeCSVValue(lessonLabel),
      escapeCSVValue(timeRange),
      escapeCSVValue(teacher),
      escapeCSVValue(b.subject || ''),
      escapeCSVValue(b.grade || ''),
      escapeCSVValue(b.activityDescription || ''),
      escapeCSVValue(equipment),
      escapeCSVValue(b.studentCount != null ? b.studentCount : ''),
      escapeCSVValue(b.notes || ''),
      escapeCSVValue(bookingType),
      escapeCSVValue(createdStr),
    ].join(delimiter);
  });

  const headerLine = headers.map((h) => escapeCSVValue(h)).join(delimiter);
  // Prepend UTF-8 BOM (\uFEFF) to guarantee Excel in Brazil and international decodes accents properly
  return '\uFEFF' + [headerLine, ...rows].join('\r\n');
}

/**
 * Triggers a browser download of the CSV content.
 */
export function downloadCSVFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getWeekCSVFilename(startDateKey: string, endDateKey: string): string {
  return `agendamentos_laboratorio_semana_${startDateKey}_a_${endDateKey}.csv`;
}

export function getAllBookingsCSVFilename(): string {
  const todayKey = formatDateKey(new Date());
  return `agendamentos_laboratorio_completo_${todayKey}.csv`;
}
