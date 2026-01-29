
import React, { useState, useEffect, useMemo } from 'react';
import { addSession, getSessions, getAttendanceBySession, updateSession, startSessionCodeRotation, stopSessionCodeRotation, listenToSessions, listenToAttendanceBySession, listenToAttendanceRequests, approveAttendanceRequest, rejectAttendanceRequest, getUser, getUsers, setUserRole } from '../firebase/firestore';
import { auth } from '../firebase/firebase';
import { getDistance } from 'geolib';
import MapPicker from './MapPicker';
import { generateSessionCode } from '../utils/crypto';

import GeminiAssistant from './GeminiAssistant';
import { unparse } from 'papaparse';
import { safeFormat, safeDate, isWithinTimeWindow } from '../utils/time';
import { sendFCMNotification } from '../utils/fcm';
import { sha256 } from '../utils/crypto';
import {
  Box,
  Button,
  Typography,
  Modal,
  TextField,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Snackbar,
  Collapse,
  IconButton,
  Stack,
  Grid,
  Avatar,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import LinearProgress from '@mui/material/LinearProgress';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  People as PeopleIcon,
  EventAvailable as EventIcon,
  History as HistoryIcon,
  TrendingUp as TrendingIcon,
  Save as SaveIcon,
  Security as SecurityIcon,
  Fullscreen as FullscreenIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '95%',
  maxWidth: '1300px',
  bgcolor: '#050505',
  boxShadow: '0 0 50px rgba(0, 243, 255, 0.2)',
  p: 0,
  borderRadius: 1,
  height: '700px', // Fixed height to prevent scrolling and ensure layout stability
  display: 'flex',
  border: '1px solid rgba(0, 243, 255, 0.3)',
  overflow: 'hidden'
};

