import React from 'react';
import {
  Laptop,
  Plus,
  Calendar,
  List,
  Search,
  Settings,
  Filter,
  Users,
  CheckCircle2,
  Share2,
  Shield,
} from 'lucide-react';
import { ShiftType } from '../types';

interface HeaderProps {
  totalBookings: number;
  shiftFilter: 'all' | 'matutino' | 'vespertino';
  onShiftFilterChange: (shift: 'all' | 'matutino' | 'vespertino') => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenNewBooking: () => void;
  onOpenLabManager: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalBookings,
  shiftFilter,
  onShiftFilterChange,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onOpenNewBooking,
  onOpenLabManager,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {/* Top row: Brand & Primary Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shadow-xs">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Laboratório de Informática
                </h1>
                <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Agendamento de Aulas
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Turnos: ☀️ <strong>Matutino</strong> (Aulas 1 a 5) & 🌤️ <strong>Vespertino</strong> (Aulas 1 a 3)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              id="open-manager-btn"
              onClick={onOpenLabManager}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Painel do Responsável, Senha e Publicação"
            >
              <Shield className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Painel do</span> Responsável
            </button>

            <button
              type="button"
              id="open-booking-btn"
              onClick={onOpenNewBooking}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition transform active:scale-98"
            >
              <Plus className="w-4 h-4" />
              Agendar Meu Horário
            </button>
          </div>
        </div>

        {/* Bottom controls row: Filters, Search, View Switcher */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          {/* Shift Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Turno:
            </span>
            <button
              type="button"
              id="filter-shift-all-btn"
              onClick={() => onShiftFilterChange('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                shiftFilter === 'all'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Todos os Turnos
            </button>
            <button
              type="button"
              id="filter-shift-matutino-btn"
              onClick={() => onShiftFilterChange('matutino')}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                shiftFilter === 'matutino'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              ☀️ Matutino (5 aulas)
            </button>
            <button
              type="button"
              id="filter-shift-vespertino-btn"
              onClick={() => onShiftFilterChange('vespertino')}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                shiftFilter === 'vespertino'
                  ? 'bg-orange-400 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🌤️ Vespertino (3 aulas)
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-schedule-input"
                type="text"
                placeholder="Buscar professor, matéria ou turma..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* View Mode Toggle: Grid vs List */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                id="view-grid-btn"
                onClick={() => onViewModeChange('grid')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                  viewMode === 'grid'
                    ? 'bg-slate-700 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grade</span>
              </button>
              <button
                type="button"
                id="view-list-btn"
                onClick={() => onViewModeChange('list')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                  viewMode === 'list'
                    ? 'bg-slate-700 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
