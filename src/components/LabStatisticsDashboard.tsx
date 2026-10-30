import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import {
  Users,
  Calendar,
  Percent,
  TrendingUp,
  Award,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart2,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { Booking, ShiftType } from '../types';
import { formatDateKey, formatShortDatePtBR, parseDateKey } from '../utils/dateUtils';
import { DEFAULT_MATUTINO_PERIODS, DEFAULT_VESPERTINO_PERIODS } from '../constants';

interface LabStatisticsDashboardProps {
  bookings: Booking[];
  weekDays?: { dateKey: string; date: Date; isToday: boolean }[];
  currentDate?: Date;
  onNavigateToCsv?: () => void;
}

const PALETTE = [
  '#4f46e5', // indigo-600
  '#059669', // emerald-600
  '#0284c7', // sky-600
  '#d97706', // amber-600
  '#db2777', // pink-600
  '#7c3aed', // purple-600
  '#ea580c', // orange-600
  '#0d9488', // teal-600
  '#475569', // slate-600
  '#e11d48', // rose-600
  '#65a30d', // lime-600
  '#2563eb', // blue-600
];

const WEEKDAY_NAMES = [
  { dayIndex: 1, short: 'Seg', name: 'Segunda-feira' },
  { dayIndex: 2, short: 'Ter', name: 'Terça-feira' },
  { dayIndex: 3, short: 'Qua', name: 'Quarta-feira' },
  { dayIndex: 4, short: 'Qui', name: 'Quinta-feira' },
  { dayIndex: 5, short: 'Sex', name: 'Sexta-feira' },
  { dayIndex: 6, short: 'Sáb', name: 'Sábado' },
];

export const LabStatisticsDashboard: React.FC<LabStatisticsDashboardProps> = ({
  bookings,
  weekDays,
  onNavigateToCsv,
}) => {
  const [scope, setScope] = useState<'week' | 'all'>('week');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'matutino' | 'vespertino'>('all');

  // Slots available per day depending on shift filter
  const matutinoSlotsCount = DEFAULT_MATUTINO_PERIODS.length; // 5
  const vespertinoSlotsCount = DEFAULT_VESPERTINO_PERIODS.length; // 3
  const dailyCapacity = useMemo(() => {
    if (shiftFilter === 'matutino') return matutinoSlotsCount;
    if (shiftFilter === 'vespertino') return vespertinoSlotsCount;
    return matutinoSlotsCount + vespertinoSlotsCount; // 8
  }, [shiftFilter, matutinoSlotsCount, vespertinoSlotsCount]);

  // Week keys
  const weekDateKeys = useMemo(() => {
    if (!weekDays || weekDays.length === 0) return new Set<string>();
    return new Set(weekDays.map((d) => d.dateKey));
  }, [weekDays]);

  // Filtered dataset based on scope and shift
  const scopedBookings = useMemo(() => {
    let list = bookings;
    if (scope === 'week' && weekDateKeys.size > 0) {
      list = list.filter((b) => weekDateKeys.has(b.date));
    }
    if (shiftFilter !== 'all') {
      list = list.filter((b) => b.shift === shiftFilter);
    }
    return list;
  }, [bookings, scope, weekDateKeys, shiftFilter]);

  // 1. Data for Pie Chart: Total Bookings per Teacher
  const teacherStats = useMemo(() => {
    const counts: Record<string, { count: number; isMaintenance?: boolean }> = {};

    scopedBookings.forEach((b) => {
      const name = b.isMaintenance
        ? '🔧 Manutenção do Laboratório'
        : (b.teacherName?.trim() || 'Não Informado');

      if (!counts[name]) {
        counts[name] = { count: 0, isMaintenance: b.isMaintenance };
      }
      counts[name].count += 1;
    });

    const total = scopedBookings.length;
    const result = Object.entries(counts)
      .map(([name, data]) => ({
        name,
        value: data.count,
        percentage: total > 0 ? Math.round((data.count / total) * 100) : 0,
        isMaintenance: data.isMaintenance,
      }))
      .sort((a, b) => b.value - a.value);

    return result;
  }, [scopedBookings]);

  // 2. Data for Bar Chart: Utilization Rate by Day of the Week
  const weekdayUtilization = useMemo(() => {
    if (scope === 'week' && weekDays && weekDays.length > 0) {
      // Current week: calculate exact utilization for each day in weekDays
      return weekDays.map((dayObj) => {
        const dayBookings = scopedBookings.filter((b) => b.date === dayObj.dateKey);
        const bookedCount = dayBookings.length;
        const rate = dailyCapacity > 0 ? Math.round((bookedCount / dailyCapacity) * 100) : 0;
        const dateKey = dayObj.dateKey;
        const d = parseDateKey(dateKey);
        const dayIndex = d.getDay();
        const info = WEEKDAY_NAMES.find((w) => w.dayIndex === dayIndex) || {
          short: formatShortDatePtBR(dateKey).split(',')[0],
          name: 'Dia',
        };

        return {
          dayShort: info.short,
          dayName: info.name,
          dateLabel: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
          booked: bookedCount,
          capacity: dailyCapacity,
          rate: Math.min(100, rate),
          isToday: dayObj.isToday,
        };
      });
    } else {
      // All-time: aggregate by weekday (Mon=1, Tue=2, ..., Fri=5)
      // Count unique dates represented in the whole dataset or week periods
      const daysTracked = [1, 2, 3, 4, 5]; // Mon to Fri
      
      // Find all unique dates in the dataset to calculate average rate per day
      const uniqueDatesByWeekday: Record<number, Set<string>> = {
        1: new Set(),
        2: new Set(),
        3: new Set(),
        4: new Set(),
        5: new Set(),
        6: new Set(),
      };

      const bookingsByWeekday: Record<number, number> = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
      };

      scopedBookings.forEach((b) => {
        try {
          const d = parseDateKey(b.date);
          const day = d.getDay();
          if (bookingsByWeekday[day] !== undefined) {
            bookingsByWeekday[day] += 1;
            uniqueDatesByWeekday[day].add(b.date);
          }
        } catch {
          // ignore invalid date
        }
      });

      // Calculate utilization rate based on weeks or days recorded
      // If there are multiple dates, capacity is (unique dates * dailyCapacity)
      return daysTracked.map((dayIndex) => {
        const info = WEEKDAY_NAMES.find((w) => w.dayIndex === dayIndex)!;
        const bookedCount = bookingsByWeekday[dayIndex] || 0;
        const distinctOccurrences = Math.max(1, uniqueDatesByWeekday[dayIndex]?.size || 1);
        const totalPossibleSlots = distinctOccurrences * dailyCapacity;
        const rate = totalPossibleSlots > 0
          ? Math.round((bookedCount / totalPossibleSlots) * 100)
          : 0;

        return {
          dayShort: info.short,
          dayName: info.name,
          dateLabel: `${distinctOccurrences} semana(s)`,
          booked: bookedCount,
          capacity: totalPossibleSlots,
          rate: Math.min(100, rate),
          isToday: false,
        };
      });
    }
  }, [scope, weekDays, scopedBookings, dailyCapacity]);

  // Overall KPIs
  const totalBooked = scopedBookings.length;
  const activeTeachersCount = teacherStats.filter((t) => !t.isMaintenance).length;

  const totalPossibleSlotsInScope = useMemo(() => {
    if (scope === 'week') {
      const daysCount = weekDays ? weekDays.length : 5;
      return daysCount * dailyCapacity;
    } else {
      // Total available across all distinct days represented in weekdayUtilization
      return weekdayUtilization.reduce((acc, curr) => acc + curr.capacity, 0);
    }
  }, [scope, weekDays, dailyCapacity, weekdayUtilization]);

  const overallUtilizationRate = useMemo(() => {
    if (totalPossibleSlotsInScope === 0) return 0;
    return Math.min(100, Math.round((totalBooked / totalPossibleSlotsInScope) * 100));
  }, [totalBooked, totalPossibleSlotsInScope]);

  const busiestDay = useMemo(() => {
    if (weekdayUtilization.length === 0) return null;
    const sorted = [...weekdayUtilization].sort((a, b) => b.booked - a.booked);
    return sorted[0]?.booked > 0 ? sorted[0] : null;
  }, [weekdayUtilization]);

  // Helper for Bar Colors based on utilization percentage
  const getBarColor = (rate: number) => {
    if (rate >= 80) return '#ef4444'; // high capacity red
    if (rate >= 50) return '#f59e0b'; // moderate amber
    if (rate >= 25) return '#4f46e5'; // solid indigo
    return '#38bdf8'; // light sky blue
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header controls & Filters */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Métricas e Ocupação do Laboratório
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Análise visual da distribuição de aulas por professor e taxa de ocupação dos horários
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Scope Selector */}
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setScope('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                scope === 'week'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Semana Atual
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                scope === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Histórico Geral
            </button>
          </div>

          {/* Shift selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value as any)}
              className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">Todos os Turnos (8 aulas/dia)</option>
              <option value="matutino">Apenas Matutino (5 aulas/dia)</option>
              <option value="vespertino">Apenas Vespertino (3 aulas/dia)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* KPI 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-indigo-200 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Aulas Agendadas</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900">{totalBooked}</span>
            <span className="text-xs text-slate-400">aulas</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 truncate">
            {scope === 'week' ? 'Nesta semana selecionada' : 'Em todos os agendamentos'}
          </p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-emerald-200 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Taxa de Ocupação</span>
            <Percent className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900">{overallUtilizationRate}%</span>
            <span className="text-xs text-emerald-600 font-semibold">
              {totalBooked}/{totalPossibleSlotsInScope}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                overallUtilizationRate >= 70
                  ? 'bg-rose-500'
                  : overallUtilizationRate >= 40
                  ? 'bg-emerald-500'
                  : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min(100, overallUtilizationRate)}%` }}
            />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-sky-200 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Professores</span>
            <Users className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900">{activeTeachersCount}</span>
            <span className="text-xs text-slate-400">docentes</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 truncate">
            {teacherStats[0] ? `Líder: ${teacherStats[0].name.split(' ')[0]}` : 'Nenhum agendamento'}
          </p>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-amber-200 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Dia Mais Movimentado</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5 truncate">
            <span className="text-lg font-bold text-slate-900 truncate">
              {busiestDay ? busiestDay.dayShort : '—'}
            </span>
            {busiestDay && (
              <span className="text-xs text-amber-600 font-semibold shrink-0">
                ({busiestDay.booked} aulas)
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-1 truncate">
            {busiestDay ? `${busiestDay.rate}% de ocupação` : 'Sem registros'}
          </p>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Total Bookings per Teacher (Pie Chart) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-indigo-50 text-indigo-600 rounded-md">
                <PieChartIcon className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Agendamentos por Professor
                </h4>
                <p className="text-[11px] text-slate-500">
                  Proporção de horários reservados por cada docente
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
              {teacherStats.length} {teacherStats.length === 1 ? 'docente' : 'docentes'}
            </span>
          </div>

          {/* Chart or Empty State */}
          {teacherStats.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Nenhum agendamento encontrado</p>
              <p className="text-xs text-slate-400 mt-1">
                Não há reservas de professores no período e turno selecionados.
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center">
              <div className="w-full h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={teacherStats}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={85}
                      paddingAngle={3}
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {teacherStats.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.name}-${index}`}
                          fill={
                            entry.isMaintenance
                              ? '#f97316'
                              : PALETTE[index % PALETTE.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number, name: string) => [
                        `${val} aula(s) (${
                          totalBooked > 0 ? Math.round((val / totalBooked) * 100) : 0
                        }%)`,
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      itemStyle={{ color: '#ffffff' }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={40}
                      iconType="circle"
                      formatter={(value) => (
                        <span className="text-xs text-slate-700 font-medium">
                          {value.length > 20 ? `${value.substring(0, 18)}...` : value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Ranking List of Teachers */}
              <div className="w-full mt-4 border-t border-slate-100 pt-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Detalhamento de Reservas
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {teacherStats.map((teacher, index) => {
                    const color = teacher.isMaintenance
                      ? '#f97316'
                      : PALETTE[index % PALETTE.length];
                    return (
                      <div
                        key={teacher.name}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-semibold text-slate-800 truncate">
                            {teacher.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-slate-900">
                            {teacher.value} {teacher.value === 1 ? 'aula' : 'aulas'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {teacher.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CHART 2: Utilization Rates by Day of the Week (Bar Chart) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-emerald-50 text-emerald-600 rounded-md">
                <BarChart2 className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Taxa de Ocupação por Dia da Semana
                </h4>
                <p className="text-[11px] text-slate-500">
                  Percentual de horários ocupados em relação à capacidade ({dailyCapacity} aulas/dia)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-semibold text-slate-600">
                Capacidade: {dailyCapacity} aulas
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="mt-4 flex flex-col items-center">
            <div className="w-full h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weekdayUtilization}
                  margin={{ top: 22, right: 10, left: -15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="dayShort"
                    tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(val) => `${val}%`}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                    formatter={(rate: number, _name: string, item: any) => {
                      const data = item.payload;
                      return [
                        `${rate}% (${data.booked} de ${data.capacity} aulas reservadas)`,
                        'Taxa de Ocupação',
                      ];
                    }}
                    labelFormatter={(_label, items) => {
                      const payload = items?.[0]?.payload;
                      return payload ? `${payload.dayName} (${payload.dateLabel})` : _label;
                    }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Bar
                    dataKey="rate"
                    name="Ocupação (%)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  >
                    {weekdayUtilization.map((entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={getBarColor(entry.rate)}
                      />
                    ))}
                    <LabelList
                      dataKey="rate"
                      position="top"
                      formatter={(val: number) => `${val}%`}
                      style={{ fontSize: 11, fontWeight: 700, fill: '#334155' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Daily Breakdown Chips */}
            <div className="w-full mt-4 border-t border-slate-100 pt-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Aulas Reservadas por Dia
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {weekdayUtilization.map((day) => (
                  <div
                    key={day.dayShort}
                    className={`p-2 rounded-xl border text-center transition ${
                      day.isToday
                        ? 'bg-indigo-50/70 border-indigo-200'
                        : 'bg-slate-50 border-slate-200/70'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                      {day.dayShort}
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {day.booked}
                      <span className="text-[10px] font-normal text-slate-400">/{day.capacity}</span>
                    </div>
                    <div
                      className="text-[10px] font-bold mt-0.5"
                      style={{ color: getBarColor(day.rate) }}
                    >
                      {day.rate}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Helpful Action Footer / Legend */}
      <div className="bg-linear-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-white">
              Deseja salvar estes relatórios para a coordenação pedagógica?
            </h5>
            <p className="text-xs text-slate-300 mt-0.5">
              Exporte todos os registros em planilha CSV compatível com Excel e Google Planilhas.
            </p>
          </div>
        </div>

        {onNavigateToCsv && (
          <button
            type="button"
            onClick={onNavigateToCsv}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            Ir para Exportar CSV
          </button>
        )}
      </div>
    </div>
  );
};