const StatCard = ({ title, value, icon, color, trend }) => (
  <Box className="glass-card" sx={{ p: 3, borderRadius: 1, borderLeft: `4px solid ${color}`, position: 'relative' }}>
    <Stack direction="row" spacing={2} alignItems="center">
      <Avatar sx={{ bgcolor: `${color}15`, color: color, width: 56, height: 56, borderRadius: '4px', border: `1px solid ${color}30` }}>
        {icon}
      </Avatar>
      <Box>
        <Typography variant="body2" sx={{ opacity: 0.6, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>{title}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: 'Outfit', color: 'white' }}>{value}</Typography>
        {trend && (
          <Typography variant="caption" sx={{ color: '#39ff14', display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}>
            <TrendingIcon sx={{ fontSize: 14 }} /> {trend}
          </Typography>
        )}
      </Box>
    </Stack>
  </Box>
);

const AdminDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [error, setError] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '' });
  const [showChart, setShowChart] = useState(true);
  const [fullscreenSessionId, setFullscreenSessionId] = useState(() => localStorage.getItem('fullscreenSessionId'));
  const [viewAttendees, setViewAttendees] = useState(null);
  const [integrityStatus, setIntegrityStatus] = useState(null); // 'checking', 'valid', 'invalid'
  const [invalidRecords, setInvalidRecords] = useState([]);
  const [expandedRecords, setExpandedRecords] = useState(new Set());
  const [pendingRequests, setPendingRequests] = useState({});
  const [adminColor, setAdminColor] = useState('#00f3ff');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [livingCodes, setLivingCodes] = useState({});
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    startTime: new Date(),
    endTime: new Date(Date.now() + 60 * 60 * 1000), // Default 1 hour duration
    radius: 50,
    location: null,
    requireSessionCode: false,
    requireApproval: false
  });

  useEffect(() => {
    if (fullscreenSessionId) {
      localStorage.setItem('fullscreenSessionId', fullscreenSessionId);
    } else {
      localStorage.removeItem('fullscreenSessionId');
    }
  }, [fullscreenSessionId]);

  // Living local code rotation (TOTP)
  useEffect(() => {
    const updateCodes = async () => {
      const now = Date.now();
      const interval = 10000;
      const remaining = Math.ceil((interval - (now % interval)) / 1000);
      setSecondsRemaining(remaining);

      const newCodes = {};
      for (const session of sessions) {
        if (session.isActive && session.requireSessionCode) {
          const secret = session.sessionSecret || session.id;
          newCodes[session.id] = await generateSessionCode(secret, now, interval);
        }
      }
      setLivingCodes(newCodes);
    };

    updateCodes();
    const intervalId = setInterval(updateCodes, 1000);
    return () => clearInterval(intervalId);
  }, [sessions]);

  useEffect(() => {
    const unsubscribeSessions = listenToSessions((updatedSessions) => {
      setSessions(updatedSessions);
      setLoading(false);
    });

    const fetchAdminProfile = async () => {
      if (auth.currentUser) {
        const profile = await getUser(auth.currentUser.uid);
        if (profile?.adminColor) {
          setAdminColor(profile.adminColor);
        }
      }
    };

    fetchAdminProfile();

    return () => {
      unsubscribeSessions();
    };
  }, []);

  // Separate effect for attendance and request listeners
  useEffect(() => {
    const unsubscribers = [];

    sessions.forEach(session => {
      // Listen to attendance
      const unsubAttendance = listenToAttendanceBySession(session.id, (updatedAttendance) => {
        setAttendance(prev => ({
          ...prev,
          [session.id]: updatedAttendance
        }));
      });
      unsubscribers.push(unsubAttendance);

      // Listen to pending requests for active sessions that require approval
      if (session.isActive && session.requireApproval) {
        const unsubRequests = listenToAttendanceRequests(session.id, (requests) => {
          console.log(`[AdminDashboard] Received ${requests.length} requests for session ${session.id}`);
          setPendingRequests(prev => {
            const updated = { ...prev };
            if (requests.length === 0) {
              // Remove the session key if no requests
              console.log(`[AdminDashboard] Removing session ${session.id} from pendingRequests`);
              delete updated[session.id];
            } else {
              console.log(`[AdminDashboard] Setting ${requests.length} requests for session ${session.id}`);
              updated[session.id] = requests;
            }
            console.log('[AdminDashboard] Updated pendingRequests:', Object.keys(updated));
            return updated;
          });
        });
        unsubscribers.push(unsubRequests);
      }
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, [sessions]);

  const loadData = async () => {
    // Initial load handled by listener, but kept for manual refreshes if needed
    try {
      const sessionList = await getSessions();
      setSessions(sessionList);
    } catch (err) {
      setError('Error loading data: ' + err.message);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!formData.location) {
      setError('Location point required for geofencing.');
      return;
    }
    setIsCreating(true);
    try {
      let sessionCode = null;
      if (formData.requireSessionCode) {
        sessionCode = Math.floor(100000 + Math.random() * 900000).toString();
      }

      const sessionData = {
        ...formData,
        startTime: new Date(formData.startTime),
        endTime: new Date(formData.endTime),
        createdAt: new Date(),
        isActive: true,
        sessionCode: sessionCode,
        createdBy: auth.currentUser?.email || 'Unknown Admin',
        createdByUid: auth.currentUser?.uid || null,
        adminColor: adminColor
      };

      const sessionId = await addSession(sessionData);

      if (formData.requireSessionCode) {
        startSessionCodeRotation(sessionId, 10000);
      }

      // Close modal immediately and show success
      setOpenCreateModal(false);
      setNotification({ open: true, message: 'Session successfully created.' });
      loadData();

      // Reset form
      setFormData({
        name: '',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        radius: 50,
        location: null,
        requireSessionCode: false,
        requireApproval: false
      });

      // Handle Notifications asynchronously in the background
      setTimeout(async () => {
        try {
          const allUsers = await getUsers();
          const nearbyUserIds = [];

          allUsers.forEach(user => {
            if (user.location && user.location.lat && user.location.lng) {
              const distance = getDistance(
                { latitude: user.location.lat, longitude: user.location.lng },
                { latitude: sessionData.location.lat, longitude: sessionData.location.lng }
              );
              if (distance <= 10000) {
                nearbyUserIds.push(user.id || user.uid);
              }
            }
          });

          if (nearbyUserIds.length > 0) {
            const tokens = allUsers
              .filter(u => nearbyUserIds.includes(u.id || u.uid) && u.fcmToken)
              .map(u => u.fcmToken);

            if (tokens.length > 0) {
              await sendFCMNotification(
                tokens,
                "New Session Nearby! 📍",
                `"${sessionData.name}" is starting near you. Tap to check in!`
              );
            }
          }
        } catch (notifyErr) {
          console.error("Background notification failed:", notifyErr);
        }
      }, 100);

    } catch (err) {
      setError('Failed to create session: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseSession = async (sessionId) => {
    try {
      await updateSession(sessionId, { isActive: false });
      stopSessionCodeRotation(sessionId);
      loadData();
      setNotification({ open: true, message: 'Session closed.' });
    } catch (err) {
      setError('Failed to close session: ' + err.message);
    }
  };

  const handleLocationSelect = (location) => {
    setFormData(prev => ({ ...prev, location }));
  };

  const handleApproveRequest = async (request) => {
    try {
      await approveAttendanceRequest(request.id, request, 'admin@example.com'); // Replace with actual admin email
      setNotification({ open: true, message: `Approved attendance for ${request.userEmail}` });

      // Notify user
      const userDoc = await getUser(request.userId);
      if (userDoc?.fcmToken) {
        await sendFCMNotification(
          [userDoc.fcmToken],
          "Attendance Approved! ✅",
          `You have been marked present for ${sessions.find(s => s.id === request.sessionId)?.name || 'the session'}.`
        );
      }
    } catch (err) {
      setError('Failed to approve request: ' + err.message);
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      await rejectAttendanceRequest(request.id, auth.currentUser?.email || 'admin@example.com');
      await rejectAttendanceRequest(request.id, auth.currentUser?.email || 'admin@example.com');
      setNotification({ open: true, message: `Rejected attendance for ${request.userEmail}` });

      // Notify user
      const userDoc = await getUser(request.userId);
      if (userDoc?.fcmToken) {
        await sendFCMNotification(
          [userDoc.fcmToken],
          "Request Rejected ❌",
          "Your attendance request was declined. Please check with the admin."
        );
      }
    } catch (err) {
      setError('Failed to reject request: ' + err.message);
    }
  };

  const verifyIntegrity = async (sessionData) => {
    if (!sessionData) return;
    setIntegrityStatus('checking');
    setInvalidRecords([]);

    try {
      const attendance = await getAttendanceBySession(sessionData.id);
      // Sort by timestamp to evaluate chain
      const sorted = [...attendance].sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return timeA - timeB;
      });

      const errors = [];
      const tamperedDetails = {};

      for (const record of sorted) {
        // Normalize timestamp to ISO string to match firestore.js logic
        const tsISO = record.timestamp?.toDate ? record.timestamp.toDate().toISOString() : new Date(record.timestamp).toISOString();

        const recordStr = JSON.stringify({
          userId: record.userId,
          sessionId: record.sessionId,
          timestamp: tsISO,
          prevHash: record.prevHash
        });
        const calculatedHash = await sha256(recordStr);
        if (calculatedHash !== record.hash) {
          errors.push(record.id);
          tamperedDetails[record.id] = {
            expected: calculatedHash,
            actual: record.hash,
            reason: "Data Mismatch (Field modification detected)"
          };
        }
      }

      setInvalidRecords(errors);
      if (errors.length > 0) {
        setIntegrityStatus('invalid');
        setNotification({ open: true, message: `Found ${errors.length} compromised records!` });
        // Automatically expand suspect records
        setExpandedRecords(new Set(errors));
      } else {
        setIntegrityStatus('valid');
        setNotification({ open: true, message: 'Blockchain integrity verified. All records are authentic.' });
      }
    } catch (err) {
      console.error("Integrity check failed:", err);
      setIntegrityStatus('error');
      setError('Integrity Check Error: ' + err.message);
    }
  };

  const handleColorChange = async (color) => {
    setAdminColor(color);
    if (auth.currentUser) {
      try {
        await setUserRole(auth.currentUser.uid, 'admin', null, color);
        setNotification({ open: true, message: 'Brand color updated successfully.' });
      } catch (err) {
        setError('Failed to update color: ' + err.message);
      }
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'radius' ? parseInt(value, 10) : value)
    }));
  };

  const handleExport = (session) => {
    const sessionAttendance = attendance[session.id];
    if (sessionAttendance && sessionAttendance.length > 0) {
      const csv = unparse(sessionAttendance.map(att => ({
        'User Name': att.userName || 'Unknown',
        'User Email': att.userEmail,
        'Timestamp': att.timestamp?.toDate ? att.timestamp.toDate().toISOString() : att.timestamp,
        'Distance (m)': att.distance.toFixed(1),
        'Blockchain Hash': att.hash || 'N/A',
        'Prev Record Hash': att.prevHash || 'N/A',
        'Status': att.offline ? 'Offline Check-in' : 'Online Check-in',
        'Security Status': (invalidRecords.includes(att.id)) ? 'TAMPERED' : 'VERIFIED'
      })));
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_${session.name.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      setNotification({ open: true, message: 'No attendance data available to export.' });
    }
  };

  const { activeSessions, pastSessions, totalAttendees } = useMemo(() => {
    const active = sessions.filter(s => s.isActive && isWithinTimeWindow(s.startTime, s.endTime));
    const past = sessions.filter(s => !s.isActive || !isWithinTimeWindow(s.startTime, s.endTime));
    const total = Object.values(attendance).reduce((acc, curr) => acc + curr.length, 0);
    return { activeSessions: active, pastSessions: past, totalAttendees: total };
  }, [sessions, attendance]);

  const chartData = useMemo(() => {
    return sessions.slice(0, 7).map(session => ({
      name: (session.name || 'Untitled').substring(0, 10),
      attendees: (attendance[session.id] || []).length,
    })).reverse();
  }, [sessions, attendance]);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3, borderRadius: 0, bgcolor: 'rgba(255, 0, 85, 0.1)', color: '#ff0055', border: '1px solid #ff0055' }}>{error}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: 'Outfit', color: 'white', letterSpacing: -1 }}>Admin Dashboard</Typography>
            <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 700, letterSpacing: 2 }}>OPERATIONS OVERVIEW // ATLAS</Typography>
          </Box>
          <IconButton
            onClick={() => setShowColorPicker(!showColorPicker)}
            sx={{
              color: adminColor,
              bgcolor: `${adminColor}15`,
              '&:hover': { bgcolor: `${adminColor}30` }
            }}
          >
            <PaletteIcon />
          </IconButton>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenCreateModal(true)}
          sx={{
            px: 4,
            height: 48,
            borderRadius: 0,
            bgcolor: adminColor,
            '&:hover': { bgcolor: adminColor, filter: 'brightness(1.2)' }
          }}
        >
          CREATE SESSION
        </Button>
      </Stack>

      {showColorPicker && (
        <Box className="glass-effect" sx={{ p: 2, mb: 4, borderRadius: 1, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 900, color: 'white' }}>SELECT BRAND COLOR:</Typography>
          {['#00f3ff', '#ff00ff', '#ffff00', '#39ff14', '#ff4d4d', '#ff9f43', '#00d2d3', '#5f27cd'].map(color => (
            <Box
              key={color}
              onClick={() => handleColorChange(color)}
              sx={{
                width: 30,
                height: 30,
                bgcolor: color,
                cursor: 'pointer',
                border: adminColor === color ? '2px solid white' : 'none',
                borderRadius: '4px',
                transition: '0.2s',
                '&:hover': { transform: 'scale(1.2)' }
              }}
            />
          ))}
          <IconButton onClick={() => setShowColorPicker(false)} sx={{ ml: 'auto', color: 'white', opacity: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Attendees"
            value={totalAttendees}
            icon={<PeopleIcon />}
            color="#00f3ff"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Sessions"
            value={activeSessions.length}
            icon={<EventIcon />}
            color="#39ff14"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Past Sessions"
            value={pastSessions.length}
            icon={<HistoryIcon />}
            color="#ff00ff"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Attendance Rate"
            value="98.2%"
            icon={<TrendingIcon />}
            color="#ffff00"
          />
        </Grid>
      </Grid>

      <Modal open={openCreateModal} onClose={() => setOpenCreateModal(false)}>
        <Box sx={modalStyle}>
          <Box component="form" onSubmit={handleCreateSession} sx={{ display: 'flex', width: '100%', height: '100%' }}>
            {/* Left Side: Form Controls */}
            <Box sx={{
              width: '400px',
              flexShrink: 0,
              p: 5,
              borderRight: '1px solid rgba(0, 243, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'rgba(255, 255, 255, 0.01)',
              height: '100%'
            }}>
              <Typography variant="h5" sx={{ mb: 4, fontWeight: 900, fontFamily: 'Outfit', color: '#00f3ff' }}>CREATE SESSION</Typography>

              <Stack spacing={3} sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, pt: 1 }}>
                <TextField fullWidth label="Session Name" name="name" value={formData.name} onChange={handleFormChange} required />
                <TextField fullWidth label="Radius (meters)" name="radius" type="number" value={formData.radius} onChange={handleFormChange} required />

                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="Start Time"
                    value={formData.startTime}
                    onChange={(newValue) => setFormData({ ...formData, startTime: newValue })}
                    slotProps={{ textField: { fullWidth: true, required: true } }}
                  />
                  <DateTimePicker
                    label="End Time"
                    value={formData.endTime}
                    onChange={(newValue) => setFormData({ ...formData, endTime: newValue })}
                    slotProps={{ textField: { fullWidth: true, required: true } }}
                  />
                </LocalizationProvider>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.requireSessionCode}
                      onChange={(e) => setFormData({ ...formData, requireSessionCode: e.target.checked })}
                      sx={{ color: 'rgba(0, 243, 255, 0.3)', '&.Mui-checked': { color: '#00f3ff' } }}
                    />
                  }
                  sx={{ color: 'rgba(255,255,255,0.6)' }}
                  label="Require Session Code"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.requireApproval}
                      onChange={(e) => setFormData({ ...formData, requireApproval: e.target.checked })}
                      sx={{ color: 'rgba(255, 215, 0, 0.3)', '&.Mui-checked': { color: '#ffd700' } }}
                    />
                  }
                  sx={{ color: 'rgba(255,255,255,0.6)' }}
                  label="Require Admin Approval"
                />

                {formData.location && (
                  <Box sx={{ p: 2, bgcolor: 'rgba(0, 243, 255, 0.05)', border: '1px solid rgba(0, 243, 255, 0.1)', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ color: '#00f3ff', fontWeight: 800 }}>LOCATION SET:</Typography>
                    <Typography variant="body2" sx={{ color: 'white', mt: 0.5, fontSize: '0.75rem' }}>
                      {formData.location.lat.toFixed(4)}, {formData.location.lng.toFixed(4)}
                    </Typography>
                  </Box>
                )}
              </Stack>

              <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button onClick={() => setOpenCreateModal(false)} variant="text" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800 }} disabled={isCreating}>CANCEL</Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isCreating}
                  startIcon={isCreating ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                >
                  {isCreating ? 'CREATING...' : 'SAVE SESSION'}
                </Button>
              </Box>
            </Box>

            {/* Right Side: Map */}
            <Box sx={{ flexGrow: 1, position: 'relative', height: '100%', bgcolor: '#000' }}>
              <Box sx={{ width: '100%', height: '100%' }}>
                {openCreateModal && <MapPicker onLocationSelect={handleLocationSelect} radius={formData.radius} />}
              </Box>
              {/* Floating Help Tag */}
              <Box sx={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, pointerEvents: 'none' }}>
                <Typography variant="caption" sx={{ bgcolor: 'rgba(5,5,5,0.9)', color: '#00f3ff', px: 2, py: 1, borderRadius: 1, border: '1px solid rgba(0,243,255,0.3)', fontWeight: 800 }}>
                  CLICK MAP TO SET LOCATION
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Modal>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress thickness={2} sx={{ color: '#00f3ff' }} /></Box>
      ) : (
        <>
          <Box className="glass-effect" sx={{ p: 4, mb: 4, borderRadius: 1, border: '1px solid rgba(0, 243, 255, 0.1)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'Outfit', color: '#00f3ff', letterSpacing: 1 }}>ATTENDANCE TRENDS</Typography>
              <IconButton onClick={() => setShowChart(!showChart)} size="small" sx={{ color: '#00f3ff' }}>
                <ExpandMoreIcon sx={{ transform: showChart ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }} />
              </IconButton>
            </Box>
            <Collapse in={showChart}>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorAttendees" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#00f3ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 243, 255, 0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(0, 243, 255, 0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(0, 243, 255, 0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#050505', border: '1px solid #00f3ff', borderRadius: '4px' }}
                      itemStyle={{ color: '#00f3ff', fontWeight: 900 }}
                    />
                    <Area type="monotone" dataKey="attendees" stroke="#00f3ff" strokeWidth={4} fillOpacity={1} fill="url(#colorAttendees)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Collapse>
          </Box>

          {/* Pending Requests Panel */}
          {Object.keys(pendingRequests).some(key => pendingRequests[key]?.length > 0) && (
            <Box className="glass-effect" sx={{ p: 4, mb: 4, borderRadius: 1, border: '1px solid rgba(255, 255, 0, 0.2)' }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <NotificationsIcon sx={{ color: '#ffff00', fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'Outfit', color: '#ffff00', letterSpacing: 1 }}>
                  PENDING ATTENDANCE REQUESTS
                </Typography>
                <Chip
                  label={Object.values(pendingRequests).reduce((acc, curr) => acc + (curr?.length || 0), 0)}
                  size="small"
                  sx={{ bgcolor: 'rgba(255, 255, 0, 0.2)', color: '#ffff00', fontWeight: 900 }}
                />
              </Stack>

              <Grid container spacing={2}>
                {Object.entries(pendingRequests).map(([sessionId, requests]) => {
                  const session = sessions.find(s => s.id === sessionId);
                  if (!requests || requests.length === 0) return null;

                  return requests.map((request) => (
                    <Grid item xs={12} md={6} lg={4} key={request.id}>
                      <Card sx={{ bgcolor: 'rgba(255, 255, 0, 0.05)', border: '1px solid rgba(255, 255, 0, 0.2)', borderRadius: 1 }}>
                        <CardContent>
                          <Typography variant="caption" sx={{ color: '#ffff00', fontWeight: 900, letterSpacing: 1 }}>
                            {session?.name || 'Unknown Session'}
                          </Typography>
                          <Typography variant="h6" sx={{ color: 'white', fontWeight: 800, my: 1 }}>
                            {request.userName || request.userEmail}
                          </Typography>
                          {request.userName && (
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
                              {request.userEmail}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ opacity: 0.6 }}>
                              Distance: {request.distance?.toFixed(1)}m
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.6 }}>
                              {request.timestamp?.toDate ? request.timestamp.toDate().toLocaleTimeString() : 'Just now'}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={1}>
                            <Button
                              fullWidth
                              variant="contained"
                              size="small"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => handleApproveRequest(request)}
                              sx={{ bgcolor: '#39ff14', color: '#000', fontWeight: 900, '&:hover': { bgcolor: '#2dd10f' } }}
                            >
                              APPROVE
                            </Button>
                            <Button
                              fullWidth
                              variant="outlined"
                              size="small"
                              startIcon={<CancelIcon />}
                              onClick={() => handleRejectRequest(request)}
                              sx={{ borderColor: '#ff0055', color: '#ff0055', fontWeight: 900, '&:hover': { borderColor: '#ff0055', bgcolor: 'rgba(255, 0, 85, 0.1)' } }}
                            >
                              REJECT
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ));
                })}
              </Grid>
            </Box>
          )}

          <Tabs
            value={tabIndex}
            onChange={(e, newValue) => setTabIndex(newValue)}
            sx={{
              mb: 3,
              '& .MuiTabs-indicator': { bgcolor: '#00f3ff' },
              '& .MuiTab-root': { fontWeight: 900, px: 4, letterSpacing: 1, color: 'rgba(255,255,255,0.4)' },
              '& .Mui-selected': { color: '#00f3ff !important' },
              borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            <Tab label="ACTIVE SESSIONS" />
            <Tab label="PAST SESSIONS" />
            <Tab label="AI ASSISTANT" />
          </Tabs>

          {tabIndex === 0 && <SessionTable sessions={activeSessions} attendance={attendance} onExport={handleExport} onClose={handleCloseSession} isActive={true} onShowCode={setFullscreenSessionId} onShowAttendees={(session, list) => setViewAttendees({ session, list })} livingCodes={livingCodes} />}
          {tabIndex === 1 && <SessionTable sessions={pastSessions} attendance={attendance} onExport={handleExport} onShowAttendees={(session, list) => setViewAttendees({ session, list })} livingCodes={livingCodes} />}
          {tabIndex === 2 && <GeminiAssistant activeSessions={activeSessions} pastSessions={pastSessions} attendance={attendance} />}
        </>
      )}

      {/* Fullscreen Code Modal */}
      <Modal open={!!fullscreenSessionId} onClose={() => setFullscreenSessionId(null)}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100vw',
          height: '100vh',
          bgcolor: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#00f3ff',
          zIndex: 9999
        }}>
          <Typography variant="h6" sx={{ letterSpacing: 5, opacity: 0.5, mb: 2 }}>SECURITY CODE</Typography>
          <Typography variant="h1" sx={{ fontWeight: 900, fontFamily: 'monospace', fontSize: '25vw', letterSpacing: 10, textShadow: '0 0 50px #00f3ff' }}>
            {livingCodes[fullscreenSessionId] || '---'}
          </Typography>

          <Box sx={{ width: '40vw', mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: 1 }}>SYNCHRONIZING...</Typography>
              <Typography variant="caption" sx={{ fontWeight: 900 }}>{secondsRemaining}s</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(secondsRemaining / 10) * 100}
              sx={{
                height: 4,
                bgcolor: 'rgba(0, 243, 255, 0.1)',
                '& .MuiLinearProgress-bar': { bgcolor: '#00f3ff' }
              }}
            />
          </Box>

          <Button
            variant="outlined"
            onClick={() => setFullscreenSessionId(null)}
            sx={{ mt: 10, borderColor: '#00f3ff', color: '#00f3ff', px: 5, py: 2, fontWeight: 900 }}
          >
            CLOSE FULLSCREEN
          </Button>
        </Box>
      </Modal>

      {/* Attendee Details Modal */}
      <Modal open={!!viewAttendees} onClose={() => setViewAttendees(null)}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          maxHeight: '80vh',
          bgcolor: '#050505',
          border: '1px solid #00f3ff',
          p: 4,
          overflowY: 'auto'
        }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 900, color: '#00f3ff', borderBottom: '1px solid rgba(0,243,255,0.2)', pb: 2 }}>
            ATTENDEE LIST
          </Typography>

          <Button
            variant="outlined"
            size="small"
            color={integrityStatus === 'valid' ? 'success' : (integrityStatus === 'invalid' ? 'error' : 'primary')}
            onClick={() => verifyIntegrity(viewAttendees?.session)}
            startIcon={integrityStatus === 'checking' ? <CircularProgress size={16} /> : <SecurityIcon />}
            sx={{ borderRadius: 0, fontWeight: 900, mb: 3, width: '100%', py: 1.5 }}
          >
            {integrityStatus === 'valid' ? 'CHAIN VERIFIED' : (integrityStatus === 'invalid' ? 'TAMPERING DETECTED' : 'VERIFY BLOCKCHAIN INTEGRITY')}
          </Button>

          {viewAttendees?.list && viewAttendees.list.map((att, i) => (
            <Box key={i} sx={{
              py: 2,
              px: 2,
              mb: 1,
              border: invalidRecords.includes(att.id) ? '1px solid #ff0055' : '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: invalidRecords.includes(att.id) ? 'rgba(255,0,85,0.1)' : 'transparent',
              position: 'relative'
            }}>
              {invalidRecords.includes(att.id) && (
                <Chip
                  label="SECURITY ALERT"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: '#ff0055',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.6rem',
                    borderRadius: 0
                  }}
                />
              )}
              <Typography sx={{
                color: invalidRecords.includes(att.id) ? '#ff0055' : 'white',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}>
                {att.userName || 'Unknown Name'}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.5 }}>{att.userEmail}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.4, display: 'block' }}>{safeFormat(att.timestamp)}</Typography>
                </Box>
                <Button
                  size="small"
                  onClick={() => {
                    const newSet = new Set(expandedRecords);
                    if (newSet.has(att.id)) newSet.delete(att.id);
                    else newSet.add(att.id);
                    setExpandedRecords(newSet);
                  }}
                  sx={{ fontSize: '0.6rem', fontWeight: 900, color: '#00f3ff' }}
                >
                  {expandedRecords.has(att.id) ? 'HIDE HASH' : 'VIEW PROOF'}
                </Button>
              </Box>

              <Collapse in={expandedRecords.has(att.id) || invalidRecords.includes(att.id)}>
                <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: 'rgba(0, 243, 255, 0.5)', fontSize: '0.6rem' }}>
                    HASH: {att.hash || 'NONE'}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', opacity: 0.3, fontSize: '0.55rem' }}>
                    PREV: {att.prevHash || 'NONE'}
                  </Typography>
                  {invalidRecords.includes(att.id) && (
                    <Typography variant="caption" sx={{ color: '#ff0055', fontWeight: 900, mt: 0.5, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                      🚨 Warning: Hash mismatch. Record data has been altered after submission!
                    </Typography>
                  )}
                </Box>
              </Collapse>
            </Box>
          ))}
          {(!viewAttendees?.list || viewAttendees.list.length === 0) && (
            <Typography sx={{ opacity: 0.3, py: 4, textAlign: 'center' }}>NO ATTENDEES RECORDED</Typography>
          )}
          <Button fullWidth onClick={() => {
            setViewAttendees(null);
            setIntegrityStatus(null);
            setInvalidRecords([]);
            setExpandedRecords(new Set());
          }} sx={{ mt: 4, color: '#00f3ff', fontWeight: 900 }}>CLOSE</Button>
        </Box>
      </Modal>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ open: false, message: '' })}
        message={notification.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        ContentProps={{ sx: { bgcolor: '#050505', color: '#00f3ff', border: '1px solid #00f3ff', fontWeight: 900 } }}
      />
    </Box>
  );
};

