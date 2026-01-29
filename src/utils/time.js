
import { format as dateFnsFormat, isValid } from 'date-fns';

// Helper to ensure a date is valid
export const safeDate = (date) => {
  if (!date) return null;
  if (date?.toDate && typeof date.toDate === 'function') {
    return date.toDate();
  }
  const d = new Date(date);
  return isValid(d) ? d : null;
};

// Helper to safely format a date
export const safeFormat = (date, formatStr = 'Pp') => {
  const d = safeDate(date);
  if (!d) return 'N/A';
  try {
    return dateFnsFormat(d, formatStr);
  } catch (e) {
    console.error("Format error", e);
    return 'N/A';
  }
};

// Check if current time is within session time window
export const isWithinTimeWindow = (startTime, endTime) => {
  const start = safeDate(startTime);
  const end = safeDate(endTime);
  if (!start || !end) return false;
  const now = new Date();
  return now >= start && now <= end;
};

// Format time for display
export const formatTime = (date) => {
  const d = safeDate(date);
  if (!d) return 'N/A';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Format date for display
export const formatDate = (date) => {
  const d = safeDate(date);
  if (!d) return 'N/A';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Calculate time remaining until end
export const getTimeRemaining = (endTime) => {
  const end = safeDate(endTime);
  if (!end) return 'Indefinite';
  const now = new Date();
  const diff = end - now;

  if (diff <= 0) return 'Ended';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};