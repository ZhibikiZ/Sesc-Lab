import React, { useState } from 'react';
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
} from 'lucide-react';
import { Booking, ShiftType } from '../types';
import { formatShortDatePtBR, formatDateKey } from '../utils/dateUtils';
import { DEFAULT_MATUTINO_PERIODS, DEFAULT_VESPERTINO_PERIODS } from '../constants';

interface LabManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
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
}

export const LabManagerModal: React.FC<LabManagerModalProps> = ({
  isOpen,
  onClose,
  bookings,
  onAddMaintenance,
  onResetDemo,
  savedCoordinatorPin,
  onSaveCoordinatorPin,
  onChangeCoordinatorPin,
}) => {
  const [activeTab, setActiveTab] = useState<
    'maintenance' | 'security' | 'hosting' | 'whatsapp' | 'reset'
  >('security');

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
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-6 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
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
