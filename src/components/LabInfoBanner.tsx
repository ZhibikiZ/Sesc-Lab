import React, { useState } from 'react';
import { Laptop, Clock, CheckCircle2, Share2, Copy, AlertCircle, Sparkles } from 'lucide-react';
import { Booking } from '../types';

interface LabInfoBannerProps {
  totalWeekBookings: number;
  totalWeekSlots: number;
  onOpenBooking: () => void;
}

export const LabInfoBanner: React.FC<LabInfoBannerProps> = ({
  totalWeekBookings,
  totalWeekSlots,
  onOpenBooking,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const availableSlots = Math.max(0, totalWeekSlots - totalWeekBookings);

  const copyAppUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 rounded-2xl p-5 text-white border border-emerald-800/40 shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
              <Sparkles className="w-3 h-3" /> Sistema de Agendamento Escolar
            </span>
            <span className="text-xs text-slate-300">
              Escola Estadual / Municipal
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Reserve o Laboratório para suas aulas práticas
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Professores podem conferir em tempo real os horários já reservados pelos colegas e escolher
            aulas livres nos turnos <strong>Matutino (1ª à 5ª aula)</strong> e <strong>Vespertino (1ª à 3ª aula)</strong>.
          </p>
        </div>

        {/* Stats and Action */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
          <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-xl p-3 text-center min-w-[100px]">
            <div className="text-xl font-black text-emerald-400">
              {totalWeekBookings}
            </div>
            <div className="text-[11px] text-slate-300">Aulas Agendadas</div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs border border-white/10 rounded-xl p-3 text-center min-w-[100px]">
            <div className="text-xl font-black text-white">
              {availableSlots}
            </div>
            <div className="text-[11px] text-slate-300">Horários Livres</div>
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <button
              type="button"
              id="banner-book-now-btn"
              onClick={onOpenBooking}
              className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Preencher Agendamento
            </button>

            <button
              type="button"
              id="copy-share-link-btn"
              onClick={copyAppUrl}
              className="w-full px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
            >
              {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Link Copiado!' : 'Copiar Link p/ Professores'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
