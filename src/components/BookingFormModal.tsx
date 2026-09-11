import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Laptop,
  User,
  GraduationCap,
  FileText,
  Sun,
  Sunset,
  ArrowRight,
} from 'lucide-react';
import { ShiftType, Booking, NewBookingPayload } from '../types';
import {
  DEFAULT_MATUTINO_PERIODS,
  DEFAULT_VESPERTINO_PERIODS,
  MATUTINO_GRADES,
  VESPERTINO_GRADES,
} from '../constants';
import { formatLongDatePtBR, formatDateKey } from '../utils/dateUtils';

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: NewBookingPayload) => Promise<boolean>;
  initialDate?: string;
  initialShift?: ShiftType;
  initialLesson?: number;
  existingBookings: Booking[];
}

export const BookingFormModal: React.FC<BookingFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
  initialShift,
  initialLesson,
  existingBookings,
}) => {
  const [date, setDate] = useState<string>(initialDate || formatDateKey(new Date()));
  const [shift, setShift] = useState<ShiftType | ''>(initialShift || '');
  const [lessonNumber, setLessonNumber] = useState<number>(initialLesson || 1);
  const [teacherName, setTeacherName] = useState<string>(() => {
    try {
      return localStorage.getItem('last_teacher_name') || '';
    } catch {
      return '';
    }
  });
  const [grade, setGrade] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync with initial props whenever modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialDate) setDate(initialDate);
      const chosenShift = initialShift || '';
      setShift(chosenShift);
      if (initialLesson) setLessonNumber(initialLesson);
      setGrade('');
      setErrorMessage(null);
    }
  }, [isOpen, initialDate, initialShift, initialLesson]);

  if (!isOpen) return null;

  const currentPeriods =
    shift === 'matutino'
      ? DEFAULT_MATUTINO_PERIODS
      : shift === 'vespertino'
      ? DEFAULT_VESPERTINO_PERIODS
      : [];

  const availableGrades =
    shift === 'matutino'
      ? MATUTINO_GRADES
      : shift === 'vespertino'
      ? VESPERTINO_GRADES
      : [];

  // Check which periods are already booked for the currently selected date and shift
  const bookingsForSelectedSlot = shift
    ? existingBookings.filter((b) => b.date === date && b.shift === shift)
    : [];

  const getSlotStatus = (periodNum: number) => {
    const found = bookingsForSelectedSlot.find((b) => b.lessonNumber === periodNum);
    return found || null;
  };

  const isCurrentSelectionTaken = Boolean(shift && getSlotStatus(lessonNumber));
  const occupyingBooking = shift ? getSlotStatus(lessonNumber) : null;

  const handleSelectShift = (newShift: ShiftType) => {
    setShift(newShift);
    setErrorMessage(null);

    // Default to aula 1 if previous lesson was outside new shift range
    if (newShift === 'matutino' && lessonNumber > 5) {
      setLessonNumber(1);
    } else if (newShift === 'vespertino' && lessonNumber > 3) {
      setLessonNumber(1);
    }

    // Reset grade if previously chosen grade doesn't belong to new shift
    const allowed = newShift === 'matutino' ? MATUTINO_GRADES : VESPERTINO_GRADES;
    if (grade && !allowed.includes(grade)) {
      setGrade('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!shift) {
      setErrorMessage('É obrigatório selecionar o Turno Escolar (Matutino ou Vespertino).');
      return;
    }
    if (!teacherName.trim()) {
      setErrorMessage('Por favor, informe seu nome como professor(a).');
      return;
    }
    if (!grade.trim()) {
      setErrorMessage(`Por favor, selecione a turma escolar (${shift === 'matutino' ? 'Matutino' : 'Vespertino'}).`);
      return;
    }
    if (isCurrentSelectionTaken) {
      setErrorMessage('Este horário já está reservado. Escolha outra aula livre.');
      return;
    }

    try {
      localStorage.setItem('last_teacher_name', teacherName.trim());
    } catch {
      // ignore
    }

    setIsSubmitting(true);
    const success = await onSave({
      date,
      shift,
      lessonNumber,
      teacherName: teacherName.trim(),
      grade: grade.trim(),
      notes: notes.trim(),
      activityDescription: notes.trim(),
    });

    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div
      id="booking-form-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="booking-form-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl my-6 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-white">
                Agendar Horário no Laboratório
              </h2>
              <p className="text-xs text-slate-300">
                Escolha o turno, a aula desejada e selecione sua turma
              </p>
            </div>
          </div>
          <button
            id="close-booking-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {errorMessage && (
            <div
              id="booking-error-alert"
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Data & Turno Obrigatório */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                1. Data e Turno (Obrigatório)
              </label>
              <span className="text-xs font-semibold text-emerald-700">
                {date ? formatLongDatePtBR(date) : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Data da Aula *
                </label>
                <input
                  id="booking-date-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center justify-between">
                  <span>Turno Escolar *</span>
                  {!shift ? (
                    <span className="text-[11px] font-bold text-rose-600 animate-pulse">
                      Selecione um turno
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-0.5">
                      <CheckCircle className="w-3 h-3" /> Selecionado
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="select-shift-matutino-btn"
                    onClick={() => handleSelectShift('matutino')}
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 text-center ${
                      shift === 'matutino'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-300 font-extrabold'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-amber-50 hover:border-amber-400'
                    }`}
                  >
                    <Sun className={`w-3.5 h-3.5 ${shift === 'matutino' ? 'text-white' : 'text-amber-500'}`} />
                    Matutino
                  </button>
                  <button
                    type="button"
                    id="select-shift-vespertino-btn"
                    onClick={() => handleSelectShift('vespertino')}
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 text-center ${
                      shift === 'vespertino'
                        ? 'bg-orange-500 text-white border-orange-600 shadow-sm ring-2 ring-orange-300 font-extrabold'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-orange-50 hover:border-orange-400'
                    }`}
                  >
                    <Sunset className={`w-3.5 h-3.5 ${shift === 'vespertino' ? 'text-white' : 'text-orange-500'}`} />
                    Vespertino
                  </button>
                </div>
              </div>
            </div>

            {/* Visual Lesson Selector or Shift Prompt */}
            {!shift ? (
              <div className="mt-2 p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Atenção:</strong> Escolha acima entre o turno <strong>Matutino (5 aulas)</strong> ou <strong>Vespertino (3 aulas)</strong> para visualizar as aulas disponíveis e as turmas.
                </span>
              </div>
            ) : (
              <div className="animate-in fade-in duration-150">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      Selecione a Aula ({shift === 'matutino' ? 'Matutino: 5 aulas' : 'Vespertino: 3 aulas'}):
                    </span>
                  </label>
                </div>

                <div
                  className={`grid gap-2 ${
                    shift === 'matutino' ? 'grid-cols-5' : 'grid-cols-3'
                  }`}
                >
                  {currentPeriods.map((period) => {
                    const occupied = getSlotStatus(period.number);
                    const isSelected = lessonNumber === period.number;

                    return (
                      <button
                        key={period.number}
                        type="button"
                        id={`lesson-option-${shift}-${period.number}`}
                        disabled={Boolean(occupied)}
                        onClick={() => setLessonNumber(period.number)}
                        className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 min-h-[56px] ${
                          occupied
                            ? 'bg-rose-50 border-rose-200 opacity-75 cursor-not-allowed text-rose-800'
                            : isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-300'
                            : 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs">{period.label}</div>
                        <div>
                          {occupied ? (
                            <span className="inline-block text-[9px] font-bold bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded leading-none truncate max-w-[70px]">
                              Ocupado
                            </span>
                          ) : isSelected ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold bg-emerald-700/80 text-white px-1.5 py-0.5 rounded leading-none">
                              <CheckCircle className="w-2.5 h-2.5" /> Escolhido
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-medium">
                              Livre
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Status Notice */}
                {occupyingBooking ? (
                  <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      A <strong>Aula {lessonNumber}</strong> já foi reservada por{' '}
                      <strong>{occupyingBooking.teacherName}</strong> ({occupyingBooking.grade || 'Aula'}).
                      Por favor, selecione outra aula livre acima.
                    </span>
                  </div>
                ) : (
                  <div className="mt-1.5 text-xs text-emerald-800 flex items-center gap-1.5 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Aula {lessonNumber} disponível para agendamento!</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Dados do Agendamento */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              2. Professor e Turma
            </label>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nome do Professor(a) *
              </label>
              <input
                id="teacher-name-input"
                type="text"
                placeholder="Ex: Prof. Mariana Souza"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                required
              />
            </div>

            {/* Shift-Exclusive Grades Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  <span>Turma / Série *</span>
                </label>
                {shift && (
                  <span className="text-[11px] font-medium text-slate-500">
                    {shift === 'matutino'
                      ? '17 turmas exclusivas do Matutino'
                      : '12 turmas exclusivas do Vespertino'}
                  </span>
                )}
              </div>

              {!shift ? (
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    Selecione o turno (<strong>Matutino</strong> ou <strong>Vespertino</strong>) no passo 1 acima para exibir a lista de turmas deste período.
                  </span>
                </div>
              ) : (
                <div className="space-y-2 animate-in fade-in duration-150">
                  {/* Visual buttons grid for instant one-tap selection */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="text-[11px] font-semibold text-slate-600 mb-2 flex items-center justify-between">
                      <span>Clique na turma desejada:</span>
                      {grade ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> {grade}
                        </span>
                      ) : (
                        <span className="text-[10px] text-rose-600 font-medium">
                          Nenhuma selecionada
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {availableGrades.map((gr) => {
                        const isSelected = grade.trim().toLowerCase() === gr.trim().toLowerCase();
                        return (
                          <button
                            key={gr}
                            type="button"
                            id={`grade-pill-${gr.replace(/\s+/g, '-').toLowerCase()}`}
                            onClick={() => {
                              setGrade(gr);
                              setErrorMessage(null);
                            }}
                            className={`px-2.5 py-2 rounded-lg text-xs font-medium border transition text-center flex items-center justify-center gap-1 ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-300 font-bold'
                                : 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-slate-700'
                            }`}
                          >
                            {isSelected && <CheckCircle className="w-3 h-3 shrink-0" />}
                            <span className="truncate">{gr}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dropdown / Manual confirmation */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 whitespace-nowrap">Ou escolha na lista:</span>
                    <select
                      id="grade-select-dropdown"
                      value={grade}
                      onChange={(e) => {
                        setGrade(e.target.value);
                        setErrorMessage(null);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Selecione uma turma da lista --</option>
                      {availableGrades.map((gr) => (
                        <option key={gr} value={gr}>
                          {gr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Observações / Atividade (opcional)</span>
              </label>
              <input
                id="notes-input"
                type="text"
                placeholder="Ex: Pesquisa escolar, criação de slides, trabalho em dupla..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            id="submit-booking-btn"
            disabled={isSubmitting || !shift || !grade || isCurrentSelectionTaken}
            onClick={handleSubmit}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md transition flex items-center gap-2 ${
              isSubmitting || !shift || !grade || isCurrentSelectionTaken
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            {isSubmitting ? 'Salvando Agendamento...' : 'Confirmar Agendamento'}
          </button>
        </div>
      </div>
    </div>
  );
};
