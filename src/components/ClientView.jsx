
import React, { useState, useEffect } from 'react';
import { getSessions, addAttendanceRequest, getAttendanceForUser, getSession, listenToUserAttendanceRequest, addAttendance, listenToSessions, getUser, syncPendingAttendance } from '../firebase/firestore';
import { getDistance } from 'geolib';
import { generateCheckInProof, generateSessionCode } from '../utils/crypto';
import { savePendingCheckIn } from '../utils/idb';

import { format } from 'date-fns';
import { getTimeRemaining, safeDate, isWithinTimeWindow } from '../utils/time';
import {
    Box,
    Button,
    Typography,
    Grid,
    CircularProgress,
    Alert,
    Stack,
    Avatar,
    Chip,
    Snackbar,
    Modal,
    TextField,
    Tabs,
    Tab,
    InputAdornment
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    LocationOn as LocationIcon,
    Timer as TimerIcon,
    GpsFixed as GpsIcon,
    InfoOutlined as InfoIcon,
    Security as SecurityIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const ClientView = ({ user }) => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userLocation, setUserLocation] = useState(null);
    const [attendedSessions, setAttendedSessions] = useState(new Set());
    const [notification, setNotification] = useState({ open: false, message: '' });
    const [codeModalOpen, setCodeModalOpen] = useState(false);
    const [sessionCode, setSessionCode] = useState('');
    const [latestSessionData, setLatestSessionData] = useState(null);
    const [currentSession, setCurrentSession] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [pendingRequests, setPendingRequests] = useState({});
    const [tabIndex, setTabIndex] = useState(0);
    const [userData, setUserData] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [syncing, setSyncing] = useState(false);
    const notifiedRef = React.useRef(new Set());
    const appStartTime = React.useRef(new Date());

    const modalStyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 350,
        bgcolor: '#050505',
        border: '1px solid #00f3ff',
        boxShadow: '0 0 50px rgba(0, 243, 255, 0.2)',
        p: 4,
        borderRadius: 0,
    };

    // Safe notification helper for mobile and desktop
    const showAppNotification = async (title, body) => {
        if (Notification.permission !== 'granted') return;

        try {
            // Service worker approach (best for mobile PWA)
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration && 'showNotification' in registration) {
                await registration.showNotification(title, {
                    body,
                    icon: "/pwa-192x192.png",
                    badge: "/pwa-192x192.png",
                    vibrate: [200, 100, 200]
                });
            } else {
                // Fallback for older browsers or non-SW environments
                new Notification(title, { body, icon: "/pwa-192x192.png" });
            }
        } catch (err) {
            console.error("Notification error:", err);
            // Last resort fallback
            try {
                new Notification(title, { body, icon: "/pwa-192x192.png" });
            } catch (innerErr) {
                console.warn("Direct Notification failed:", innerErr);
            }
        }
    };

    useEffect(() => {
        const handleOnline = async () => {
            setIsOffline(false);
            setSyncing(true);
            const count = await syncPendingAttendance();
            if (count > 0) {
                setNotification({ open: true, message: `Synced ${count} offline check-ins!` });
                loadInitialData();
            }
            setSyncing(false);
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        loadInitialData();

        // Live countdown timer
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(timer);
        };
    }, [user.uid]);

    // Listen to request status for each session that requires approval
    useEffect(() => {
        const unsubscribers = [];
        // Only listen to active sessions that the user hasn't already attended
        sessions.filter(s => s.isActive && !attendedSessions.has(s.id)).forEach(session => {
            if (session.requireApproval) {
                const unsubscribe = listenToUserAttendanceRequest(session.id, user.uid, (request) => {
                    if (!request) return;

                    const notifyKey = `${session.id}_${request.status}`;

                    // Filter: Only notify if processed AFTER the app started
                    const processedTime = request.processedAt?.toDate ? request.processedAt.toDate() : (request.processedAt ? new Date(request.processedAt) : null);
                    const isNewUpdate = processedTime && processedTime > appStartTime.current;

                    // Show notification on status change if not already notified AND is a fresh update
                    if (request.status === 'approved' && !notifiedRef.current.has(notifyKey)) {
                        if (isNewUpdate) {
                            setNotification({ open: true, message: 'Attendance approved!' });
                            showAppNotification("Attendance Approved! ✅", `You have been marked present for ${session.name}.`);
                        }
                        notifiedRef.current.add(notifyKey);
                        setAttendedSessions(prev => new Set(prev).add(session.id));
                        setPendingRequests(prev => {
                            const updated = { ...prev };
                            delete updated[session.id];
                            return updated;
                        });
                    } else if (request.status === 'rejected' && !notifiedRef.current.has(notifyKey)) {
                        if (isNewUpdate) {
                            setNotification({ open: true, message: 'Attendance request rejected.' });
                            showAppNotification("Request Rejected ❌", `Your request for ${session.name} was declined.`);
                        }
                        notifiedRef.current.add(notifyKey);
                        setPendingRequests(prev => {
                            const updated = { ...prev };
                            delete updated[session.id];
                            return updated;
                        });
                    } else if (request.status === 'pending') {
                        setPendingRequests(prev => ({
                            ...prev,
                            [session.id]: request
                        }));
                    }
                });
                unsubscribers.push(unsubscribe);
            }
        });

        return () => unsubscribers.forEach(unsub => unsub());
    }, [sessions, user.uid, attendedSessions]);

    // Geo-fencing Notification Logic
    useEffect(() => {
        if (!userLocation) return;

        sessions.forEach(session => {
            if (!isWithinTimeWindow(session.startTime, session.endTime)) return;
            if (attendedSessions.has(session.id)) return;

            const distance = getDistance(
                { latitude: userLocation.lat, longitude: userLocation.lng },
                { latitude: session.location.lat, longitude: session.location.lng }
            );

            // Notify if within range and haven't notified yet for this session/status
            // Note: simple implementation, might spam if location drifts in/out. 
            // Better to track 'notifiedSessions' state.
            if (distance <= session.radius) {
                // Check if we already have a pending request or attendance
                const isPending = pendingRequests[session.id]?.status === 'pending';
                if (!isPending) {
                    // Using the browser's Notification API directly for local alerts
                    if (Notification.permission === 'granted') {
                        // Debounce by checking a local set or just rely on OS throttling
                        // For this demo, we'll trust the user to not be annoyed by one pop-up
                        // Real-world: track 'hasNotified' in a ref or state
                    }
                }
            }
        });
    }, [userLocation, sessions, attendedSessions, pendingRequests]);

    useEffect(() => {
        const unsubscribe = listenToSessions((allSessions) => {
            // Check for new sessions if we already have data (detect changes)
            setSessions(prevSessions => {
                if (prevSessions.length > 0) {
                    const newSessions = allSessions.filter(s =>
                        !prevSessions.find(prev => prev.id === s.id) &&
                        s.isActive &&
                        isWithinTimeWindow(s.startTime, s.endTime)
                    );

                    if (newSessions.length > 0) {
                        // Play a sound or vibrate if possible
                        if (navigator.vibrate) navigator.vibrate(200);

                        setNotification({
                            open: true,
                            message: `New Session: ${newSessions[0].name} is now active!`
                        });

                        // Also trigger browser notification if permission granted
                        showAppNotification("New Session!", `${newSessions[0].name} has started.`);
                    }
                }
                return allSessions;
            });
        });
        return () => unsubscribe();
    }, []);

    const loadInitialData = async () => {
        // Only show full screen loading if we have no sessions yet
        if (sessions.length === 0) setLoading(true);
        setError('');

        // 1. Fetch user data (attendance & profile)
        const fetchData = async () => {
            try {
                const [userAttendance, profile] = await Promise.all([
                    getAttendanceForUser(user.uid),
                    getUser(user.uid)
                ]);
                setUserData(profile);
                setAttendedSessions(new Set(userAttendance.map(att => att.sessionId)));
            } catch (attErr) {
                console.error("Failed to load attendance/profile:", attErr);
            } finally {
                // Once data is loaded (or failed), stop the full screen loading
                setLoading(false);
            }
        };

        // 2. Fetch location in the background
        const fetchLocation = async () => {
            try {
                const getPos = (highAccuracy) => new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: highAccuracy,
                        timeout: highAccuracy ? 15000 : 8000, // Slightly shorter for offline
                        maximumAge: highAccuracy ? 0 : 30000
                    });
                });

                let location;
                try {
                    location = await getPos(true);
                } catch (err) {
                    location = await getPos(false);
                }

                const { latitude, longitude } = location.coords;
                setUserLocation({ lat: latitude, lng: longitude });
                setError('');

                if (!notifiedRef.current.has('location_verified')) {
                    showAppNotification("Location Verified", "You are now visible to the attendance system.");
                    notifiedRef.current.add('location_verified');
                }
            } catch (err) {
                if (!userLocation) {
                    setError(`Location Required: ${err.message}`);
                }
            }
        };

        // Run both in parallel without blocking the UI if we have data
        fetchData();
        fetchLocation();
    };

    const handleCheckIn = async (session) => {
        if (!isWithinTimeWindow(session.startTime, session.endTime)) {
            setError("This session is not currently active.");
            return;
        }
        if (!userLocation) {
            setError("Could not determine your location. Please check your GPS settings.");
            return;
        }

        const distance = getDistance(
            { latitude: userLocation.lat, longitude: userLocation.lng },
            { latitude: session.location.lat, longitude: session.location.lng }
        );

        if (distance > session.radius) {
            setError(`Out of range: You are ${distance.toFixed(0)}m away. Required: ${session.radius}m.`);
            return;
        }

        // Check if session requires a code
        if (session.sessionCode) {
            setCurrentSession(session);
            setCodeModalOpen(true);
            return;
        }

        // Check if session requires approval
        if (session.requireApproval) {
            await submitAttendanceRequest(session, distance);
        } else {
            await markAttendance(session, distance);
        }
    };

    const handleCodeSubmit = async () => {
        if (!currentSession) return;

        setError('');
        try {
            let sessionToVerify;
            if (isOffline) {
                // In offline mode, use the session data we already have from state
                sessionToVerify = currentSession;
            } else {
                // In online mode, fetch fresh data to ensure session is still active
                sessionToVerify = await getSession(currentSession.id);
                if (!sessionToVerify || !sessionToVerify.isActive) {
                    setError("This session is no longer active.");
                    setCodeModalOpen(false);
                    return;
                }
            }

            const enteredCode = sessionCode.trim();
            let isValid = false;

            // 1. Check against locally calculated codes (TOTP - accounting for clock skew)
            const now = Date.now();
            const interval = 10000;
            const secret = sessionToVerify.sessionSecret || sessionToVerify.id;

            // We check CURRENT, PREVIOUS, and NEXT intervals (30s window total)
            const potentials = await Promise.all([
                generateSessionCode(secret, now - interval, interval),
                generateSessionCode(secret, now, interval),
                generateSessionCode(secret, now + interval, interval)
            ]);

            if (potentials.includes(enteredCode)) {
                isValid = true;
            }
            // 2. Fallback to code stored in Firestore (if online/available)
            else if (sessionToVerify.sessionCode === enteredCode) {
                isValid = true;
            }

            if (isValid) {
                const distance = getDistance(
                    { latitude: userLocation.lat, longitude: userLocation.lng },
                    { latitude: sessionToVerify.location.lat, longitude: sessionToVerify.location.lng }
                );
                // Check if requires approval after code verification
                if (sessionToVerify.requireApproval) {
                    await submitAttendanceRequest(sessionToVerify, distance);
                } else {
                    await markAttendance(sessionToVerify, distance);
                }
                setCodeModalOpen(false);
                setSessionCode('');
            } else {
                setError("Invalid security code. Codes update every 10s!");
            }
        } catch (err) {
            setError("Verification failed: " + err.message);
        }
    };

    const submitAttendanceRequest = async (session, distance) => {
        try {
            await addAttendanceRequest({
                sessionId: session.id,
                userId: user.uid,
                userEmail: user.email,
                userName: userData?.displayName || user.displayName || 'Anonymous',
                distance: distance,
                timestamp: new Date()
            });
            setNotification({ open: true, message: 'Request sent to admin for approval.' });
        } catch (err) {
            setError('Failed to submit request: ' + err.message);
        }
    };

    const markAttendance = async (session, distance) => {
        try {
            const checkInData = {
                sessionId: session.id,
                userId: user.uid,
                userEmail: user.email,
                userName: userData?.displayName || user.displayName || 'Anonymous',
                distance: distance,
                timestamp: new Date().toISOString()
            };

            if (isOffline) {
                // Generate cryptographic proof for offline verification
                const proof = await generateCheckInProof({
                    ...checkInData,
                    code: sessionCode,
                    timestamp: checkInData.timestamp
                });

                await savePendingCheckIn({ ...checkInData, proof });
                setNotification({ open: true, message: 'Check-in saved offline. Will sync when online.' });
                // Optimistically mark as attended in UI
                setAttendedSessions(prev => new Set(prev).add(session.id));
            } else {
                await addAttendance({
                    ...checkInData,
                    timestamp: new Date()
                });
                setAttendedSessions(prev => new Set(prev).add(session.id));
                setNotification({ open: true, message: 'Attendance confirmed.' });
            }
        } catch (err) {
            setError('Failed to mark attendance: ' + err.message);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
                <CircularProgress thickness={2} size={40} sx={{ color: '#00f3ff' }} />
                <Typography variant="body2" sx={{ opacity: 0.5, fontWeight: 900, letterSpacing: 2 }}>INITIALIZING...</Typography>
            </Box>
        );
    }

    // Filter sessions into active and past
    const now = new Date();
    const activeSessions = sessions.filter(session => session.isActive && isWithinTimeWindow(session.startTime, session.endTime));
    const pastSessions = sessions.filter(session => !session.isActive || !isWithinTimeWindow(session.startTime, session.endTime));
    const displaySessions = (tabIndex === 0 ? activeSessions : pastSessions).filter(session =>
        session.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Box sx={{ p: { xs: 2, sm: 4 } }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: 'Outfit', mb: 3, color: 'white' }}>Sessions</Typography>

                <Box sx={{ borderBottom: 1, borderColor: 'rgba(0, 243, 255, 0.1)', mb: 3 }}>
                    <Tabs
                        value={tabIndex}
                        onChange={(e, newValue) => setTabIndex(newValue)}
                        sx={{
                            '& .MuiTab-root': {
                                color: 'rgba(255,255,255,0.4)',
                                fontWeight: 900,
                                letterSpacing: 1,
                                fontSize: '0.85rem',
                                '&.Mui-selected': {
                                    color: '#00f3ff'
                                }
                            },
                            '& .MuiTabs-indicator': {
                                backgroundColor: '#00f3ff',
                                height: 3
                            }
                        }}
                    >
                        <Tab label={`ACTIVE (${activeSessions.length})`} />
                        <Tab label={`PAST (${pastSessions.length})`} />
                    </Tabs>
                </Box>

                <TextField
                    fullWidth
                    placeholder="Search by session name..."
                    variant="outlined"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{
                        mb: 3,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 0,
                            bgcolor: 'rgba(255, 255, 255, 0.02)',
                            '& fieldset': { borderColor: 'rgba(0, 243, 255, 0.1)' },
                            '&:hover fieldset': { borderColor: 'rgba(0, 243, 255, 0.3)' },
                            '&.Mui-focused fieldset': { borderColor: '#00f3ff' },
                        },
                        '& .MuiInputBase-input': {
                            color: 'white',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            letterSpacing: 0.5
                        }
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: '#00f3ff', opacity: 0.5, fontSize: 20 }} />
                            </InputAdornment>
                        ),
                    }}
                />

                <Stack direction="row" spacing={2} alignItems="center">
                    <Chip
                        icon={<GpsIcon sx={{ fontSize: '14px !important', color: userLocation ? '#39ff14 !important' : '#ffff00 !important' }} />}
                        label={userLocation ? "Location Verified" : "Waiting for GPS"}
                        variant="outlined"
                        size="small"
                        sx={{
                            borderRadius: 0,
                            fontWeight: 900,
                            letterSpacing: 1,
                            fontSize: '0.65rem',
                            borderColor: userLocation ? 'rgba(57, 255, 20, 0.4)' : 'rgba(255, 255, 0, 0.4)',
                            color: userLocation ? '#39ff14' : '#ffff00',
                            bgcolor: userLocation ? 'rgba(57, 255, 20, 0.05)' : 'rgba(255, 255, 0, 0.05)'
                        }}
                    />
                    {isOffline && (
                        <Chip
                            label="OFFLINE MODE"
                            size="small"
                            sx={{
                                borderRadius: 0,
                                fontWeight: 900,
                                letterSpacing: 1,
                                fontSize: '0.65rem',
                                color: '#ff0055',
                                border: '1px solid #ff0055',
                                bgcolor: 'rgba(255, 0, 85, 0.1)'
                            }}
                        />
                    )}
                    {syncing && (
                        <CircularProgress size={12} thickness={6} sx={{ color: '#00f3ff' }} />
                    )}
                    <Typography variant="caption" sx={{ opacity: 0.4, fontWeight: 700 }}>{displaySessions.length} sessions</Typography>
                </Stack>
            </Box>

            {error && (
                <Alert
                    severity="error"
                    icon={<SecurityIcon sx={{ color: '#ff0055' }} />}
                    onClose={() => setError('')}
                    action={
                        <Button color="inherit" size="small" onClick={() => loadInitialData()} sx={{ fontWeight: 900, textDecoration: 'underline' }}>
                            RETRY
                        </Button>
                    }
                    sx={{
                        mb: 4,
                        borderRadius: 0,
                        bgcolor: 'rgba(255, 0, 85, 0.1)',
                        color: '#ff0055',
                        border: '1px solid #ff0055',
                        fontWeight: 700
                    }}
                >
                    {error}
                </Alert>
            )}

            <Grid container spacing={4}>
                <AnimatePresence>
                    {displaySessions.map((session, index) => {
                        const isAttended = attendedSessions.has(session.id);
                        const isTimeValid = isWithinTimeWindow(session.startTime, session.endTime);
                        const isOpen = session.isActive && isTimeValid;
                        const now = new Date();
                        const start = safeDate(session.startTime);
                        const request = pendingRequests[session.id];
                        const hasPendingRequest = request?.status === 'pending';

                        let statusText = "MARK ATTENDANCE";
                        let buttonDisabled = isAttended || !userLocation || !isOpen;

                        if (!isOpen) {
                            if (!session.isActive) statusText = "SESSION EXPIRED";
                            else if (start > now) statusText = "NOT STARTED";
                            else statusText = "SESSION ENDED";
                        } else if (hasPendingRequest) {
                            statusText = "PENDING APPROVAL";
                            buttonDisabled = true;
                        }
                        const sessionColor = session.adminColor || '#00f3ff';

                        return (
                            <Grid item xs={12} md={6} key={session.id}>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Box className="glass-card" sx={{ p: 4, borderRadius: 0, position: 'relative', overflow: 'hidden', border: `1px solid ${sessionColor}20` }}>
                                        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', bgcolor: isAttended ? '#39ff14' : (hasPendingRequest ? '#ffff00' : sessionColor) }} />

                                        {isAttended && (
                                            <Box sx={{ position: 'absolute', top: 0, right: 0, p: 2 }}>
                                                <CheckCircleIcon sx={{ fontSize: 28, color: '#39ff14', filter: 'drop-shadow(0 0 5px #39ff14)' }} />
                                            </Box>
                                        )}

                                        <Typography variant="h5" sx={{ fontWeight: 900, mb: 3, fontFamily: 'Outfit', color: 'white', letterSpacing: -0.5 }}>
                                            {session.name || 'Untitled Session'}
                                        </Typography>

                                        <Stack direction="row" spacing={4} sx={{ mb: 4 }}>
                                            <Box>
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                                    <TimerIcon sx={{ fontSize: 13, opacity: 0.5, color: sessionColor }} />
                                                    <Typography variant="caption" sx={{ fontWeight: 900, opacity: 0.4, letterSpacing: 1 }}>TIME REMAINING</Typography>
                                                </Stack>
                                                <Typography variant="body1" sx={{ color: sessionColor, fontWeight: 900, fontFamily: 'monospace' }}>
                                                    {session.endTime?.toDate ? getTimeRemaining(session.endTime.toDate()) : 'Indefinite'}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ width: '1px', height: 40, bgcolor: 'rgba(255,255,255,0.05)' }} />
                                            <Box>
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                                    <LocationIcon sx={{ fontSize: 13, opacity: 0.5, color: sessionColor }} />
                                                    <Typography variant="caption" sx={{ fontWeight: 900, opacity: 0.4, letterSpacing: 1 }}>RANGE RADIUS</Typography>
                                                </Stack>
                                                <Typography variant="body1" sx={{ fontWeight: 900, color: 'white', fontFamily: 'monospace' }}>
                                                    {session.radius}m
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mt: 1 }}>
                                                    Created by: <span style={{ color: sessionColor }}>{session.createdBy || 'Unknown'}</span>
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        <Button
                                            fullWidth
                                            variant={isAttended ? "outlined" : "contained"}
                                            size="large"
                                            onClick={() => handleCheckIn(session)}
                                            disabled={buttonDisabled}
                                            sx={{
                                                py: 2,
                                                borderRadius: 0,
                                                fontSize: '0.8rem',
                                                fontWeight: 900,
                                                letterSpacing: 2,
                                                bgcolor: isAttended ? 'transparent' : (hasPendingRequest ? 'rgba(255, 255, 0, 0.1)' : sessionColor),
                                                color: isAttended ? '#39ff14' : (hasPendingRequest ? '#ffff00' : '#000'),
                                                borderColor: isAttended ? '#39ff14' : (hasPendingRequest ? '#ffff00' : 'transparent'),
                                                '&:hover': {
                                                    bgcolor: isAttended ? 'rgba(57, 255, 20, 0.05)' : (hasPendingRequest ? 'rgba(255, 255, 0, 0.2)' : sessionColor),
                                                    filter: 'brightness(1.1)'
                                                }
                                            }}
                                        >
                                            {isAttended ? "ALREADY MARKED" : (userLocation ? statusText : "WAITING FOR GPS")}
                                        </Button>
                                    </Box>
                                </motion.div>
                            </Grid>
                        );
                    })}
                </AnimatePresence>
            </Grid>

            {displaySessions.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                    <Typography variant="h6" sx={{ opacity: 0.2, fontWeight: 900, letterSpacing: 4 }}>
                        {searchQuery ? 'NO MATCHING SESSIONS FOUND' : (tabIndex === 0 ? 'NO ACTIVE SESSIONS FOUND' : 'NO PAST SESSIONS FOUND')}
                    </Typography>
                </Box>
            )}

            <Modal
                open={codeModalOpen}
                onClose={() => setCodeModalOpen(false)}
                aria-labelledby="session-code-modal-title"
                aria-describedby="session-code-modal-description"
            >
                <Box sx={modalStyle}>
                    <Typography id="session-code-modal-title" variant="h6" component="h2" sx={{ color: '#00f3ff', fontWeight: 900, mb: 2 }}>
                        ENTER SECURITY CODE
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3 }}>
                        This session requires a unique security code provided by the administrator.
                    </Typography>
                    <TextField
                        fullWidth
                        label="6-Digit Code"
                        variant="outlined"
                        value={sessionCode}
                        onChange={(e) => setSessionCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                        onKeyPress={(e) => e.key === 'Enter' && handleCodeSubmit()}
                        autoFocus
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 0,
                                '& fieldset': { borderColor: 'rgba(0, 243, 255, 0.3)' },
                                '&:hover fieldset': { borderColor: '#00f3ff' },
                                '&.Mui-focused fieldset': { borderColor: '#00f3ff' },
                            },
                            '& input': { color: 'white', fontFamily: 'monospace', letterSpacing: 4, fontWeight: 900, textAlign: 'center' },
                            mb: 4
                        }}
                    />
                    <Stack direction="row" spacing={2}>
                        <Button
                            fullWidth
                            variant="text"
                            onClick={() => setCodeModalOpen(false)}
                            sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}
                        >
                            CANCEL
                        </Button>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleCodeSubmit}
                            disabled={sessionCode.length < 6}
                            sx={{ fontWeight: 900 }}
                        >
                            VERIFY
                        </Button>
                    </Stack>
                </Box>
            </Modal>

            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={() => setNotification({ open: false, message: '' })}
                message={notification.message}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                ContentProps={{ sx: { bgcolor: '#050505', color: '#00f3ff', border: '1px solid #00f3ff', borderRadius: 0, fontWeight: 900 } }}
            />
        </Box>
    );
};

export default ClientView;
