import React, { useState, useMemo } from 'react';
import {
  X,
  Wrench,
  Shield,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Copy,
  Share2,
  Lock,
  KeyRound,
  Globe,
  ExternalLink,
  Laptop,
  Mail,
  Building,
  Check,
  Eye,
  EyeOff,
  ShieldAlert,
  Database,
  Download,
  Upload,
  RefreshCw,
  FileText,
  Printer,
  FileSpreadsheet,
  Table,
  Info,
  BarChart3,
} from 'lucide-react';
import { Booking, ShiftType } from '../types';
import {
  formatShortDatePtBR,
  formatDateKey,
  formatDatePtBR,
  getWeekDays,
} from '../utils/dateUtils';
import {
  generateBookingsCSV,
  downloadCSVFile,
  getWeekCSVFilename,
  getAllBookingsCSVFilename,
} from '../utils/csvExport';
import { DEFAULT_MATUTINO_PERIODS, DEFAULT_VESPERTINO_PERIODS } from '../constants';
import { LabStatisticsDashboard } from './LabStatisticsDashboard';

interface LabManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
  weekDays?: { dateKey: string; date: Date; isToday: boolean }[];
  currentDate?: Date;
  onAddMaintenance: (
    date: string,
    shift: ShiftType,
    lessonNumber: number,
    reason: string
  ) => Promise<boolean>;
  onResetDemo: () => Promise<void>;
  savedCoordinatorPin: string;
  onSaveCoordinatorPin: (pin: string) => void;
  onChangeCoordinatorPin: (
    currentPin: string,
    newPin: string
  ) => Promise<{ success: boolean; error?: string }>;
  onImportBookings?: (bookings: Booking[], overwrite?: boolean) => Promise<boolean>;
  onSyncClientWithServer?: () => Promise<void>;
  onCopyPreviousWeek?: () => Promise<void>;
  onPrintSchedule?: () => void;
  localCachedCount?: number;
}

