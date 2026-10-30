import React from 'react';
import { Booking, ShiftType } from '../types';
import { DEFAULT_MATUTINO_PERIODS, DEFAULT_VESPERTINO_PERIODS } from '../constants';
import { formatShortDatePtBR, formatLongDatePtBR } from '../utils/dateUtils';

export interface PrintScheduleViewProps {
  weekDays: { dateKey: string; date: Date; isToday: boolean }[];
  bookings: Booking[];
  currentDate: Date;
  shiftFilter?: 'all' | 'matutino' | 'vespertino';
  includeSignatures?: boolean;
  includeEquipment?: boolean;
  includeNotes?: boolean;
  compactMode?: boolean;
  customTitle?: string;
}

export const PrintScheduleView: React.FC<PrintScheduleViewProps> = ({
  weekDays,
  bookings,
  currentDate,
  shiftFilter = 'all',
  includeSignatures = true,
  includeEquipment = true,
  includeNotes = true,
  compactMode = false,
  customTitle = 'Laboratório de Informática - Cronograma Semanal de Aulas',
}) => {
  const firstDay = weekDays[0];
  const lastDay = weekDays[weekDays.length - 1];

  const currentWeekDateKeys = new Set(weekDays.map((d) => d.dateKey));
  const weekBookings = bookings.filter((b) => currentWeekDateKeys.has(b.date));

  const matutinoCount = weekBookings.filter((b) => b.shift === 'matutino').length;
  const vespertinoCount = weekBookings.filter((b) => b.shift === 'vespertino').length;
  const totalSlots = weekDays.length * 8; // 5 days * (5 matutino + 3 vespertino) = 40 slots
  const freeSlots = Math.max(0, totalSlots - weekBookings.length);

  const getBooking = (dateKey: string, shift: ShiftType, lessonNumber: number) => {
    return weekBookings.find(
      (b) =>
        b.date === dateKey &&
        b.shift === shift &&
        Number(b.lessonNumber) === Number(lessonNumber)
    );
  };

  const formattedPrintDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="print-schedule-root bg-white text-black p-4 sm:p-6 w-full max-w-[1200px] mx-auto text-xs font-sans">
      {/* Printable Header */}
      <div className="border-b-2 border-slate-900 pb-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xl print:border print:border-black shrink-0">
            💻
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              Escola Estadual / Municipal • Secretaria de Educação
            </div>
            <h1 className="text-lg sm:text-xl font-black uppercase text-slate-950 tracking-tight">
              {customTitle}
            </h1>
            <div className="text-xs text-slate-700 font-semibold mt-0.5">
              Período: {firstDay && lastDay ? (
                <span>
                  {formatLongDatePtBR(firstDay.dateKey)} até {formatLongDatePtBR(lastDay.dateKey)}
                </span>
              ) : 'Semana Selecionada'}
            </div>
          </div>
        </div>

        {/* Print Metadata Card */}
        <div className="text-right text-[11px] text-slate-700 border border-slate-300 rounded-lg p-2 bg-slate-50 print:bg-transparent shrink-0">
          <div><strong>Emissão:</strong> {formattedPrintDate}</div>
          <div><strong>Capacidade:</strong> 32 Computadores</div>
          <div>
            <strong>Ocupação:</strong> {weekBookings.length} aulas ({Math.round((weekBookings.length / totalSlots) * 100)}%) • {freeSlots} livres
          </div>
        </div>
      </div>

      {/* Main Schedule Table */}
      <table className="w-full border-collapse border border-slate-900 text-left">
        <thead>
          <tr className="bg-slate-900 text-white print:bg-slate-200 print:text-black print:border-b-2 print:border-black">
            <th className="border border-slate-800 print:border-slate-700 p-2 w-28 text-center text-xs font-bold uppercase">
              Aula / Horário
            </th>
            {weekDays.map((day) => (
              <th
                key={day.dateKey}
                className="border border-slate-800 print:border-slate-700 p-2 text-center"
              >
                <div className="text-[11px] font-bold uppercase tracking-wider">
                  {day.date.toLocaleDateString('pt-BR', { weekday: 'long' })}
                </div>
                <div className="text-xs font-black mt-0.5">
                  {day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* MATUTINO SECTION */}
          {(shiftFilter === 'all' || shiftFilter === 'matutino') && (
            <>
              <tr className="bg-amber-100 print:bg-slate-100 border-y-2 border-slate-900">
                <td
                  colSpan={weekDays.length + 1}
                  className="px-3 py-1.5 font-black text-xs uppercase tracking-wider text-slate-900 border border-slate-900"
                >
                  ☀️ TURNO MATUTINO (AULAS 1 A 5) — {matutinoCount} aula(s) reservada(s)
                </td>
              </tr>

              {DEFAULT_MATUTINO_PERIODS.map((period) => (
                <tr
                  key={`print-mat-${period.number}`}
                  className="border-b border-slate-400 page-break-avoid"
                >
                  <td className="p-2 border border-slate-400 bg-slate-50 print:bg-white text-center font-bold text-xs align-middle">
                    <div className="text-slate-950 font-black">{period.label}</div>
                    <div className="text-[10px] text-slate-500 font-normal">Matutino</div>
                  </td>

                  {weekDays.map((day) => {
                    const booking = getBooking(day.dateKey, 'matutino', period.number);

                    return (
                      <td
                        key={`print-cell-${day.dateKey}-mat-${period.number}`}
                        className={`p-2 border border-slate-400 align-top ${
                          compactMode ? 'h-16' : 'h-20'
                        } ${booking ? 'bg-sky-50/40 print:bg-white' : 'bg-white'}`}
                      >
                        {booking ? (
                          <div className="h-full flex flex-col justify-between text-left">
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-black text-xs text-slate-950 line-clamp-1">
                                  {booking.teacherName}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-800">
                                <span className="font-bold bg-slate-200 print:border print:border-slate-400 px-1.5 py-0.2 rounded text-[10px]">
                                  {booking.grade || 'Aula'}
                                </span>
                                {booking.subject && (
                                  <span className="font-semibold truncate">
                                    {booking.subject}
                                  </span>
                                )}
                              </div>

                              {includeEquipment && booking.equipment && booking.equipment.length > 0 && (
                                <div className="text-[10px] text-slate-600 mt-1 line-clamp-1">
                                  <span className="font-semibold">Equip:</span> {booking.equipment.join(', ')}
                                </div>
                              )}

                              {includeNotes && (booking.notes || booking.activityDescription) && (
                                <div className="text-[10px] text-slate-600 mt-0.5 italic line-clamp-1">
                                  {booking.activityDescription || booking.notes}
                                </div>
                              )}

                              {booking.isMaintenance && (
                                <div className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1 py-0.5 rounded mt-0.5">
                                  ⚠️ Manutenção: {booking.activityDescription}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-center text-slate-400 text-[10px] italic border border-dashed border-slate-300 rounded p-1">
                            <span>[ Livre ]</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </>
          )}

          {/* VESPERTINO SECTION */}
          {(shiftFilter === 'all' || shiftFilter === 'vespertino') && (
            <>
              <tr className="bg-orange-100 print:bg-slate-100 border-y-2 border-slate-900 page-break-avoid">
                <td
                  colSpan={weekDays.length + 1}
                  className="px-3 py-1.5 font-black text-xs uppercase tracking-wider text-slate-900 border border-slate-900"
                >
                  🌤️ TURNO VESPERTINO (AULAS 1 A 3) — {vespertinoCount} aula(s) reservada(s)
                </td>
              </tr>

              {DEFAULT_VESPERTINO_PERIODS.map((period) => (
                <tr
                  key={`print-vesp-${period.number}`}
                  className="border-b border-slate-400 page-break-avoid"
                >
                  <td className="p-2 border border-slate-400 bg-slate-50 print:bg-white text-center font-bold text-xs align-middle">
                    <div className="text-slate-950 font-black">{period.label}</div>
                    <div className="text-[10px] text-slate-500 font-normal">Vespertino</div>
                  </td>

                  {weekDays.map((day) => {
                    const booking = getBooking(day.dateKey, 'vespertino', period.number);

                    return (
                      <td
                        key={`print-cell-${day.dateKey}-vesp-${period.number}`}
                        className={`p-2 border border-slate-400 align-top ${
                          compactMode ? 'h-16' : 'h-20'
                        } ${booking ? 'bg-orange-50/40 print:bg-white' : 'bg-white'}`}
                      >
                        {booking ? (
                          <div className="h-full flex flex-col justify-between text-left">
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-black text-xs text-slate-950 line-clamp-1">
                                  {booking.teacherName}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-800">
                                <span className="font-bold bg-slate-200 print:border print:border-slate-400 px-1.5 py-0.2 rounded text-[10px]">
                                  {booking.grade || 'Aula'}
                                </span>
                                {booking.subject && (
                                  <span className="font-semibold truncate">
                                    {booking.subject}
                                  </span>
                                )}
                              </div>

                              {includeEquipment && booking.equipment && booking.equipment.length > 0 && (
                                <div className="text-[10px] text-slate-600 mt-1 line-clamp-1">
                                  <span className="font-semibold">Equip:</span> {booking.equipment.join(', ')}
                                </div>
                              )}

                              {includeNotes && (booking.notes || booking.activityDescription) && (
                                <div className="text-[10px] text-slate-600 mt-0.5 italic line-clamp-1">
                                  {booking.activityDescription || booking.notes}
                                </div>
                              )}

                              {booking.isMaintenance && (
                                <div className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1 py-0.5 rounded mt-0.5">
                                  ⚠️ Manutenção: {booking.activityDescription}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-center text-slate-400 text-[10px] italic border border-dashed border-slate-300 rounded p-1">
                            <span>[ Livre ]</span>
                          </div>
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

      {/* Printable Footer with Signatures & Observations */}
      {includeSignatures && (
        <div className="mt-5 pt-3 border-t border-slate-400 page-break-avoid">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs text-slate-800 mt-4">
            <div>
              <div className="border-b border-slate-600 w-full mb-1 h-8"></div>
              <div className="font-bold text-slate-900">Visto do Responsável pelo Laboratório</div>
              <div className="text-[10px] text-slate-500">Conferência dos equipamentos e orientações de uso</div>
            </div>

            <div>
              <div className="border-b border-slate-600 w-full mb-1 h-8"></div>
              <div className="font-bold text-slate-900">Visto da Coordenação Pedagógica / Direção</div>
              <div className="text-[10px] text-slate-500">Acompanhamento do planejamento pedagógico escolar</div>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-dashed border-slate-300 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500">
            <span>
              Documento emitido pelo Sistema de Agendamento do Laboratório de Informática • Horários sujeitos a alterações pelo corpo docente.
            </span>
            <span>
              Total semanal: {weekBookings.length} reservas registradas.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
