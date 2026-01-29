import { openDB } from 'idb';

const DB_NAME = 'GDG_Attendance_Offline';
const STORE_NAME = 'pendingCheckins';

const dbPromise = openDB(DB_NAME, 1, {
    upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    },
});

export const savePendingCheckIn = async (checkInData) => {
    const db = await dbPromise;
    return db.add(STORE_NAME, checkInData);
};

export const getAllPendingCheckIns = async () => {
    const db = await dbPromise;
    return db.getAll(STORE_NAME);
};

export const deletePendingCheckIn = async (id) => {
    const db = await dbPromise;
    return db.delete(STORE_NAME, id);
};

export const clearPendingCheckIns = async () => {
    const db = await dbPromise;
    return db.clear(STORE_NAME);
};
