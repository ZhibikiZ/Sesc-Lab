import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ShiftType, Booking, NewBookingPayload } from './types';
import { getWeekDays, formatDateKey } from './utils/dateUtils';
import { Header } from './components/Header';
import { LabInfoBanner } from './components/LabInfoBanner';
import { WeekView } from './components/WeekView';
import { ListView } from './components/ListView';
import { BookingFormModal } from './components/BookingFormModal';
import { BookingDetailModal } from './components/BookingDetailModal';
import { LabManagerModal } from './components/LabManagerModal';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentReferenceDate, setCurrentReferenceDate] = useState<Date>(new Date());
  const [shiftFilter, setShiftFilter] = useState<'all' | 'matutino' | 'vespertino'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<{
    date: string;
    shift: ShiftType;
    lesson: number;
  } | null>(null);
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<Booking | null>(null);
  const [isLabManagerOpen, setIsLabManagerOpen] = useState(false);
  const [coordinatorPin, setCoordinatorPin] = useState<string>(() => {
    try {
      return localStorage.getItem('lab_coordinator_pin') || '';
    } catch {
      return '';
    }
  });

  const handleSaveCoordinatorPin = (pin: string) => {
    setCoordinatorPin(pin);
    try {
      localStorage.setItem('lab_coordinator_pin', pin);
    } catch (e) {
      console.error('LocalStorage error:', e);
    }
  };

  // Toast feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Fetch bookings from server
  const fetchBookings = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      } else {
        console.error('Failed to fetch bookings:', res.statusText);
      }
    } catch (err) {
      console.error('Error fetching bookings from server:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    // Poll every 20 seconds so teachers see updates from other teachers
    const interval = setInterval(() => {
      fetchBookings(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  // Navigate weeks
  const handleNavigateWeek = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentReferenceDate(new Date());
    } else {
      const nextDate = new Date(currentReferenceDate);
      const daysToAdd = direction === 'next' ? 7 : -7;
      nextDate.setDate(nextDate.getDate() + daysToAdd);
      setCurrentReferenceDate(nextDate);
    }
  };

  // Week days for current view
  const weekDays = useMemo(() => {
    return getWeekDays(currentReferenceDate, false); // Mon-Fri
  }, [currentReferenceDate]);

  // Compute total possible slots this week: 5 days * (5 matutino + 3 vespertino) = 40 slots
  const totalWeekSlots = weekDays.length * 8;
  const currentWeekDateKeys = useMemo(() => new Set(weekDays.map((d) => d.dateKey)), [weekDays]);
  const totalWeekBookings = useMemo(() => {
    return bookings.filter((b) => currentWeekDateKeys.has(b.date)).length;
  }, [bookings, currentWeekDateKeys]);

  // Slot click from calendar: opens booking modal prefilled
  const handleSlotClick = (dateKey: string, shift: ShiftType, lessonNumber: number) => {
    setSelectedSlotForBooking({
      date: dateKey,
      shift,
      lesson: lessonNumber,
    });
    setIsBookingModalOpen(true);
  };

  // Click on existing booking: opens details
  const handleBookingClick = (booking: Booking) => {
    setSelectedBookingForDetail(booking);
  };

  // Save new booking
  const handleSaveBooking = async (payload: NewBookingPayload): Promise<boolean> => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        showToast(
          errorData.error || 'Não foi possível agendar este horário. Verifique se já foi ocupado.',
          'error'
        );
        return false;
      }

      const newBooking = await res.json();
      setBookings((prev) => [...prev, newBooking]);
      showToast(
        `Aula agendada com sucesso para ${payload.teacherName}! O horário já está marcado no calendário.`
      );
      return true;
    } catch (err) {
      console.error('Error creating booking:', err);
      showToast('Erro de conexão ao salvar agendamento.', 'error');
      return false;
    }
  };

  // Delete booking with Coordinator PIN protection
  const handleDeleteBooking = async (id: string, pin: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': pin,
        },
      });

      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
        showToast('Agendamento cancelado com sucesso. O horário está livre novamente.');
        return true;
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(
          data.error || 'Não foi possível cancelar o agendamento. Verifique a senha do responsável.',
          'error'
        );
        return false;
      }
    } catch (err) {
      console.error('Error deleting booking:', err);
      showToast('Erro ao excluir agendamento.', 'error');
      return false;
    }
  };

  // Change coordinator PIN
  const handleChangeCoordinatorPin = async (
    currentPin: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/admin/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        handleSaveCoordinatorPin(newPin);
        showToast('Senha do responsável atualizada com sucesso!');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Erro ao alterar a senha.' };
      }
    } catch (err) {
      console.error('Error changing coordinator PIN:', err);
      return { success: false, error: 'Erro de conexão com o servidor.' };
    }
  };

  // Add maintenance block
  const handleAddMaintenance = async (
    date: string,
    shift: ShiftType,
    lessonNumber: number,
    reason: string
  ): Promise<boolean> => {
    return handleSaveBooking({
      date,
      shift,
      lessonNumber,
      teacherName: 'Coordenação / Manutenção',
      subject: 'Manutenção do Laboratório',
      grade: 'Bloqueado',
      activityDescription: reason,
      isMaintenance: true,
    });
  };

  // Reset demo bookings
  const handleResetDemo = async () => {
    try {
      const res = await fetch('/api/bookings/reset', {
        method: 'POST',
        headers: {
          'x-admin-pin': coordinatorPin || '1234',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings);
        showToast('Horários de demonstração restaurados com sucesso!');
      } else {
        showToast('Para restaurar a demonstração, informe a senha do responsável.', 'error');
      }
    } catch (err) {
      console.error('Error resetting demo:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      {/* Toast Notification */}
      {toast && (
        <div
          id="system-toast-notification"
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border text-sm max-w-md animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700'
              : 'bg-emerald-900 text-white border-emerald-700'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        totalBookings={bookings.length}
        shiftFilter={shiftFilter}
        onShiftFilterChange={setShiftFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNewBooking={() => {
          setSelectedSlotForBooking(null);
          setIsBookingModalOpen(true);
        }}
        onOpenLabManager={() => setIsLabManagerOpen(true)}
      />

      {/* App Body Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Lab Information & Stats Banner */}
        <LabInfoBanner
          totalWeekBookings={totalWeekBookings}
          totalWeekSlots={totalWeekSlots}
          onOpenBooking={() => {
            setSelectedSlotForBooking(null);
            setIsBookingModalOpen(true);
          }}
        />

        {/* View Component: Week Calendar Grid vs Day List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-xs flex flex-col items-center justify-center text-slate-500 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <p className="text-sm font-medium">Carregando horários do laboratório...</p>
          </div>
        ) : viewMode === 'grid' ? (
          <WeekView
            currentDate={currentReferenceDate}
            onNavigateWeek={handleNavigateWeek}
            weekDays={weekDays}
            bookings={bookings}
            shiftFilter={shiftFilter}
            searchQuery={searchQuery}
            onSlotClick={handleSlotClick}
            onBookingClick={handleBookingClick}
          />
        ) : (
          <ListView
            weekDays={weekDays}
            bookings={bookings}
            shiftFilter={shiftFilter}
            searchQuery={searchQuery}
            onSlotClick={handleSlotClick}
            onBookingClick={handleBookingClick}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Laboratório de Informática • Horários Matutinos (1ª a 5ª Aula) e Vespertinos (1ª a 3ª Aula)
          </span>
          <span>
            Os horários em verde estão disponíveis para reserva imediata.
          </span>
        </div>
      </footer>

      {/* Booking Form Modal */}
      <BookingFormModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedSlotForBooking(null);
        }}
        onSave={handleSaveBooking}
        initialDate={selectedSlotForBooking?.date}
        initialShift={selectedSlotForBooking?.shift}
        initialLesson={selectedSlotForBooking?.lesson}
        existingBookings={bookings}
      />

      {/* Booking Details Modal */}
      <BookingDetailModal
        isOpen={Boolean(selectedBookingForDetail)}
        booking={selectedBookingForDetail}
        onClose={() => setSelectedBookingForDetail(null)}
        onDelete={handleDeleteBooking}
        savedCoordinatorPin={coordinatorPin}
        onSaveCoordinatorPin={handleSaveCoordinatorPin}
      />

      {/* Lab Coordinator Panel Modal */}
      <LabManagerModal
        isOpen={isLabManagerOpen}
        onClose={() => setIsLabManagerOpen(false)}
        bookings={bookings}
        onAddMaintenance={handleAddMaintenance}
        onResetDemo={handleResetDemo}
        savedCoordinatorPin={coordinatorPin}
        onSaveCoordinatorPin={handleSaveCoordinatorPin}
        onChangeCoordinatorPin={handleChangeCoordinatorPin}
      />
    </div>
  );
}
