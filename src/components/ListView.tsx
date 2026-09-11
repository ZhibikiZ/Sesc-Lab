import React from 'react';
import { Booking, ShiftType } from '../types';
import { DEFAULT_MATUTINO_PERIODS, DEFAULT_VESPERTINO_PERIODS } from '../constants';
import { formatLongDatePtBR, formatShortDatePtBR } from '../utils/dateUtils';
import { Calendar, Clock, User, BookOpen, Laptop, Plus } from 'lucide-react';

interface ListViewProps {
  weekDays: { dateKey: string; date: Date; isToday: boolean }[];
  bookings: Booking[];
  shiftFilter: 'all' | 'matutino' | 'vespertino';
  searchQuery: string;
  onSlotClick: (dateKey: string, shift: ShiftType, lessonNumber: number) => void;
  onBookingClick: (booking: Booking) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  weekDays,
  bookings,
  shiftFilter,
  searchQuery,
  onSlotClick,
  onBookingClick,
}) => {
  return (
    <div className="space-y-6">
      {weekDays.map((day) => {
        const dayBookings = bookings.filter((b) => b.date === day.dateKey);

        const matutinoBookings = dayBookings.filter((b) => b.shift === 'matutino');
        const vespertinoBookings = dayBookings.filter((b) => b.shift === 'vespertino');

        return (
          <div
            key={day.dateKey}
            className={`bg-white rounded-2xl border ${
              day.isToday ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/20' : 'border-slate-200'
            } p-4 sm:p-5 transition`}
          >
            {/* Day Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h3 className="font-bold text-slate-900 text-base">
                  {formatLongDatePtBR(day.dateKey)}
                </h3>
                {day.isToday && (
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Hoje
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">
                {dayBookings.length} {dayBookings.length === 1 ? 'aula agendada' : 'aulas agendadas'}
              </span>
            </div>

            {/* Matutino Section */}
            {(shiftFilter === 'all' || shiftFilter === 'matutino') && (
              <div className="mb-5">
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg w-fit">
                  <span>☀️</span> Turno Matutino (Aulas 1 a 5)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {DEFAULT_MATUTINO_PERIODS.map((period) => {
                    const booking = matutinoBookings.find((b) => b.lessonNumber === period.number);

                    if (booking) {
                      return (
                        <div
                          key={`list-mat-${period.number}`}
                          onClick={() => onBookingClick(booking)}
                          className="p-3 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100/80 cursor-pointer transition shadow-xs"
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-sky-950">{period.label}</span>
                          </div>
                          <div className="font-semibold text-xs text-slate-900 line-clamp-1">
                            {booking.teacherName}
                          </div>
                          <div className="text-xs text-slate-600 line-clamp-1">
                            {booking.grade || booking.subject || 'Aula'}
                            {booking.subject && booking.grade ? ` • ${booking.subject}` : ''}
                          </div>
                          {(booking.notes || booking.activityDescription) && (
                            <div className="text-[11px] text-slate-500 line-clamp-1 italic mt-1">
                              {booking.notes || booking.activityDescription}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={`list-mat-${period.number}`}
                        type="button"
                        onClick={() => onSlotClick(day.dateKey, 'matutino', period.number)}
                        className="p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-left transition flex flex-col justify-between h-20 group"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500 w-full">
                          <span className="font-bold text-slate-800">{period.label}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium group-hover:translate-x-0.5 transition-transform">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Livre • Agendar</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vespertino Section */}
            {(shiftFilter === 'all' || shiftFilter === 'vespertino') && (
              <div>
                <div className="text-xs font-bold text-orange-900 uppercase tracking-wider mb-2 flex items-center gap-1.5 bg-orange-50 px-2.5 py-1 rounded-lg w-fit">
                  <span>🌤️</span> Turno Vespertino (Aulas 1 a 3)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {DEFAULT_VESPERTINO_PERIODS.map((period) => {
                    const booking = vespertinoBookings.find((b) => b.lessonNumber === period.number);

                    if (booking) {
                      return (
                        <div
                          key={`list-vesp-${period.number}`}
                          onClick={() => onBookingClick(booking)}
                          className="p-3 rounded-xl border border-orange-200 bg-orange-50/70 hover:bg-orange-100/80 cursor-pointer transition shadow-xs"
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-orange-950">{period.label}</span>
                          </div>
                          <div className="font-semibold text-xs text-slate-900 line-clamp-1">
                            {booking.teacherName}
                          </div>
                          <div className="text-xs text-slate-600 line-clamp-1">
                            {booking.grade || booking.subject || 'Aula'}
                            {booking.subject && booking.grade ? ` • ${booking.subject}` : ''}
                          </div>
                          {(booking.notes || booking.activityDescription) && (
                            <div className="text-[11px] text-slate-500 line-clamp-1 italic mt-1">
                              {booking.notes || booking.activityDescription}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={`list-vesp-${period.number}`}
                        type="button"
                        onClick={() => onSlotClick(day.dateKey, 'vespertino', period.number)}
                        className="p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-left transition flex flex-col justify-between h-20 group"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500 w-full">
                          <span className="font-bold text-slate-800">{period.label}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium group-hover:translate-x-0.5 transition-transform">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Livre • Agendar</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
