import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  BookOpen,
  Calendar,
  Sparkles,
  Info,
  CheckCircle,
} from 'lucide-react';
import { Booking, ShiftType } from '../types';
import { DEFAULT_MATUTINO_PERIODS, DEFAULT_VESPERTINO_PERIODS } from '../constants';
import { formatShortDatePtBR, formatLongDatePtBR, formatDateKey } from '../utils/dateUtils';

interface WeekViewProps {
  currentDate: Date;
  onNavigateWeek: (direction: 'prev' | 'next' | 'today') => void;
  weekDays: { dateKey: string; date: Date; isToday: boolean }[];
  bookings: Booking[];
  shiftFilter: 'all' | 'matutino' | 'vespertino';
  searchQuery: string;
  onSlotClick: (dateKey: string, shift: ShiftType, lessonNumber: number) => void;
  onBookingClick: (booking: Booking) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  onNavigateWeek,
  weekDays,
  bookings,
  shiftFilter,
  searchQuery,
  onSlotClick,
  onBookingClick,
}) => {
  // Find booking for specific date, shift, and lesson
  const getBooking = (dateKey: string, shift: ShiftType, lessonNumber: number) => {
    return bookings.find(
      (b) =>
        b.date === dateKey &&
        b.shift === shift &&
        Number(b.lessonNumber) === Number(lessonNumber)
    );
  };

  const firstDay = weekDays[0];
  const lastDay = weekDays[weekDays.length - 1];

  // Colors for subjects/teachers to give visual distinction
  const getBadgeStyle = (booking: Booking) => {
    if (booking.isMaintenance) {
      return {
        bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900',
        badge: 'bg-amber-200 text-amber-900',
      };
    }
    // Deterministic hue based on teacher name
    const hash = booking.teacherName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const variants = [
      { bg: 'bg-sky-50/90 hover:bg-sky-100 border-sky-200 text-sky-950', badge: 'bg-sky-200 text-sky-900' },
      { bg: 'bg-emerald-50/90 hover:bg-emerald-100 border-emerald-200 text-emerald-950', badge: 'bg-emerald-200 text-emerald-900' },
      { bg: 'bg-indigo-50/90 hover:bg-indigo-100 border-indigo-200 text-indigo-950', badge: 'bg-indigo-200 text-indigo-900' },
      { bg: 'bg-purple-50/90 hover:bg-purple-100 border-purple-200 text-purple-950', badge: 'bg-purple-200 text-purple-900' },
      { bg: 'bg-teal-50/90 hover:bg-teal-100 border-teal-200 text-teal-950', badge: 'bg-teal-200 text-teal-900' },
      { bg: 'bg-rose-50/90 hover:bg-rose-100 border-rose-200 text-rose-950', badge: 'bg-rose-200 text-rose-900' },
    ];
    return variants[hash % variants.length];
  };

  const matchesSearch = (b: Booking) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.teacherName.toLowerCase().includes(q) ||
      (b.subject ? b.subject.toLowerCase().includes(q) : false) ||
      (b.grade ? b.grade.toLowerCase().includes(q) : false) ||
      (b.notes ? b.notes.toLowerCase().includes(q) : false)
    );
  };

  return (
    <div className="space-y-4">
      {/* Week Navigator Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="prev-week-btn"
            onClick={() => onNavigateWeek('prev')}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            title="Semana anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            id="today-week-btn"
            onClick={() => onNavigateWeek('today')}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Semana Atual (Hoje)
          </button>

          <button
            type="button"
            id="next-week-btn"
            onClick={() => onNavigateWeek('next')}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            title="Próxima semana"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="ml-2 font-bold text-slate-800 text-sm sm:text-base">
            {firstDay && lastDay ? (
              <span>
                {formatShortDatePtBR(firstDay.dateKey)} até {formatShortDatePtBR(lastDay.dateKey)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-3 h-3 rounded-md bg-white border-2 border-dashed border-emerald-400"></span>
            <span>Horário Livre (+ Agendar)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-3 h-3 rounded-md bg-sky-200 border border-sky-300"></span>
            <span>Ocupado por Professor</span>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            {/* Table Header: Days of the Week */}
            <thead>
              <tr className="bg-slate-900 text-white text-left">
                <th className="p-3 w-28 text-center text-xs font-semibold uppercase tracking-wider text-slate-300 border-r border-slate-800">
                  Aula
                </th>
                {weekDays.map((day) => (
                  <th
                    key={day.dateKey}
                    className={`p-3 text-center border-r border-slate-800 last:border-r-0 ${
                      day.isToday ? 'bg-emerald-950/80 text-emerald-200 font-bold' : ''
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wide text-slate-300 font-medium">
                      {day.date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </div>
                    <div className="text-sm font-bold mt-0.5">
                      {day.date.getDate()} de {day.date.toLocaleDateString('pt-BR', { month: 'short' })}
                    </div>
                    {day.isToday && (
                      <span className="inline-block mt-1 text-[10px] font-extrabold bg-emerald-500 text-slate-950 px-2 py-0.2 rounded-full uppercase">
                        Hoje
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* SECTION: TURNO MATUTINO */}
              {(shiftFilter === 'all' || shiftFilter === 'matutino') && (
                <>
                  <tr className="bg-amber-100 border-y border-amber-300">
                    <td
                      colSpan={weekDays.length + 1}
                      className="px-4 py-2.5 text-xs font-bold text-amber-950 uppercase tracking-wider bg-amber-100"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-base">☀️</span>
                        <span>TURNO MATUTINO (5 AULAS)</span>
                      </div>
                    </td>
                  </tr>

                  {DEFAULT_MATUTINO_PERIODS.map((period) => (
                    <tr
                      key={`matutino-${period.number}`}
                      className="border-b border-slate-100 hover:bg-slate-50/40 transition"
                    >
                      {/* Period Column */}
                      <td className="p-2.5 border-r border-slate-200 bg-slate-50/70 text-slate-700 text-center align-middle">
                        <div className="font-bold text-xs text-slate-900">{period.label}</div>
                      </td>

                      {/* Day Columns */}
                      {weekDays.map((day) => {
                        const booking = getBooking(day.dateKey, 'matutino', period.number);
                        const isHighlighted = booking && matchesSearch(booking);
                        const isDimmed = booking && searchQuery.trim() && !matchesSearch(booking);

                        return (
                          <td
                            key={`${day.dateKey}-matutino-${period.number}`}
                            className={`p-2 border-r border-slate-200 last:border-r-0 align-top h-24 ${
                              day.isToday ? 'bg-emerald-50/20' : ''
                            } ${isDimmed ? 'opacity-30' : ''}`}
                          >
                            {booking ? (
                              <button
                                type="button"
                                id={`booking-card-${booking.id}`}
                                onClick={() => onBookingClick(booking)}
                                className={`w-full h-full text-left p-2.5 rounded-xl border transition shadow-xs flex flex-col justify-between ${
                                  getBadgeStyle(booking).bg
                                } ${isHighlighted && searchQuery ? 'ring-2 ring-emerald-500' : ''}`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1">
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded leading-none ${
                                        getBadgeStyle(booking).badge
                                      }`}
                                    >
                                      {booking.grade || 'Aula'}
                                    </span>
                                    {booking.equipment && booking.equipment.length > 0 && (
                                      <span className="text-[10px] text-slate-500" title={booking.equipment.join(', ')}>
                                        💻 {booking.equipment.length}
                                      </span>
                                    )}
                                  </div>

                                  <div className="font-bold text-xs text-slate-900 mt-1 line-clamp-1">
                                    {booking.teacherName}
                                  </div>
                                  {booking.subject ? (
                                    <div className="text-[11px] text-slate-600 line-clamp-1">
                                      {booking.subject}
                                    </div>
                                  ) : booking.notes ? (
                                    <div className="text-[10px] text-slate-500 line-clamp-1 italic">
                                      {booking.notes}
                                    </div>
                                  ) : null}
                                </div>

                                {booking.activityDescription && booking.activityDescription !== booking.notes && (
                                  <div className="text-[10px] text-slate-500 line-clamp-1 italic mt-1 border-t border-slate-200/60 pt-1">
                                    {booking.activityDescription}
                                  </div>
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                id={`empty-slot-${day.dateKey}-matutino-${period.number}`}
                                onClick={() => onSlotClick(day.dateKey, 'matutino', period.number)}
                                className="w-full h-full min-h-[72px] border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 rounded-xl transition flex flex-col items-center justify-center p-2 group text-slate-400 hover:text-emerald-700"
                              >
                                <Plus className="w-4 h-4 mb-0.5 group-hover:scale-125 transition-transform" />
                                <span className="text-[10px] font-medium">Disponível</span>
                                <span className="text-[9px] text-slate-400 group-hover:text-emerald-600">
                                  + Agendar
                                </span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              )}

              {/* SECTION: TURNO VESPERTINO */}
              {(shiftFilter === 'all' || shiftFilter === 'vespertino') && (
                <>
                  <tr className="bg-orange-100 border-y border-orange-300">
                    <td
                      colSpan={weekDays.length + 1}
                      className="px-4 py-2.5 text-xs font-bold text-orange-950 uppercase tracking-wider bg-orange-100"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-base">🌤️</span>
                        <span>TURNO VESPERTINO (3 AULAS)</span>
                      </div>
                    </td>
                  </tr>

                  {DEFAULT_VESPERTINO_PERIODS.map((period) => (
                    <tr
                      key={`vespertino-${period.number}`}
                      className="border-b border-slate-100 hover:bg-slate-50/40 transition"
                    >
                      {/* Period Column */}
                      <td className="p-2.5 border-r border-slate-200 bg-slate-50/70 text-slate-700 text-center align-middle">
                        <div className="font-bold text-xs text-slate-900">{period.label}</div>
                      </td>

                      {/* Day Columns */}
                      {weekDays.map((day) => {
                        const booking = getBooking(day.dateKey, 'vespertino', period.number);
                        const isHighlighted = booking && matchesSearch(booking);
                        const isDimmed = booking && searchQuery.trim() && !matchesSearch(booking);

                        return (
                          <td
                            key={`${day.dateKey}-vespertino-${period.number}`}
                            className={`p-2 border-r border-slate-200 last:border-r-0 align-top h-24 ${
                              day.isToday ? 'bg-emerald-50/20' : ''
                            } ${isDimmed ? 'opacity-30' : ''}`}
                          >
                            {booking ? (
                              <button
                                type="button"
                                id={`booking-card-${booking.id}`}
                                onClick={() => onBookingClick(booking)}
                                className={`w-full h-full text-left p-2.5 rounded-xl border transition shadow-xs flex flex-col justify-between ${
                                  getBadgeStyle(booking).bg
                                } ${isHighlighted && searchQuery ? 'ring-2 ring-emerald-500' : ''}`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1">
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded leading-none ${
                                        getBadgeStyle(booking).badge
                                      }`}
                                    >
                                      {booking.grade || 'Aula'}
                                    </span>
                                    {booking.equipment && booking.equipment.length > 0 && (
                                      <span className="text-[10px] text-slate-500" title={booking.equipment.join(', ')}>
                                        💻 {booking.equipment.length}
                                      </span>
                                    )}
                                  </div>

                                  <div className="font-bold text-xs text-slate-900 mt-1 line-clamp-1">
                                    {booking.teacherName}
                                  </div>
                                  {booking.subject ? (
                                    <div className="text-[11px] text-slate-600 line-clamp-1">
                                      {booking.subject}
                                    </div>
                                  ) : booking.notes ? (
                                    <div className="text-[10px] text-slate-500 line-clamp-1 italic">
                                      {booking.notes}
                                    </div>
                                  ) : null}
                                </div>

                                {booking.activityDescription && booking.activityDescription !== booking.notes && (
                                  <div className="text-[10px] text-slate-500 line-clamp-1 italic mt-1 border-t border-slate-200/60 pt-1">
                                    {booking.activityDescription}
                                  </div>
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                id={`empty-slot-${day.dateKey}-vespertino-${period.number}`}
                                onClick={() => onSlotClick(day.dateKey, 'vespertino', period.number)}
                                className="w-full h-full min-h-[72px] border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 rounded-xl transition flex flex-col items-center justify-center p-2 group text-slate-400 hover:text-emerald-700"
                              >
                                <Plus className="w-4 h-4 mb-0.5 group-hover:scale-125 transition-transform" />
                                <span className="text-[10px] font-medium">Disponível</span>
                                <span className="text-[9px] text-slate-400 group-hover:text-emerald-600">
                                  + Agendar
                                </span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
