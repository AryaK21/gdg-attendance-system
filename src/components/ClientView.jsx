import { useState, useEffect } from 'react';
import { listenForActiveSession, addAttendance, checkDuplicateAttendance } from '../firebase/firestore';
import { isWithinRadius, calculateDistance } from '../utils/distance';
import { isWithinTimeWindow, formatDate, formatTime } from '../utils/time';

const ClientView = ({ user }) => {
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    const unsubscribe = listenForActiveSession((session) => {
      setActiveSession(session);
    });

    return () => unsubscribe();
  }, []);

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  };

  const handleMarkAttendance = async () => {
    if (!activeSession) {
      setMessage('No active session available');
      return;
    }

    setLoading(true);
    setMessage('');
    setLocationError('');

    try {
      // Check if already marked attendance
      const hasAttended = await checkDuplicateAttendance(activeSession.id, user.uid);
      if (hasAttended) {
        setMessage('You have already marked attendance for this session');
        return;
      }

      // Get user location
      const location = await getCurrentLocation();
      setUserLocation(location);

      // Check if within time window
      if (!isWithinTimeWindow(activeSession.startTime.toDate(), activeSession.endTime.toDate())) {
        setMessage('Session is not currently active');
        return;
      }

      // Check if within radius
      const withinRadius = isWithinRadius(
        location.lat,
        location.lng,
        activeSession.location.lat,
        activeSession.location.lng,
        activeSession.radius
      );

      if (!withinRadius) {
        const distance = calculateDistance(
          location.lat,
          location.lng,
          activeSession.location.lat,
          activeSession.location.lng
        );
        setMessage(`You are ${distance.toFixed(1)} meters away. Must be within ${activeSession.radius} meters.`);
        return;
      }

      // Mark attendance
      await addAttendance({
        sessionId: activeSession.id,
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        timestamp: new Date(),
        location: location,
        distance: calculateDistance(
          location.lat,
          location.lng,
          activeSession.location.lat,
          activeSession.location.lng
        )
      });

      setMessage('Attendance marked successfully!');

    } catch (error) {
      console.error('Error marking attendance:', error);
      if (error.message.includes('Geolocation')) {
        setLocationError('Unable to get your location. Please enable location services and try again.');
      } else {
        setMessage('Error marking attendance. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
      <h2>Mark Attendance</h2>

      {activeSession ? (
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <h3>{activeSession.name}</h3>
          <div style={{ marginBottom: '1rem' }}>
            <p><strong>Time:</strong> {formatDate(activeSession.startTime.toDate())} {formatTime(activeSession.startTime.toDate())} - {formatTime(activeSession.endTime.toDate())}</p>
            <p><strong>Allowed Radius:</strong> {activeSession.radius} meters</p>
          </div>

          {message && (
            <div style={{
              padding: '1rem',
              marginBottom: '1rem',
              borderRadius: '0.25rem',
              backgroundColor: message.includes('successfully') ? '#d1fae5' : '#fee2e2',
              color: message.includes('successfully') ? '#065f46' : '#991b1b'
            }}>
              {message}
            </div>
          )}

          {locationError && (
            <div style={{
              padding: '1rem',
              marginBottom: '1rem',
              borderRadius: '0.25rem',
              backgroundColor: '#fef3c7',
              color: '#92400e'
            }}>
              {locationError}
            </div>
          )}

          <button
            onClick={handleMarkAttendance}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem'
            }}
          >
            {loading ? 'Getting Location...' : 'Mark Present'}
          </button>

          {userLocation && (
            <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
              <p>Your location: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
          <h3>No Active Session</h3>
          <p>There is currently no active attendance session. Please check back later.</p>
        </div>
      )}
    </div>
  );
};

export default ClientView;