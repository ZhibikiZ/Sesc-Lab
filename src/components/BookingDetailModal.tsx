import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  BookOpen,
  Users,
  Laptop,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  PhoneCall,
} from 'lucide-react';
import { Booking } from '../types';
import { DEFAULT_MATUTINO_PERIODS, DEFAULT_VESPERTINO_PERIODS } from '../constants';
import { formatLongDatePtBR } from '../utils/dateUtils';

interface BookingDetailModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string, pin: string) => Promise<boolean>;
  savedCoordinatorPin?: string;
  onSaveCoordinatorPin?: (pin: string) => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  booking,
  isOpen,
  onClose,
  onDelete,
  savedCoordinatorPin = '',
  onSaveCoordinatorPin,
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinText, setShowPinText] = useState(false);
  const [rememberPin, setRememberPin] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Sync saved PIN when opening
  useEffect(() => {
    if (savedCoordinatorPin) {
      setPinInput(savedCoordinatorPin);
    } else {
      setPinInput('');
    }
    setShowConfirmDelete(false);
    setDeleteError(null);
  }, [isOpen, savedCoordinatorPin]);

  if (!isOpen || !booking) return null;

  const periods =
    booking.shift === 'matutino' ? DEFAULT_MATUTINO_PERIODS : DEFAULT_VESPERTINO_PERIODS;
  const currentPeriod = periods.find((p) => p.number === booking.lessonNumber);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setDeleteError('Por favor, informe a senha do responsável pelo laboratório.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    const ok = await onDelete(booking.id, pinInput.trim());
    setIsDeleting(false);

    if (ok) {
      if (rememberPin && onSaveCoordinatorPin) {
        onSaveCoordinatorPin(pinInput.trim());
      }
      setShowConfirmDelete(false);
      onClose();
    } else {
      setDeleteError(
        'Senha de responsável incorreta! Apenas quem possui a senha do laboratório pode excluir agendamentos.'
      );
    }
  };

  return (
    <div
      id="booking-detail-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="booking-detail-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-6 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                booking.isMaintenance
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {booking.isMaintenance ? <AlertTriangle className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-white">
                {booking.isMaintenance
                  ? 'Manutenção do Laboratório'
                  : booking.grade
                  ? `Aula - ${booking.grade}`
                  : booking.subject || 'Horário Agendado'}
              </h2>
              <p className="text-xs text-slate-300">
                {booking.teacherName} {booking.subject ? `• ${booking.subject}` : ''}
              </p>
            </div>
          </div>
          <button
            id="close-detail-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-slate-800">
          {/* Schedule Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {formatLongDatePtBR(booking.date)}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                booking.shift === 'matutino'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-orange-100 text-orange-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {booking.shift === 'matutino' ? 'Turno Matutino' : 'Turno Vespertino'} • Aula {booking.lessonNumber}
            </span>
          </div>

          {/* Teacher and Grade */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Professor Responsável:
              </span>
              <span className="font-semibold text-slate-800">{booking.teacherName}</span>
            </div>
            {booking.grade && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Turma / Ano:
                </span>
                <span className="font-semibold text-slate-800">{booking.grade}</span>
              </div>
            )}
            {booking.subject ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> Matéria / Disciplina:
                </span>
                <span className="font-semibold text-slate-800">{booking.subject}</span>
              </div>
            ) : null}
          </div>

          {/* Activity Description or Notes */}
          {(booking.notes || booking.activityDescription) && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Observações / Atividade:
              </h3>
              <p className="text-sm text-slate-700 bg-white border border-slate-200 p-3 rounded-xl leading-relaxed">
                {booking.notes || booking.activityDescription}
              </p>
            </div>
          )}

          {/* Protected Deletion Area */}
          {showConfirmDelete && (
            <form
              onSubmit={handleDelete}
              className="p-4 bg-rose-50/80 border border-rose-200 rounded-xl space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center gap-2 text-rose-900 font-semibold text-sm">
                <Lock className="w-4 h-4 text-rose-600" />
                Cancelamento Protegido (Anti-Roubo de Vagas)
              </div>

              <p className="text-xs text-rose-800 leading-relaxed">
                Para evitar que qualquer pessoa apague a reserva de outro colega,{' '}
                <strong>apenas o responsável pelo laboratório</strong> pode cancelar horários
                agendados.
              </p>

              {savedCoordinatorPin && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Você já desbloqueou este computador como Responsável do Laboratório.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Senha do Responsável do Laboratório:
                </label>
                <div className="relative">
                  <input
                    type={showPinText ? 'text' : 'password'}
                    id="admin-pin-delete-input"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setDeleteError(null);
                    }}
                    placeholder="Digite a senha (padrão: 1234)"
                    className="w-full text-sm pl-9 pr-10 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white text-slate-900"
                    autoFocus
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowPinText(!showPinText)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    title={showPinText ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPinText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Senha padrão inicial: <strong className="font-mono text-slate-700">1234</strong></span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberPin}
                      onChange={(e) => setRememberPin(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 text-xs"
                    />
                    <span>Lembrar neste navegador</span>
                  </label>
                </div>
              </div>

              {deleteError && (
                <div className="text-xs font-medium text-rose-700 bg-rose-100/90 border border-rose-300 px-3 py-2 rounded-lg">
                  {deleteError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmDelete(false);
                    setDeleteError(null);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  id="confirm-delete-booking-btn"
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition shadow-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? 'Validando e excluindo...' : 'Confirmar Cancelamento'}
                </button>
              </div>
            </form>
          )}

          {/* Teacher guidance if not deleted */}
          {!showConfirmDelete && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2 text-xs text-slate-600">
              <Lock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-slate-700">Horário reservado e garantido:</span>{' '}
                Para proteção dos professores, apenas o responsável do laboratório pode cancelar este horário. Se você é o professor desta aula e não vai utilizá-la, avise o responsável para liberar a vaga.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          {!showConfirmDelete ? (
            <button
              type="button"
              id="prompt-cancel-booking-btn"
              onClick={() => setShowConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-rose-200 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Cancelar este Agendamento (Requer Senha)
            </button>
          ) : (
            <span className="text-xs text-slate-500 italic">Insira a senha do responsável acima</span>
          )}
          <div className="ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
