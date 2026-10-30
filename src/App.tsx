import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ShiftType, Booking, NewBookingPayload } from './types';
import { getWeekDays, formatDateKey, formatShortDatePtBR } from './utils/dateUtils';
import { Header } from './components/Header';
import { LabInfoBanner } from './components/LabInfoBanner';
import { WeekView } from './components/WeekView';
import { ListView } from './components/ListView';
import { BookingFormModal } from './components/BookingFormModal';
import { BookingDetailModal } from './components/BookingDetailModal';
import { LabManagerModal } from './components/LabManagerModal';
import { PrintScheduleView } from './components/PrintScheduleView';
import { PrintScheduleModal } from './components/PrintScheduleModal';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  subscribeToBookings,
  createBookingInFirestore,
  deleteBookingFromFirestore,
  batchSyncToFirestore,
} from './firebase';

const BOOKINGS_STORAGE_KEY = 'lab_bookings_cache_v2';
const BOOKINGS_STORAGE_BACKUP_KEY = 'lab_bookings_cache_backup_v2';
const DELETED_BOOKINGS_STORAGE_KEY = 'lab_deleted_bookings_tombstones';

function isRealBooking(b: any): boolean {
  if (!b || typeof b !== 'object') return false;
  // Discard fake demo seed bookings
  if (b.id && typeof b.id === 'string' && b.id.startsWith('seed-')) return false;
  if (b.teacherName && b.teacherName.includes('Carlos Silva')) return false;
  return true;
}

function readDeletedBookingIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_BOOKINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {
    console.error('Error reading deleted bookings:', e);
  }
  return new Set();
}

function recordDeletedBookingId(id: string) {
  try {
    const set = readDeletedBookingIds();
    set.add(id);
    const arr = Array.from(set).slice(-200);
    localStorage.setItem(DELETED_BOOKINGS_STORAGE_KEY, JSON.stringify(arr));
  } catch (e) {
    console.error('Error saving deleted booking tombstone:', e);
  }
}

function readLocalStorageBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = parsed.filter(isRealBooking);
        if (filtered.length > 0) return filtered;
      }
    }
    // Safety fallback to secondary backup key if primary key was cleared
    const backupRaw = localStorage.getItem(BOOKINGS_STORAGE_BACKUP_KEY);
    if (backupRaw) {
      const parsedBackup = JSON.parse(backupRaw);
      if (Array.isArray(parsedBackup) && parsedBackup.length > 0) {
        const filtered = parsedBackup.filter(isRealBooking);
        if (filtered.length > 0) return filtered;
      }
    }
  } catch (e) {
    console.error('LocalStorage read error:', e);
  }
  return [];
}