export const LabManagerModal: React.FC<LabManagerModalProps> = ({
  isOpen,
  onClose,
  bookings,
  weekDays,
  currentDate,
  onAddMaintenance,
  onResetDemo,
  savedCoordinatorPin,
  onSaveCoordinatorPin,
  onChangeCoordinatorPin,
  onImportBookings,
  onSyncClientWithServer,
  onCopyPreviousWeek,
  onPrintSchedule,
  localCachedCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<
    'security' | 'dashboard' | 'csv' | 'backup' | 'hosting' | 'maintenance' | 'whatsapp' | 'reset'
  >('security');

  // CSV Export states
  const [csvDelimiter, setCsvDelimiter] = useState<';' | ','>(';');
  const [csvShiftFilter, setCsvShiftFilter] = useState<'all' | 'matutino' | 'vespertino'>('all');
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string | null>(null);

  // Maintenance form
  const [maintDate, setMaintDate] = useState<string>(formatDateKey(new Date()));
  const [maintShift, setMaintShift] = useState<ShiftType>('matutino');
  const [maintLesson, setMaintLesson] = useState<number>(1);
  const [maintReason, setMaintReason] = useState<string>(
    'Manutenção Preventiva / Atualização de Softwares'
  );
  const [isSubmittingMaint, setIsSubmittingMaint] = useState(false);

  // Security / PIN form
  const [currentPinInput, setCurrentPinInput] = useState(savedCoordinatorPin || '1234');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [pinMessage, setPinMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSavingPin, setIsSavingPin] = useState(false);

  // Sharing copy states
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  // Backup states
  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [copiedBackupJson, setCopiedBackupJson] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCopyingWeek, setIsCopyingWeek] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingMaint(true);
    const success = await onAddMaintenance(maintDate, maintShift, maintLesson, maintReason);
    setIsSubmittingMaint(false);
    if (success) {
      onClose();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);

    if (!currentPinInput.trim()) {
      setPinMessage({ text: 'Por favor, informe a senha atual.', isError: true });
      return;
    }
    if (newPinInput.length < 3) {
      setPinMessage({ text: 'A nova senha deve ter no mínimo 3 caracteres.', isError: true });
      return;
    }
    if (newPinInput !== confirmNewPinInput) {
      setPinMessage({ text: 'A confirmação da nova senha não confere.', isError: true });
      return;
    }

    setIsSavingPin(true);
    const result = await onChangeCoordinatorPin(currentPinInput.trim(), newPinInput.trim());
    setIsSavingPin(false);

    if (result.success) {
      setPinMessage({
        text: 'Senha do responsável alterada com sucesso! Guarde-a com segurança.',
        isError: false,
      });
      setNewPinInput('');
      setConfirmNewPinInput('');
      setCurrentPinInput(newPinInput.trim());
      onSaveCoordinatorPin(newPinInput.trim());
    } else {
      setPinMessage({
        text: result.error || 'Erro ao alterar a senha. Verifique a senha atual.',
        isError: true,
      });
    }
  };

  const handleRememberLocalDevice = () => {
    onSaveCoordinatorPin(currentPinInput.trim());
    setPinMessage({
      text: 'Este navegador foi autorizado com a senha do responsável! Você não precisará digitá-la para excluir.',
      isError: false,
    });
  };

  // Generate text report for WhatsApp
  const generateWhatsAppSummary = () => {
    let text = `📅 *AGENDAMENTOS DO LABORATÓRIO DE INFORMÁTICA*\n\n`;
    text += `Olá professores! Segue a relação dos horários já reservados:\n\n`;

    const sorted = [...bookings].sort((a, b) => a.date.localeCompare(b.date));
    const groupedByDate: { [key: string]: Booking[] } = {};

    sorted.forEach((b) => {
      if (!groupedByDate[b.date]) groupedByDate[b.date] = [];
      groupedByDate[b.date].push(b);
    });

    Object.entries(groupedByDate).forEach(([dateStr, list]) => {
      text += `📍 *${formatShortDatePtBR(dateStr)}*:\n`;
      list.forEach((b) => {
        const shiftLabel = b.shift === 'matutino' ? 'Matutino' : 'Vespertino';
        text += ` • ${shiftLabel} - Aula ${b.lessonNumber}: ${b.teacherName} (${b.subject} - ${b.grade || 'Geral'})\n`;
      });
      text += `\n`;
    });

    text += `👉 Link para consultar os horários livres e agendar: ${currentUrl}\n\n`;
    text += `*Aviso:* Para cancelar horários reservados, entre em contato com o responsável do laboratório.`;
    return text;
  };

  const copyToClipboard = () => {
    const text = generateWhatsAppSummary();
    navigator.clipboard.writeText(text);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 2500);
  };

  const copyAppUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Effective week calculation for CSV export & viewing
  const effectiveWeekDays = useMemo(() => {
    if (weekDays && weekDays.length > 0) return weekDays;
    return getWeekDays(currentDate || new Date(), false);
  }, [weekDays, currentDate]);

  const firstDay = effectiveWeekDays[0];
  const lastDay = effectiveWeekDays[effectiveWeekDays.length - 1];

  const currentWeekDateKeys = useMemo(
    () => new Set(effectiveWeekDays.map((d) => d.dateKey)),
    [effectiveWeekDays]
  );

  const currentWeekBookings = useMemo(
    () => bookings.filter((b) => currentWeekDateKeys.has(b.date)),
    [bookings, currentWeekDateKeys]
  );

  const filteredCurrentWeekBookings = useMemo(() => {
    let list = currentWeekBookings;
    if (csvShiftFilter !== 'all') {
      list = list.filter((b) => b.shift === csvShiftFilter);
    }
    return [...list].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.shift !== b.shift) return a.shift === 'matutino' ? -1 : 1;
      return a.lessonNumber - b.lessonNumber;
    });
  }, [currentWeekBookings, csvShiftFilter]);

  const handleExportCurrentWeekCSV = (customDelimiter?: ';' | ',') => {
    const delimiter = customDelimiter || csvDelimiter;
    const filename = firstDay && lastDay
      ? getWeekCSVFilename(firstDay.dateKey, lastDay.dateKey)
      : `agendamentos_laboratorio_semana_${formatDateKey(new Date())}.csv`;

    const csvContent = generateBookingsCSV(currentWeekBookings, {
      delimiter,
      shiftFilter: csvShiftFilter,
    });

    downloadCSVFile(csvContent, filename);
    const count = csvShiftFilter === 'all'
      ? currentWeekBookings.length
      : currentWeekBookings.filter((b) => b.shift === csvShiftFilter).length;

    setCsvSuccessMessage(
      `Planilha CSV da semana gerada com sucesso! (${count} agendamento(s) exportado(s))`
    );
    setTimeout(() => setCsvSuccessMessage(null), 4000);
  };

  const handleExportAllCSV = (customDelimiter?: ';' | ',') => {
    const delimiter = customDelimiter || csvDelimiter;
    const filename = getAllBookingsCSVFilename();
    const csvContent = generateBookingsCSV(bookings, {
      delimiter,
      shiftFilter: csvShiftFilter,
    });

    downloadCSVFile(csvContent, filename);
    const count = csvShiftFilter === 'all'
      ? bookings.length
      : bookings.filter((b) => b.shift === csvShiftFilter).length;

    setCsvSuccessMessage(
      `Planilha CSV geral gerada com sucesso! (${count} agendamento(s) exportado(s))`
    );
    setTimeout(() => setCsvSuccessMessage(null), 4000);
  };

  const handleDownloadBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bookings, null, 2));
    const downloadAnchor = document.createElement('a');
    const nowStr = formatDateKey(new Date());
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `backup_agendamentos_laboratorio_${nowStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyBackupJson = () => {
    navigator.clipboard.writeText(JSON.stringify(bookings, null, 2));
    setCopiedBackupJson(true);
    setTimeout(() => setCopiedBackupJson(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed)) {
          setIsImporting(true);
          if (onImportBookings) {
            const ok = await onImportBookings(parsed, false);
            if (ok) {
              setImportStatus(`Sucesso! ${parsed.length} agendamentos importados para o sistema.`);
            } else {
              setImportStatus('Erro ao importar agendamentos para o servidor.');
            }
          }
          setIsImporting(false);
        } else {
          setImportStatus('Arquivo inválido: precisa ser uma lista de agendamentos em formato JSON.');
        }
      } catch (err) {
        setImportStatus('Erro ao ler arquivo JSON. Verifique se o arquivo está corrompido.');
      }
    };
    reader.readAsText(file);
  };

  const handleImportJsonText = async () => {
    if (!importJsonText.trim()) return;
    try {
      const parsed = JSON.parse(importJsonText);
      if (!Array.isArray(parsed)) {
        setImportStatus('O texto colado não contém uma lista válida de agendamentos.');
        return;
      }
      setIsImporting(true);
      if (onImportBookings) {
        const ok = await onImportBookings(parsed, false);
        if (ok) {
          setImportStatus(`Sucesso! ${parsed.length} agendamentos restaurados com sucesso.`);
          setImportJsonText('');
        } else {
          setImportStatus('Erro ao processar restauração no servidor.');
        }
      }
      setIsImporting(false);
    } catch (e) {
      setImportStatus('Erro de sintaxe no JSON. Verifique o texto colado.');
    }
  };

  const handleTriggerSync = async () => {
    if (!onSyncClientWithServer) return;
    setIsSyncing(true);
    await onSyncClientWithServer();
    setIsSyncing(false);
    setImportStatus('Sincronização com o servidor concluída com sucesso!');
  };

  const handleTriggerCopyWeek = async () => {
    if (!onCopyPreviousWeek) return;
    setIsCopyingWeek(true);
    await onCopyPreviousWeek();
    setIsCopyingWeek(false);
    setImportStatus('Agendamentos da semana anterior copiados para a semana atual com sucesso!');
  };

  return (
    <div
      id="lab-manager-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="lab-manager-modal-card"
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full ${
          activeTab === 'dashboard' || activeTab === 'csv' ? 'max-w-4xl' : 'max-w-2xl'
        } my-6 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 transition-all`}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Painel do Responsável do Laboratório
              </h2>
              <p className="text-xs text-slate-300">
                Segurança contra exclusão, publicação e coordenação dos horários
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-3 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" /> Bloqueio & Senha
          </button>

          <button
            type="button"
            id="tab-dashboard-stats"
            onClick={() => setActiveTab('dashboard')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" /> Estatísticas & Gráficos
          </button>

          <button
            type="button"
            id="tab-csv-export"
            onClick={() => setActiveTab('csv')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'csv'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar CSV
            {currentWeekBookings.length > 0 && (
              <span className="ml-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {currentWeekBookings.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" /> Backup & Sincronização
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hosting')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'hosting'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" /> Como Publicar (Google & Microsoft)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('maintenance')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'maintenance'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" /> Reservar Manutenção
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'whatsapp'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reset')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'reset'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-slate-800 max-h-[calc(92vh-160px)]">
          {/* TAB 1: SECURITY & PIN PROTECTION */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 space-y-1">
                  <p className="font-bold text-sm text-emerald-900">
                    Proteção Ativa contra Exclusão e Roubo de Vagas
                  </p>
                  <p className="leading-relaxed">
                    O sistema está configurado para que <strong>nenhum professor consiga apagar a reserva de outro colega</strong>. Qualquer tentativa de exclusão exige a confirmação da senha do responsável pelo laboratório.
                  </p>
                </div>
              </div>

              {/* Change Password Form */}
              <form
                onSubmit={handleChangePassword}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-indigo-600" />
                    Gerenciar Senha do Responsável
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowPins(!showPins)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  >
                    {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPins ? 'Ocultar Senhas' : 'Exibir Senhas'}
                  </button>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Senha Atual:
                    </label>
                    <input
                      type={showPins ? 'text' : 'password'}
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value)}
                      placeholder="Senha atual (padrão de fábrica: 1234)"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
                      required
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      A senha inicial de fábrica é <span className="font-mono font-bold text-slate-700">1234</span>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Nova Senha:
                      </label>
                      <input
                        type={showPins ? 'text' : 'password'}
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value)}
                        placeholder="Ex: lab2026"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Confirmar Nova Senha:
                      </label>
                      <input
                        type={showPins ? 'text' : 'password'}
                        value={confirmNewPinInput}
                        onChange={(e) => setConfirmNewPinInput(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {pinMessage && (
                  <div
                    className={`text-xs px-3 py-2 rounded-lg font-medium ${
                      pinMessage.isError
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {pinMessage.text}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleRememberLocalDevice}
                    className="text-xs text-slate-600 hover:text-slate-900 underline font-medium"
                  >
                    Autorizar e lembrar este computador
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingPin || !newPinInput}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    {isSavingPin ? 'Atualizando...' : 'Salvar Nova Senha'}
                  </button>
                </div>
              </form>

              {/* Practical Rules */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Como orientar os professores:</h4>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                  <li>
                    Qualquer professor pode visualizar a grade e reservar horários livres normalmente pelo formulário.
                  </li>
                  <li>
                    Se um professor tentar cancelar uma aula reservada, o sistema pedirá a senha do coordenador.
                  </li>
                  <li>
                    Caso um professor precise desmarcar a própria aula (ex: desistência ou troca de data), ele deve avisar você diretamente para que você faça o cancelamento com sua senha.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB: DASHBOARD STATISTICS (RECHARTS PIE & BAR CHARTS) */}
          {activeTab === 'dashboard' && (
            <LabStatisticsDashboard
              bookings={bookings}
              weekDays={effectiveWeekDays}
              currentDate={currentDate}
              onNavigateToCsv={() => setActiveTab('csv')}
            />
          )}

          {/* TAB: EXPORT TO CSV (CURRENT WEEK & ALL BOOKINGS) */}
          {activeTab === 'csv' && (
            <div className="space-y-4">
              {/* Header Info Card */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950">
                      Exportar Agendamentos em Planilha (.CSV)
                    </h3>
                    <p className="text-xs text-emerald-900 leading-relaxed mt-0.5">
                      Baixe as reservas da semana selecionada ou o arquivo geral para controle pedagógico, prestação de contas e importação no Microsoft Excel ou Google Planilhas.
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right sm:border-l sm:border-emerald-200 sm:pl-4 shrink-0 text-xs">
                  <span className="inline-block bg-emerald-100 text-emerald-900 font-bold px-2.5 py-1 rounded-lg border border-emerald-200">
                    {firstDay && lastDay
                      ? `${formatDatePtBR(firstDay.dateKey)} a ${formatDatePtBR(lastDay.dateKey)}`
                      : 'Semana Selecionada'}
                  </span>
                  <div className="text-[11px] text-emerald-800 mt-1 font-medium">
                    <strong>{currentWeekBookings.length}</strong> reserva(s) nesta semana
                  </div>
                </div>
              </div>

              {/* Success Notification */}
              {csvSuccessMessage && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs rounded-xl flex items-center gap-2 shadow-xs transition">
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-semibold">{csvSuccessMessage}</span>
                </div>
              )}

              {/* Action Controls & Format Options */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-emerald-600" />
                      Ações de Download
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Escolha o formato e baixe a planilha com um único clique:
                    </p>
                  </div>

                  {/* Format/Delimiter selector */}
                  <div className="flex items-center gap-2 text-xs bg-white p-1.5 rounded-lg border border-slate-300">
                    <span className="text-slate-600 font-medium pl-1">Separador:</span>
                    <button
                      type="button"
                      onClick={() => setCsvDelimiter(';')}
                      className={`px-2 py-1 rounded font-semibold transition ${
                        csvDelimiter === ';'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Ponto e vírgula: abre perfeitamente em colunas no Excel no Brasil"
                    >
                      Ponto e vírgula (;) Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => setCsvDelimiter(',')}
                      className={`px-2 py-1 rounded font-semibold transition ${
                        csvDelimiter === ','
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Vírgula: padrão internacional e Google Planilhas"
                    >
                      Vírgula (,) Google
                    </button>
                  </div>
                </div>

                {/* Filter and Download Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Shift Filter for Export */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-600 font-medium">Turno:</span>
                    <button
                      type="button"
                      onClick={() => setCsvShiftFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        csvShiftFilter === 'all'
                          ? 'bg-slate-800 text-white'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Todos ({currentWeekBookings.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCsvShiftFilter('matutino')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        csvShiftFilter === 'matutino'
                          ? 'bg-amber-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Matutino ({currentWeekBookings.filter((b) => b.shift === 'matutino').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCsvShiftFilter('vespertino')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        csvShiftFilter === 'vespertino'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Vespertino ({currentWeekBookings.filter((b) => b.shift === 'vespertino').length})
                    </button>
                  </div>

                  {/* Primary & Secondary Download Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      id="download-current-week-csv-btn"
                      onClick={() => handleExportCurrentWeekCSV()}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Baixar CSV da Semana Atual
                      <span className="bg-emerald-800/60 px-1.5 py-0.5 rounded text-[11px]">
                        {filteredCurrentWeekBookings.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      id="download-all-bookings-csv-btn"
                      onClick={() => handleExportAllCSV()}
                      className="px-3 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
                      title="Exportar todas as reservas históricas registradas no sistema"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      Todas as Reservas ({bookings.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Preview Table of Current Week Bookings */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-slate-600" />
                    <h4 className="text-xs font-bold text-slate-800">
                      Prévia dos Dados que Serão Gravados no CSV
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      ({filteredCurrentWeekBookings.length} registro(s))
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 hidden sm:block">
                    Cabeçalhos oficiais + Acentos preservados (UTF-8 BOM)
                  </div>
                </div>

                {filteredCurrentWeekBookings.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 space-y-2">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-medium text-slate-600">
                      Nenhum agendamento encontrado para esta semana com o filtro selecionado.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Ao clicar em "Baixar CSV da Semana Atual", você receberá a planilha com todos os cabeçalhos oficiais prontos para preenchimento.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 whitespace-nowrap">Data / Dia</th>
                          <th className="p-2.5 whitespace-nowrap">Turno</th>
                          <th className="p-2.5 whitespace-nowrap">Aula</th>
                          <th className="p-2.5 whitespace-nowrap">Professor(a)</th>
                          <th className="p-2.5 whitespace-nowrap">Disciplina & Turma</th>
                          <th className="p-2.5">Atividade / Equipamentos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredCurrentWeekBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-2.5 font-medium whitespace-nowrap">
                              <div>{formatDatePtBR(b.date)}</div>
                              <div className="text-[10px] text-slate-500">
                                {formatShortDatePtBR(b.date).split(',')[0]}
                              </div>
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  b.shift === 'matutino'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {b.shift === 'matutino' ? 'Matutino' : 'Vespertino'}
                              </span>
                            </td>
                            <td className="p-2.5 whitespace-nowrap font-medium text-slate-900">
                              {b.lessonNumber}ª Aula
                            </td>
                            <td className="p-2.5 whitespace-nowrap font-semibold text-slate-900">
                              {b.isMaintenance ? (
                                <span className="text-amber-700 font-bold">[MANUTENÇÃO]</span>
                              ) : (
                                b.teacherName
                              )}
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <div className="font-medium text-slate-800">{b.subject || '-'}</div>
                              <div className="text-[10px] text-slate-500">{b.grade || 'Geral'}</div>
                            </td>
                            <td className="p-2.5 text-slate-600 max-w-xs truncate">
                              <div className="truncate">{b.activityDescription || b.notes || '-'}</div>
                              {b.equipment && b.equipment.length > 0 && (
                                <div className="text-[10px] text-indigo-600 truncate mt-0.5">
                                  Equip: {b.equipment.join(', ')}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Informative Help Box */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 flex items-start gap-3">
                <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-sky-950 space-y-1">
                  <p className="font-bold text-sky-900">
                    Dica de Uso em Escolas & Secretarias
                  </p>
                  <p className="leading-relaxed">
                    O arquivo gerado inclui o marcador de ordem de bytes UTF-8 (BOM), o que permite abrir diretamente com acentos corretos no <strong>Microsoft Excel</strong> sem caracteres corrompidos. Para abrir no <strong>Google Planilhas</strong>, basta arrastar o arquivo .CSV para o Google Drive ou usar o menu "Arquivo &gt; Importar".
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BACKUP & DATA RECOVERY */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3">
                <Database className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div className="text-xs text-sky-950 space-y-1">
                  <p className="font-bold text-sm text-sky-900">
                    Dupla Camada de Armazenamento Ativa
                  </p>
                  <p className="leading-relaxed text-sky-900">
                    O sistema salva os agendamentos no <strong>servidor central compartilhado</strong> e mantém simultaneamente uma cópia de segurança em cache no <strong>armazenamento deste navegador (localStorage)</strong>.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-4 text-xs font-medium text-slate-700">
                    <span className="bg-white px-2.5 py-1 rounded-md border border-sky-200">
                      Total no Servidor: <strong>{bookings.length}</strong> agendamento(s)
                    </span>
                    <span className="bg-white px-2.5 py-1 rounded-md border border-sky-200">
                      Cópia Local no Navegador: <strong>{localCachedCount || bookings.length}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {importStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}

              {/* Actions: Export Backup & CSV */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-indigo-600" />
                  Exportar Agendamentos & Cópia de Segurança
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Baixe as reservas em formato de planilha (.CSV) para arquivamento ou uma cópia completa (.JSON) para restauração posterior.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    id="btn-backup-download-week-csv"
                    onClick={() => handleExportCurrentWeekCSV()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Baixar CSV da Semana Atual ({currentWeekBookings.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('csv')}
                    className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <Table className="w-4 h-4 text-emerald-600" />
                    Opções de CSV & Prévia
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    Ver Gráficos & Estatísticas
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Backup (.JSON)
                  </button>
                  {onPrintSchedule && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onPrintSchedule();
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir Cronograma
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyBackupJson}
                    className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-2"
                  >
                    {copiedBackupJson ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {copiedBackupJson ? 'JSON Copiado!' : 'Copiar Dados em Texto'}
                  </button>
                </div>
              </div>

              {/* Actions: Quick Routine Tools */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-emerald-600" />
                  Sincronização & Rotina Semanal
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Copie todas as aulas da semana anterior para a semana atual com um único clique ou force o salvamento do cache local no servidor.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {onCopyPreviousWeek && (
                    <button
                      type="button"
                      onClick={handleTriggerCopyWeek}
                      disabled={isCopyingWeek}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <Copy className="w-4 h-4" />
                      {isCopyingWeek ? 'Copiando...' : 'Copiar Grade da Semana Passada para Esta'}
                    </button>
                  )}
                  {onSyncClientWithServer && (
                    <button
                      type="button"
                      onClick={handleTriggerSync}
                      disabled={isSyncing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Sincronizando...' : 'Sincronizar Cache com Servidor'}
                    </button>
                  )}
                </div>
              </div>

              {/* Actions: Import / Restore */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-rose-600" />
                  Restaurar / Importar Backup
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Carregue um arquivo de backup previamente salvo para adicionar ou recuperar os agendamentos perdidos.
                </p>
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs transition">
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>Selecionar Arquivo .JSON do Computador</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isImporting}
                    />
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <label className="text-xs font-medium text-slate-700 block">
                    Ou cole o texto JSON do backup diretamente:
                  </label>
                  <textarea
                    rows={3}
                    placeholder='Cole aqui o JSON de agendamentos (ex: [{"date": "2026-09-14", ...}])'
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    className="w-full text-xs font-mono p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleImportJsonText}
                    disabled={isImporting || !importJsonText.trim()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-50"
                  >
                    {isImporting ? 'Importando...' : 'Restaurar a Partir do Texto'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HOW TO HOST & SHARE (GOOGLE & MICROSOFT) */}
          {activeTab === 'hosting' && (
            <div className="space-y-4">
              {/* Quick Link Card */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                    Link Direto do Sistema
                  </span>
                  <span className="text-[11px] bg-indigo-200/80 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
                    Acesso Imediato
                  </span>
                </div>
                <p className="text-xs text-indigo-950 leading-relaxed">
                  Este link pode ser enviado imediatamente para os professores pelo WhatsApp, e-mail do Gmail ou Microsoft Teams:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="bg-white border border-indigo-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono w-full truncate select-all"
                  />
                  <button
                    type="button"
                    onClick={copyAppUrl}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1 shadow-xs transition"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Copiado!' : 'Copiar Link'}
                  </button>
                </div>
              </div>

              {/* Option A: Google / Gmail */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                  <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold">
                    <Mail className="w-4 h-4" />
                  </div>
                  Opção 1: Usando sua Conta do Google (Gmail / Google Workspace)
                </div>

                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <p className="font-semibold text-slate-800">1. Botão "Share" (Compartilhar) do AI Studio:</p>
                    <p>
                      No topo direito da tela do AI Studio, clique em <strong>Share</strong>. Ele gera um link público permanente hospedado pelo Google Cloud, sem você precisar configurar servidores!
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <p className="font-semibold text-slate-800">2. Deploy no Google Cloud Run (Produção 24/7):</p>
                    <p>
                      No menu de opções do app (canto superior), escolha <strong>Deploy to Cloud Run</strong>. O sistema conecta com sua conta Gmail e publica uma versão oficial com certificado SSL seguro.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <p className="font-semibold text-slate-800">3. Divulgação para os Professores:</p>
                    <p>
                      Você pode postar o link no <strong>Google Sala de Aula (Classroom)</strong> dos professores ou enviar por e-mail no Gmail.
                    </p>
                  </div>
                </div>
              </div>

              {/* Option B: Microsoft / Teams */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                    <Building className="w-4 h-4" />
                  </div>
                  Opção 2: Usando sua Conta Corporativa da Microsoft (Office 365 / Teams)
                </div>

                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <p className="font-semibold text-slate-800">1. Como Aba no Microsoft Teams:</p>
                    <p>
                      No canal de professores no <strong>Microsoft Teams</strong>, clique no botão <strong>+ (Adicionar uma Guia)</strong> &gt; escolha <strong>"Site da Web"</strong> &gt; cole o link do agendador. O calendário funcionará direto dentro do Teams da escola!
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <p className="font-semibold text-slate-800">2. Intranet SharePoint da Escola:</p>
                    <p>
                      Se sua instituição tem uma página do SharePoint, adicione um botão de atalho ou incorpore a página via web part para acesso rápido.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <p className="font-semibold text-slate-800">3. Hospedagem no Azure ou GitHub / Vercel:</p>
                    <p>
                      Se a TI da sua escola quiser hospedar na infraestrutura Microsoft Azure: no menu do app, clique em <strong>Export to GitHub</strong> ou <strong>Download ZIP</strong>. O projeto é um aplicativo padrão Node.js / React pronto para rodar no Azure App Service ou Vercel.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MAINTENANCE */}
          {activeTab === 'maintenance' && (
            <form onSubmit={handleCreateMaintenance} className="space-y-4">
              <p className="text-xs text-slate-600">
                Como responsável pelo laboratório, você pode reservar horários para manutenção técnica,
                atualização de computadores ou reuniões pedagógicas.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Data do Bloqueio:
                </label>
                <input
                  type="date"
                  value={maintDate}
                  onChange={(e) => setMaintDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Turno:
                  </label>
                  <select
                    value={maintShift}
                    onChange={(e) => setMaintShift(e.target.value as ShiftType)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="matutino">☀️ Matutino (5 aulas)</option>
                    <option value="vespertino">🌤️ Vespertino (3 aulas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Aula:
                  </label>
                  <select
                    value={maintLesson}
                    onChange={(e) => setMaintLesson(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    {maintShift === 'matutino'
                      ? DEFAULT_MATUTINO_PERIODS.map((p) => (
                          <option key={p.number} value={p.number}>
                            {p.label}
                          </option>
                        ))
                      : DEFAULT_VESPERTINO_PERIODS.map((p) => (
                          <option key={p.number} value={p.number}>
                            {p.label}
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Motivo do Bloqueio:
                </label>
                <input
                  type="text"
                  value={maintReason}
                  onChange={(e) => setMaintReason(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingMaint}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-sm"
              >
                {isSubmittingMaint ? 'Bloqueando...' : 'Confirmar Bloqueio de Horário'}
              </button>
            </form>
          )}

          {/* TAB 4: WHATSAPP */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Copie esta mensagem formatada com a relação dos agendamentos e o link público para colar no grupo de WhatsApp dos professores:
              </p>

              <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap overflow-y-auto max-h-60 leading-relaxed border border-slate-800 select-all">
                {generateWhatsAppSummary()}
              </pre>

              <button
                type="button"
                onClick={copyToClipboard}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm"
              >
                {copiedWhatsapp ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedWhatsapp ? 'Copiado para a Área de Transferência!' : 'Copiar Texto para WhatsApp'}
              </button>
            </div>
          )}

          {/* TAB 5: RESET */}
          {activeTab === 'reset' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Esta opção restaura a base com agendamentos de exemplo distribuídos nos turnos
                  matutino e vespertino da semana atual. Exige a senha do responsável.
                </span>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await onResetDemo();
                  onClose();
                }}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Restaurar Agendamentos de Demonstração
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