const SessionTable = ({ sessions, attendance, onExport, onClose, isActive = false, onShowCode, onShowAttendees, livingCodes = {} }) => {
  const columns = [
    {
      field: 'name',
      headerName: 'SESSION NAME',
      flex: 2,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontWeight: 800, color: 'white' }}>{params.value}</Typography>
        </Box>
      )
    },
    {
      field: 'sessionCode',
      headerName: 'SESSION CODE',
      flex: 1,
      renderCell: (params) => (
        livingCodes[params.row.id] || params.value ? (
          <Chip label={livingCodes[params.row.id] || params.value} size="small" sx={{ fontFamily: 'monospace', borderRadius: 0, fontWeight: 900, fontSize: '0.7rem' }} />
        ) : <Typography variant="caption" sx={{ opacity: 0.3 }}>-</Typography>
      )
    },
    {
      field: 'attendees',
      headerName: 'ATTENDEES',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          onClick={() => onShowAttendees(params.row, attendance[params.row.id] || [])}
          sx={{
            bgcolor: 'rgba(0, 243, 255, 0.1)',
            color: '#00f3ff',
            fontWeight: 900,
            borderRadius: 0,
            border: '1px solid rgba(0, 243, 255, 0.3)',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(0, 243, 255, 0.2)' }
          }}
        />
      )
    },
    {
      field: 'startTime',
      headerName: 'START TIME',
      flex: 1.5,
      renderCell: (params) => (
        <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.6 }}>{safeFormat(params.value, 'MMM d, h:mm a')}</Typography>
      )
    },
    {
      field: 'actions',
      headerName: 'ACTIONS',
      flex: 1.5,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
          {params.row.sessionCode && (
            <IconButton size="small" onClick={() => onShowCode(params.row.id)} sx={{ color: '#00f3ff' }}>
              <FullscreenIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" onClick={() => onExport(params.row)} sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#00f3ff' } }}>
            <DownloadIcon fontSize="small" />
          </IconButton>
          {isActive && (
            <IconButton size="small" onClick={() => onClose(params.row.id)} sx={{ color: '#ff0055' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  const rows = sessions.map(session => ({
    ...session,
    id: session.id,
    name: session.name || 'Untitled Session',
    attendees: (attendance[session.id] || []).length,
    startTime: safeDate(session.startTime?.toDate ? session.startTime.toDate() : session.startTime),
    endTime: safeDate(session.endTime?.toDate ? session.endTime.toDate() : session.endTime),
  }));

  return (
    <Box className="glass-effect" sx={{ height: 500, width: '100%', p: 1, overflow: 'hidden', borderRadius: 0 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={7}
        rowsPerPageOptions={[7, 15, 30]}
        disableSelectionOnClick
        sx={{
          border: 0,
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid rgba(255,255,255,0.03)',
            display: 'flex',
            alignItems: 'center'
          },
          '& .MuiDataGrid-columnHeaders': {
            borderBottom: '1px solid rgba(0, 243, 255, 0.2)',
            bgcolor: 'rgba(0, 243, 255, 0.02)',
            minHeight: '56px !important'
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 900,
            fontSize: '0.8rem',
            color: '#00f3ff',
            letterSpacing: 1.5,
            textTransform: 'uppercase'
          },
          '& .MuiDataGrid-footerContainer': { borderTop: '1px solid rgba(255,255,255,0.05)' },
          '& .MuiDataGrid-virtualScroller': { overflowX: 'hidden' }
        }}
      />
    </Box>
  );
};

export default AdminDashboard;
