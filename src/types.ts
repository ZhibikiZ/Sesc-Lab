export type ShiftType = 'matutino' | 'vespertino';

export interface LessonPeriod {
  number: number;
  label: string;
  timeRange?: string;
}

export interface Booking {
  id: string;
  date: string; // YYYY-MM-DD
  shift: ShiftType;
  lessonNumber: number;
  teacherName: string;
  subject?: string;
  grade: string;
  activityDescription?: string;
  equipment?: string[];
  studentCount?: number;
  notes?: string;
  isMaintenance?: boolean;
  createdAt: string;
}

export interface LabConfig {
  labName: string;
  coordinatorName: string;
  coordinatorContact: string;
  totalComputers: number;
  allowSelfCancellation: boolean;
  matutinoPeriods: LessonPeriod[];
  vespertinoPeriods: LessonPeriod[];
}

export interface NewBookingPayload {
  date: string;
  shift: ShiftType;
  lessonNumber: number;
  teacherName: string;
  subject?: string;
  grade: string;
  activityDescription?: string;
  equipment?: string[];
  studentCount?: number;
  notes?: string;
  isMaintenance?: boolean;
}
