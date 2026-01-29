import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, getDoc, onSnapshot, setDoc, getCountFromServer, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { sha256, generateSessionCode } from '../utils/crypto';
import { getAllPendingCheckIns, deletePendingCheckIn } from '../utils/idb';

export const getStats = async () => {
  try {
    const usersColl = collection(db, 'users');
    const sessColl = collection(db, 'sessions');
    const attColl = collection(db, 'attendance');

    const [userSnap, sessSnap, attSnap] = await Promise.all([
      getCountFromServer(usersColl),
      getCountFromServer(sessColl),
      getCountFromServer(attColl)
    ]);

    return {
      users: userSnap.data().count,
      sessions: sessSnap.data().count,
      checkins: attSnap.data().count
    };
  } catch (err) {
    console.error("Error fetching stats:", err);
    return { users: 0, sessions: 0, checkins: 0 };
  }
};

let sessionCodeIntervals = new Map();

export const startSessionCodeRotation = (sessionId, intervalMs = 10000) => {
  if (sessionCodeIntervals.has(sessionId)) {
    clearInterval(sessionCodeIntervals.get(sessionId));
  }

  const interval = setInterval(async () => {
    try {
      const sess = await getSession(sessionId);
      if (!sess || !sess.isActive) {
        stopSessionCodeRotation(sessionId);
        return;
      }

      const nextCode = await generateSessionCode(sess.sessionSecret || sessionId, Date.now(), intervalMs);
      if (sess.sessionCode !== nextCode) {
        await updateSession(sessionId, { sessionCode: nextCode });
        console.log(`Rotated code for session ${sessionId}: ${nextCode}`);
      }
    } catch (err) {
      console.error("Failed to rotate session code:", err);
    }
  }, intervalMs);

  sessionCodeIntervals.set(sessionId, interval);
};

export const stopSessionCodeRotation = (sessionId) => {
  if (sessionId) {
    if (sessionCodeIntervals.has(sessionId)) {
      clearInterval(sessionCodeIntervals.get(sessionId));
      sessionCodeIntervals.delete(sessionId);
    }
  } else {
    sessionCodeIntervals.forEach((interval) => clearInterval(interval));
    sessionCodeIntervals.clear();
  }
};

