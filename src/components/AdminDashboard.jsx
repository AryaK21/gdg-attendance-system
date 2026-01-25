import React, { useState, useEffect } from 'react';
import { addSession, getSessions, getAttendanceBySession, updateSession } from '../firebase/firestore';
import { formatDate, formatTime, getTimeRemaining } from '../utils/time';
import MapPicker from './MapPicker';

const AdminDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    radius: 50,
    location: null
  });

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const sessionList = await getSessions();
      setSessions(sessionList);

      // Load attendance for each session
      const attendanceData = {};
      for (const session of sessionList) {
        attendanceData[session.id] = await getAttendanceBySession(session.id);
      }
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!formData.location) {
      alert('Please select a location on the map');
      return;
    }

    try {
      await addSession({
        ...formData,
        startTime: new Date(formData.startTime),
        endTime: new Date(formData.endTime),
        createdAt: new Date(),
        isActive: true
      });

      setFormData({
        name: '',
        startTime: '',
        endTime: '',
        radius: 50,
        location: null
      });
      setShowCreateForm(false);
      loadSessions();
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleCloseSession = async (sessionId) => {
    try {
      await updateSession(sessionId, { isActive: false });
      loadSessions();
    } catch (error) {
      console.error('Error closing session:', error);
    }
  };

  const handleLocationSelect = (location) => {
    setFormData({ ...formData, location });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Admin Dashboard</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
        >
          {showCreateForm ? 'Cancel' : 'Create New Session'}
        </button>
      </div>

      {showCreateForm && (
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '2rem' }}>
          <h3>Create Attendance Session</h3>
          <form onSubmit={handleCreateSession}>
            <div style={{ marginBottom: '1rem' }}>
              <label>Session Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label>Start Time:</label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>End Time:</label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label>Allowed Radius (meters):</label>
              <input
                type="number"
                value={formData.radius}
                onChange={(e) => setFormData({ ...formData, radius: parseInt(e.target.value) })}
                min="10"
                max="500"
                required
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label>Select Location:</label>
              <MapPicker onLocationSelect={handleLocationSelect} radius={formData.radius} />
            </div>

            <button
              type="submit"
              style={{ width: '100%', padding: '0.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
            >
              Create Session
            </button>
          </form>
        </div>
      )}

      <div>
        <h3>Active Sessions</h3>
        {sessions.filter(s => s.isActive).length === 0 ? (
          <p>No active sessions</p>
        ) : (
          sessions.filter(s => s.isActive).map(session => (
            <div key={session.id} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4>{session.name}</h4>
                <div>
                  <span style={{ marginRight: '1rem' }}>Time remaining: {getTimeRemaining(session.endTime.toDate())}</span>
                  <button
                    onClick={() => handleCloseSession(session.id)}
                    style={{ padding: '0.25rem 0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                  >
                    Close Session
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <p><strong>Time:</strong> {formatDate(session.startTime.toDate())} {formatTime(session.startTime.toDate())} - {formatTime(session.endTime.toDate())}</p>
                <p><strong>Radius:</strong> {session.radius} meters</p>
                <p><strong>Location:</strong> {session.location.lat.toFixed(6)}, {session.location.lng.toFixed(6)}</p>
              </div>

              <div>
                <h5>Present Students ({attendance[session.id]?.length || 0})</h5>
                {attendance[session.id]?.length > 0 ? (
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {attendance[session.id].map(att => (
                      <div key={att.id} style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{att.userName || att.userEmail}</span>
                          <span>{formatTime(att.timestamp.toDate())} ({att.distance.toFixed(1)}m away)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No students have marked attendance yet</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;