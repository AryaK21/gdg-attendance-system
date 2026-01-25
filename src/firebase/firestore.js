import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// Users collection
export const addUser = async (userData) => {
  try {
    const docRef = await addDoc(collection(db, 'users'), userData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding user:', error);
    throw error;
  }
};

export const getUser = async (uid) => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

// Sessions collection
export const addSession = async (sessionData) => {
  try {
    const docRef = await addDoc(collection(db, 'sessions'), sessionData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding session:', error);
    throw error;
  }
};

export const getSessions = async () => {
  try {
    const q = query(collection(db, 'sessions'), orderBy('startTime', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting sessions:', error);
    throw error;
  }
};

export const getActiveSession = async () => {
  try {
    const now = new Date();
    const q = query(
      collection(db, 'sessions'),
      where('isActive', '==', true),
      where('startTime', '<=', now),
      where('endTime', '>=', now),
      orderBy('startTime', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.length > 0 ? { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } : null;
  } catch (error) {
    console.error('Error getting active session:', error);
    throw error;
  }
};

export const listenForActiveSession = (callback) => {
  const q = query(
    collection(db, 'sessions'),
    where('isActive', '==', true),
    orderBy('startTime', 'desc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const now = new Date();
    const sessions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Find the most recent session that is currently active (within time window)
    const activeSession = sessions.find(session =>
      session.startTime.toDate() <= now && session.endTime.toDate() >= now
    ) || null;
    callback(activeSession);
  }, (error) => {
    console.error('Error listening for active session:', error);
  });
};

export const updateSession = async (sessionId, updates) => {
  try {
    const docRef = doc(db, 'sessions', sessionId);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
};

// Attendance collection
export const addAttendance = async (attendanceData) => {
  try {
    const docRef = await addDoc(collection(db, 'attendance'), attendanceData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding attendance:', error);
    throw error;
  }
};

export const getAttendanceBySession = async (sessionId) => {
  try {
    const q = query(collection(db, 'attendance'), where('sessionId', '==', sessionId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting attendance:', error);
    throw error;
  }
};

export const checkDuplicateAttendance = async (sessionId, userId) => {
  try {
    const q = query(
      collection(db, 'attendance'),
      where('sessionId', '==', sessionId),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.length > 0;
  } catch (error) {
    console.error('Error checking duplicate attendance:', error);
    throw error;
  }
};