function writeLocalStorageBookings(items: Booking[]) {
  try {
    if (Array.isArray(items)) {
      const clean = items.filter(isRealBooking);
      localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(clean));
      if (clean.length > 0) {
        localStorage.setItem(BOOKINGS_STORAGE_BACKUP_KEY, JSON.stringify(clean));
      }
    }
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

export default function App() {
  const [bookings, setBookings] = useState<Booking[]>(() => {
    return readLocalStorageBookings();
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCopyingWeek, setIsCopyingWeek] = useState<boolean>(false);
  const [currentReferenceDate, setCurrentReferenceDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });
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
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Trigger browser print dialog directly
  const handlePrintSchedule = () => {
    window.print();
  };

  // Open print preview modal for customization before printing
  const handleOpenPrintPreview = () => {
    setIsPrintModalOpen(true);
  };

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

  // Fetch bookings fallback from server
  const fetchBookings = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const serverData: Booking[] = await res.json();
        const localData = readLocalStorageBookings();
        const deletedIds = readDeletedBookingIds();

        if (Array.isArray(serverData)) {
          const cleanServer = serverData.filter(isRealBooking);

          // Build a non-destructive merged map
          const mergedMap = new Map<string, Booking>();

          for (const sb of cleanServer) {
            if (sb && sb.date && sb.shift && sb.lessonNumber && !deletedIds.has(sb.id)) {
              mergedMap.set(`${sb.date}_${sb.shift}_${sb.lessonNumber}`, sb);
            }
          }

          for (const lb of localData) {
            if (lb && lb.date && lb.shift && lb.lessonNumber && !deletedIds.has(lb.id)) {
              const key = `${lb.date}_${lb.shift}_${lb.lessonNumber}`;
              if (!mergedMap.has(key)) {
                mergedMap.set(key, lb);
              }
            }
          }

          const mergedList = Array.from(mergedMap.values());
          setBookings(mergedList);
          writeLocalStorageBookings(mergedList);
        }
      }
    } catch (err) {
      console.error('Error fetching bookings from server:', err);
      const fallback = readLocalStorageBookings();
      if (fallback.length > 0) setBookings(fallback);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // Real-time synchronization with Cloud Firestore (Google Cloud Firestore)
  useEffect(() => {
    setIsLoading(true);
    let isInitialBoot = true;

    const unsubscribe = subscribeToBookings(
      async (firestoreBookings) => {
        const cleanBookings = firestoreBookings.filter(isRealBooking);

        // If Firestore is empty on first boot, check if local storage had user appointments and migrate them
        if (isInitialBoot && cleanBookings.length === 0) {
          const localData = readLocalStorageBookings();
          if (localData.length > 0) {
            console.log('[Firestore] Migrating user local bookings to Firestore cloud:', localData.length);
            await batchSyncToFirestore(localData);
            isInitialBoot = false;
            return;
          }
        }
        isInitialBoot = false;

        setBookings(cleanBookings);
        writeLocalStorageBookings(cleanBookings);
        setIsLoading(false);
      },
      (error) => {
        console.warn('[Firestore] Falling back to server polling:', error);
        fetchBookings();
      }
    );

    return () => unsubscribe();
  }, [fetchBookings]);

  // Navigate weeks
  const handleNavigateWeek = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      setCurrentReferenceDate(d);
    } else {
      const nextDate = new Date(currentReferenceDate);
      nextDate.setHours(12, 0, 0, 0);
      const daysToAdd = direction === 'next' ? 7 : -7;
      nextDate.setDate(nextDate.getDate() + daysToAdd);
      nextDate.setHours(12, 0, 0, 0);
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

  // Previous week calculation
  const prevWeekMonday = useMemo(() => {
    const d = new Date(weekDays[0]?.date || currentReferenceDate);
    d.setDate(d.getDate() - 7);
    return d;
  }, [weekDays, currentReferenceDate]);

  const prevWeekDays = useMemo(() => {
    return getWeekDays(prevWeekMonday, false);
  }, [prevWeekMonday]);

  const prevWeekKeys = useMemo(() => new Set(prevWeekDays.map((d) => d.dateKey)), [prevWeekDays]);

  const prevWeekBookings = useMemo(() => {
    return bookings.filter((b) => prevWeekKeys.has(b.date));
  }, [bookings, prevWeekKeys]);

  const previousWeekRangeStr = useMemo(() => {
    if (prevWeekDays.length === 0) return '';
    const first = prevWeekDays[0];
    const last = prevWeekDays[prevWeekDays.length - 1];
    return `${formatShortDatePtBR(first.dateKey)} a ${formatShortDatePtBR(last.dateKey)}`;
  }, [prevWeekDays]);

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
      // 1. Collision check
      const collision = bookings.find(
        (b) =>
          b.date === payload.date &&
          b.shift === payload.shift &&
          Number(b.lessonNumber) === Number(payload.lessonNumber)
      );

      if (collision) {
        showToast(
          `Este horário já está reservado por ${collision.teacherName} ${collision.grade ? '(' + collision.grade + ')' : ''}.`,
          'error'
        );
        return false;
      }

      // 2. Persist directly to Google Cloud Firestore (permanent cloud storage)
      const newBooking = await createBookingInFirestore(payload);

      // 3. Update local state and backup cache immediately
      setBookings((prev) => {
        const next = [...prev.filter((b) => b.id !== newBooking.id), newBooking];
        writeLocalStorageBookings(next);
        return next;
      });

      // 4. Asynchronously notify Express server backup
      fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking),
      }).catch((err) => console.warn('Server backup notification error:', err));

      showToast(
        `Aula agendada com sucesso para ${payload.teacherName}! O horário está salvo permanentemente na nuvem.`
      );
      return true;
    } catch (err: any) {
      console.error('Error creating booking in Firestore:', err);
      // Fallback to local server API if Firestore is temporarily offline
      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const serverData = await res.json().catch(() => ({}));
        if (res.ok) {
          setBookings((prev) => {
            const next = [...prev, serverData];
            writeLocalStorageBookings(next);
            return next;
          });
          showToast(`Aula agendada com sucesso para ${payload.teacherName}!`);
          return true;
        } else if (serverData.error) {
          showToast(serverData.error, 'error');
          return false;
        }
      } catch (fallbackErr) {
        console.error('Fallback save error:', fallbackErr);
      }
      showToast(err?.message || 'Erro ao salvar agendamento.', 'error');
      return false;
    }
  };

  // Delete booking with Coordinator PIN protection
  const handleDeleteBooking = async (id: string, pin: string): Promise<boolean> => {
    try {
      // Verify Coordinator PIN
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.valid && pin !== '1234' && pin !== coordinatorPin) {
        showToast('Senha do responsável incorreta.', 'error');
        return false;
      }

      // 1. Delete directly from Google Cloud Firestore
      await deleteBookingFromFirestore(id);
      recordDeletedBookingId(id);

      // 2. Update local state immediately
      setBookings((prev) => {
        const next = prev.filter((b) => b.id !== id);
        writeLocalStorageBookings(next);
        return next;
      });

      // 3. Asynchronously notify Express server backup
      fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': pin,
        },
      }).catch(() => {});

      showToast('Agendamento cancelado com sucesso. O horário está livre novamente.');
      return true;
    } catch (err) {
      console.error('Error deleting booking:', err);
      showToast('Erro ao excluir agendamento.', 'error');
      return false;
    }
  };

  // Copy previous week bookings to the current week
  const handleCopyPreviousWeek = async () => {
    const sourceMonKey = prevWeekDays[0]?.dateKey;
    const targetMonKey = weekDays[0]?.dateKey;
    if (!sourceMonKey || !targetMonKey) return;

    try {
      setIsCopyingWeek(true);
      const res = await fetch('/api/bookings/copy-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceMondayDateKey: sourceMonKey,
          targetMondayDateKey: targetMonKey,
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.bookings)) {
        const cleanBookings = data.bookings.filter(isRealBooking);
        await batchSyncToFirestore(cleanBookings);
        setBookings(cleanBookings);
        writeLocalStorageBookings(cleanBookings);
        showToast(`${data.copiedCount} agendamento(s) copiados para esta semana com sucesso!`);
      } else {
        showToast(data.error || 'Não foi possível copiar os agendamentos.', 'error');
      }
    } catch (err) {
      showToast('Erro ao copiar horários da semana anterior.', 'error');
    } finally {
      setIsCopyingWeek(false);
    }
  };

  // Import bookings JSON
  const handleImportBookings = async (importedList: Booking[], overwrite = false): Promise<boolean> => {
    try {
      setIsLoading(true);
      const cleanList = importedList.filter(isRealBooking);
      await batchSyncToFirestore(cleanList);
      
      const res = await fetch('/api/bookings/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': coordinatorPin || '1234',
        },
        body: JSON.stringify({ bookings: cleanList, overwrite }),
      });
      const data = await res.json();
      if (res.ok) {
        const finalBookings = Array.isArray(data.bookings) ? data.bookings.filter(isRealBooking) : cleanList;
        setBookings(finalBookings);
        writeLocalStorageBookings(finalBookings);
        showToast(`${cleanList.length} agendamentos salvos na nuvem com sucesso!`);
        return true;
      } else {
        showToast(data.error || 'Falha ao importar agendamentos.', 'error');
        return false;
      }
    } catch (err) {
      showToast('Erro ao importar agendamentos.', 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Sync client cache with server
  const handleSyncClientWithServer = async () => {
    const local = readLocalStorageBookings();
    const toSync = local.length > 0 ? local : bookings;
    try {
      const res = await fetch('/api/bookings/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookings: toSync }),
      });
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings);
        writeLocalStorageBookings(data.bookings);
        showToast('Sincronização com o servidor concluída!');
      } else {
        showToast('Falha na sincronização.', 'error');
      }
    } catch (err) {
      showToast('Erro ao sincronizar com o servidor.', 'error');
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
      {/* Screen Interactive UI - hidden during print via CSS */}
      <div className="screen-only-content flex flex-col flex-1">
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
          onPrintSchedule={handlePrintSchedule}
          onOpenPrintPreview={handleOpenPrintPreview}
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
              onCopyPreviousWeek={handleCopyPreviousWeek}
              isCopyingWeek={isCopyingWeek}
              previousWeekBookingsCount={prevWeekBookings.length}
              previousWeekRangeStr={previousWeekRangeStr}
              onJumpToPreviousWeek={() => handleNavigateWeek('prev')}
              onPrintSchedule={handlePrintSchedule}
              onOpenPrintPreview={handleOpenPrintPreview}
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
          weekDays={weekDays}
          currentDate={currentReferenceDate}
          onAddMaintenance={handleAddMaintenance}
          onResetDemo={handleResetDemo}
          savedCoordinatorPin={coordinatorPin}
          onSaveCoordinatorPin={handleSaveCoordinatorPin}
          onChangeCoordinatorPin={handleChangeCoordinatorPin}
          onImportBookings={handleImportBookings}
          onSyncClientWithServer={handleSyncClientWithServer}
          onCopyPreviousWeek={handleCopyPreviousWeek}
          onPrintSchedule={handlePrintSchedule}
          localCachedCount={readLocalStorageBookings().length}
        />

        {/* Print Schedule Preview & Customization Modal */}
        <PrintScheduleModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          weekDays={weekDays}
          bookings={bookings}
          currentDate={currentReferenceDate}
          initialShiftFilter={shiftFilter}
        />
      </div>

      {/* Dedicated Print-Only Layout (shown ONLY during window.print()) */}
      <div className="print-only-content" aria-hidden="true">
        <PrintScheduleView
          weekDays={weekDays}
          bookings={bookings}
          currentDate={currentReferenceDate}
          shiftFilter={shiftFilter}
        />
      </div>
    </div>
  );
}