// Users collection
export const addUser = async (userData) => {
  try {
    // Add default admin color if not present and user is admin
    const finalData = { ...userData };
    if (userData.role === 'admin' && !userData.adminColor) {
      finalData.adminColor = '#00f3ff'; // Default ATLAS cyan
    }
    const docRef = await addDoc(collection(db, 'users'), finalData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding user:', error);
    throw error;
  }
};

export const getUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting users:', error);
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

export const setUserRole = async (uid, role, displayName = null, adminColor = null) => {
  try {
    const userRef = doc(db, 'users', uid);
    const data = { role: role };
    if (displayName) data.displayName = displayName;
    if (adminColor) data.adminColor = adminColor;
    await setDoc(userRef, data, { merge: true });
  } catch (error) {
    console.error("Error setting user role:", error);
    throw error;
  }
};

// Sessions collection
export const addSession = async (sessionData) => {
  try {
    // Initialize sessions with a secret and genesis hash for the blockchain
    const sessionSecret = Math.random().toString(36).substring(2, 12);
    const createdAt = new Date();
    const genesisHash = await sha256(`genesis:${sessionData.name}:${createdAt.toISOString()}`);

    const finalData = {
      ...sessionData,
      sessionSecret,
      lastRecordHash: genesisHash,
      createdAt: createdAt
    };

    const docRef = await addDoc(collection(db, 'sessions'), finalData);
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

export const listenToSessions = (callback) => {
  const q = query(collection(db, 'sessions'), orderBy('startTime', 'desc'));
  return onSnapshot(q, (querySnapshot) => {
    const sessions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(sessions);
  }, (err) => {
    console.error("Error listening to sessions:", err);
  });
};

export const getSession = async (sessionId) => {
  try {
    const docRef = doc(db, 'sessions', sessionId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error('Error getting session:', error);
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
    const sessionRef = doc(db, 'sessions', attendanceData.sessionId);

    return await runTransaction(db, async (transaction) => {
      const sessionSnap = await transaction.get(sessionRef);
      if (!sessionSnap.exists()) throw new Error("Session does not exist");

      const session = sessionSnap.data();
      const prevHash = session.lastRecordHash || "0";

      // Normalize timestamp to ISO string for consistent hashing
      const tsISO = (attendanceData.timestamp instanceof Date)
        ? attendanceData.timestamp.toISOString()
        : (attendanceData.timestamp?.toDate ? attendanceData.timestamp.toDate().toISOString() : attendanceData.timestamp);

      // Create hash for this record (Blockchain-Lite)
      const recordStr = JSON.stringify({
        userId: attendanceData.userId,
        sessionId: attendanceData.sessionId,
        timestamp: tsISO,
        prevHash
      });
      const currentHash = await sha256(recordStr);

      const newAttendance = {
        ...attendanceData,
        timestamp: attendanceData.timestamp instanceof Date ? attendanceData.timestamp : new Date(tsISO),
        hash: currentHash,
        prevHash: prevHash,
        verified: attendanceData.verified !== undefined ? attendanceData.verified : true
      };

      const attRef = doc(collection(db, 'attendance'));
      transaction.set(attRef, newAttendance);

      // Update session's tip of the chain
      transaction.update(sessionRef, { lastRecordHash: currentHash });

      return attRef.id;
    });
  } catch (error) {
    console.error('Error adding attendance:', error);
    throw error;
  }
};

/**
 * Syncs pending check-ins from IndexedDB to Firestore
 */
export const syncPendingAttendance = async () => {
  const pending = await getAllPendingCheckIns();
  if (pending.length === 0) return 0;

  let count = 0;
  for (const item of pending) {
    try {
      // Re-verify the check-in data before adding
      // In a real app, we'd verify the dynamic code here using item.proof
      await addAttendance({
        ...item,
        timestamp: new Date(item.timestamp),
        offline: true,
        verified: true // In prototype, we mark as verified if code was correct at time of capture
      });
      await deletePendingCheckIn(item.id);
      count++;
    } catch (err) {
      console.error("Failed to sync item:", item.id, err);
    }
  }
  return count;
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

export const listenToAttendanceBySession = (sessionId, callback) => {
  const q = query(collection(db, 'attendance'), where('sessionId', '==', sessionId));
  return onSnapshot(q, (querySnapshot) => {
    const attendance = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(attendance);
  }, (err) => {
    console.error("Error listening to attendance:", err);
  });
};

export const getAttendanceForUser = async (userId) => {
  try {
    const q = query(collection(db, 'attendance'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting user attendance:', error);
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

// Attendance Requests collection
export const addAttendanceRequest = async (requestData) => {
  try {
    const docRef = await addDoc(collection(db, 'attendanceRequests'), {
      ...requestData,
      status: 'pending',
      createdAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding attendance request:', error);
    throw error;
  }
};

export const listenToAttendanceRequests = (sessionId, callback) => {
  const q = query(
    collection(db, 'attendanceRequests'),
    where('sessionId', '==', sessionId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (querySnapshot) => {
    const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`[Firestore] Pending requests for session ${sessionId}:`, requests.length);
    callback(requests);
  }, (err) => {
    console.error("Error listening to attendance requests:", err);
  });
};

export const approveAttendanceRequest = async (requestId, requestData, adminEmail) => {
  try {
    // Create attendance record
    await addAttendance({
      sessionId: requestData.sessionId,
      userId: requestData.userId,
      userEmail: requestData.userEmail,
      distance: requestData.distance,
      timestamp: new Date()
    });

    // Update request status
    const requestRef = doc(db, 'attendanceRequests', requestId);
    await updateDoc(requestRef, {
      status: 'approved',
      processedBy: adminEmail,
      processedAt: new Date()
    });
  } catch (error) {
    console.error('Error approving attendance request:', error);
    throw error;
  }
};

export const rejectAttendanceRequest = async (requestId, adminEmail) => {
  try {
    const requestRef = doc(db, 'attendanceRequests', requestId);
    await updateDoc(requestRef, {
      status: 'rejected',
      processedBy: adminEmail,
      processedAt: new Date()
    });
  } catch (error) {
    console.error('Error rejecting attendance request:', error);
    throw error;
  }
};

export const listenToUserAttendanceRequest = (sessionId, userId, callback) => {
  const q = query(
    collection(db, 'attendanceRequests'),
    where('sessionId', '==', sessionId),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (querySnapshot) => {
    const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(requests.length > 0 ? requests[0] : null);
  }, (err) => {
    console.error("Error listening to user attendance request:", err);
  });
};