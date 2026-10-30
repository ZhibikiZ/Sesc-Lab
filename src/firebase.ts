import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDocFromServer,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Booking, NewBookingPayload } from './types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore with specified database ID
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Connection test as required by skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Connected to Firestore successfully.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or Firestore is initializing.');
    } else {
      console.log('[Firebase] Connection ping completed.');
    }
  }
}
testConnection();

const BOOKINGS_COLLECTION = 'bookings';

/**
 * Real-time subscription to bookings collection.
 * Any update by any teacher on any device immediately syncs across all open browsers.
 */
export function subscribeToBookings(
  onUpdate: (bookings: Booking[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, BOOKINGS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Booking[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Booking;
        items.push({
          ...data,
          id: d.id,
        });
      });
      onUpdate(items);
    },
    (error) => {
      console.error('[Firebase] Real-time listener error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Clean an object for Firestore ensuring no `undefined` keys exist,
 * as Firestore strictly rejects undefined properties.
 */
function cleanForFirestore(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Save or create booking in Firestore.
 */
export async function saveBookingToFirestore(booking: Booking): Promise<void> {
  const docRef = doc(db, BOOKINGS_COLLECTION, booking.id);
  const dataToSave = cleanForFirestore({
    id: String(booking.id),
    date: String(booking.date),
    shift: String(booking.shift),
    lessonNumber: Number(booking.lessonNumber),
    teacherName: String(booking.teacherName || '').trim(),
    subject: String(booking.subject || '').trim(),
    grade: String(booking.grade || '').trim(),
    activityDescription: String(booking.activityDescription || '').trim(),
    equipment: Array.isArray(booking.equipment) ? booking.equipment : [],
    notes: String(booking.notes || '').trim(),
    isMaintenance: Boolean(booking.isMaintenance),
    createdAt: booking.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(booking.studentCount !== undefined && booking.studentCount !== null && !isNaN(Number(booking.studentCount))
      ? { studentCount: Number(booking.studentCount) }
      : {}),
  });

  await setDoc(docRef, dataToSave);
}

/**
 * Create a new booking in Firestore.
 */
export async function createBookingInFirestore(payload: NewBookingPayload): Promise<Booking> {
  const id = 'book-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const studentCountNum =
    payload.studentCount !== undefined && payload.studentCount !== null && String(payload.studentCount).trim() !== ''
      ? Number(payload.studentCount)
      : undefined;

  const newBooking: Booking = {
    id,
    date: payload.date,
    shift: payload.shift,
    lessonNumber: Number(payload.lessonNumber),
    teacherName: payload.teacherName.trim(),
    subject: payload.subject ? String(payload.subject).trim() : '',
    grade: payload.grade ? String(payload.grade).trim() : '',
    activityDescription: payload.activityDescription ? String(payload.activityDescription).trim() : '',
    equipment: Array.isArray(payload.equipment) ? payload.equipment : [],
    studentCount: studentCountNum !== undefined && !isNaN(studentCountNum) ? studentCountNum : undefined,
    notes: payload.notes ? String(payload.notes).trim() : '',
    isMaintenance: Boolean(payload.isMaintenance),
    createdAt: new Date().toISOString(),
  };

  await saveBookingToFirestore(newBooking);
  return newBooking;
}

/**
 * Delete a booking from Firestore.
 */
export async function deleteBookingFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, BOOKINGS_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Batch upload / sync existing bookings into Firestore.
 */
export async function batchSyncToFirestore(bookings: Booking[]): Promise<number> {
  if (!bookings || bookings.length === 0) return 0;
  
  const batch = writeBatch(db);
  let count = 0;

  for (const b of bookings) {
    if (!b.id || !b.date || !b.shift || !b.lessonNumber || !b.teacherName) continue;
    const docRef = doc(db, BOOKINGS_COLLECTION, b.id);
    const dataToSave = cleanForFirestore({
      id: String(b.id),
      date: String(b.date),
      shift: String(b.shift),
      lessonNumber: Number(b.lessonNumber),
      teacherName: String(b.teacherName || '').trim(),
      subject: String(b.subject || '').trim(),
      grade: String(b.grade || '').trim(),
      activityDescription: String(b.activityDescription || '').trim(),
      equipment: Array.isArray(b.equipment) ? b.equipment : [],
      notes: String(b.notes || '').trim(),
      isMaintenance: Boolean(b.isMaintenance),
      createdAt: b.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(b.studentCount !== undefined && b.studentCount !== null && !isNaN(Number(b.studentCount))
        ? { studentCount: Number(b.studentCount) }
        : {}),
    });
    batch.set(docRef, dataToSave);
    count++;
  }

  if (count > 0) {
    await batch.commit();
  }
  return count;
}

/**
 * Fetch all bookings once from Firestore.
 */
export async function fetchAllBookingsFromFirestore(): Promise<Booking[]> {
  const colRef = collection(db, BOOKINGS_COLLECTION);
  const snapshot = await getDocs(colRef);
  const items: Booking[] = [];
  snapshot.forEach((d) => {
    items.push({
      ...(d.data() as Booking),
      id: d.id,
    });
  });
  return items;
}
