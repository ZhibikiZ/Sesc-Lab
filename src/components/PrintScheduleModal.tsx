import React, { useState } from 'react';
import {
  Printer,
  X,
  FileText,
  SlidersHorizontal,
  Check,
  Calendar,
  Sparkles,
  HelpCircle,
  Download,
} from 'lucide-react';
import { Booking } from '../types';
import { PrintScheduleView } from './PrintScheduleView';
import { formatShortDatePtBR } from '../utils/dateUtils';

interface PrintScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekDays: { dateKey: string; date: Date; isToday: boolean }[];
  bookings: Booking[];
  currentDate: Date;
  initialShiftFilter?: 'all' | 'matutino' | 'vespertino';
}

export const PrintScheduleModal: React.FC<PrintScheduleModalProps> = ({
  isOpen,
  onClose,
  weekDays,
  bookings,
  currentDate,
  initialShiftFilter = 'all',
}) => {
  const [selectedShift, setSelectedShift] = useState<'all' | 'matutino' | 'vespertino'>(
    initialShiftFilter
  );
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includeEquipment, setIncludeEquipment] = useState<boolean>(true);
  const [includeNotes, setIncludeNotes] = useState<boolean>(true);

  if (!isOpen) return null;

  const firstDay = weekDays[0];
  const lastDay = weekDays[weekDays.length - 1];

  const handlePrint = () => {
    // Triggers browser native print dialog
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto no-print"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-auto flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Imprimir Cronograma Semanal
                <span className="text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Pronto para PDF / Papel
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {firstDay && lastDay
                  ? `Semana de ${formatShortDatePtBR(firstDay.dateKey)} até ${formatShortDatePtBR(lastDay.dateKey)}`
                  : 'Visualização e impressão de reservas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="modal-trigger-print-btn"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/40 transition active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Agora</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Turno:
            </span>
            <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 border border-slate-300">
              <button
                type="button"
                onClick={() => setSelectedShift('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  selectedShift === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos (Matutino + Vespertino)
              </button>
              <button
                type="button"
                onClick={() => setSelectedShift('matutino')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  selectedShift === 'matutino'
                    ? 'bg-amber-400 text-slate-950 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ☀️ Matutino (5 aulas)
              </button>
              <button
                type="button"
                onClick={() => setSelectedShift('vespertino')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  selectedShift === 'vespertino'
                    ? 'bg-orange-400 text-slate-950 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🌤️ Vespertino (3 aulas)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-700">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>Campos de Assinatura</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeEquipment}
                onChange={(e) => setIncludeEquipment(e.target.checked)}
                className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>Equipamentos</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={(e) => setIncludeNotes(e.target.checked)}
                className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>Observações das Aulas</span>
            </label>
          </div>
        </div>

        {/* Print Tip Banner */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-[11px] text-emerald-900 flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>
              <strong>Dica de Impressão:</strong> Na caixa de diálogo do navegador, selecione o destino{' '}
              <strong>"Salvar como PDF"</strong> ou sua impressora e prefira a orientação <strong>"Paisagem (Landscape)"</strong>.
            </span>
          </span>
          <button
            type="button"
            onClick={handlePrint}
            className="text-emerald-800 font-bold underline hover:text-emerald-950 ml-2 shrink-0"
          >
            Abrir Impressão
          </button>
        </div>

        {/* Paper Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/80 flex justify-center">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 p-2 sm:p-4 w-full max-w-[1050px] transition">
            <PrintScheduleView
              weekDays={weekDays}
              bookings={bookings}
              currentDate={currentDate}
              shiftFilter={selectedShift}
              includeSignatures={includeSignatures}
              includeEquipment={includeEquipment}
              includeNotes={includeNotes}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:px-5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 text-xs shrink-0">
          <span className="text-slate-500">
            Pressione <strong>Ctrl + P</strong> (ou <strong>Cmd + P</strong> no Mac) a qualquer momento para imprimir.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-medium transition"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition active:scale-98"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Salvar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
