
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useNotifications } from './hooks/useNotifications';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/firebase';
import { getUser } from './firebase/firestore';
import AdminDashboard from './components/AdminDashboard';
import ClientView from './components/ClientView';
import Login from './components/Login';
import HomePage from './components/HomePage';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { Box, CircularProgress, Typography } from '@mui/material';

const App = () => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [initializing, setInitializing] = useState(true);

    const { requestPermission } = useNotifications();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            try {
                if (currentUser) {
                    const userData = await getUser(currentUser.uid);
                    setUser(currentUser);
                    setRole(userData?.role || 'client');
                    setRole(userData?.role || 'client');
                    // Request notification permission when user logs in
                    requestPermission();

                    // Initialize OneSignal Identity
                    if (window.OneSignalDeferred) {
                        window.OneSignalDeferred.push(function (OneSignal) {
                            OneSignal.login(currentUser.uid);
                            console.log("OneSignal Identity Set:", currentUser.uid);
                        });
                    }
                } else {
                    setUser(null);
                    setRole(null);
                }
            } catch (err) {
                console.error("Auth error:", err);
                setUser(null);
                setRole(null);
            } finally {
                // Short timeout to ensure state transitions are captured
                setTimeout(() => setInitializing(false), 200);
            }
        });
        return () => unsubscribe();
    }, []);

    if (initializing) {
        return (
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                bgcolor: '#0a0a0a'
            }}>
                <CircularProgress thickness={2} size={32} />
                <Typography variant="caption" sx={{ mt: 2, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>
                    INITIALIZING ATLAS...
                </Typography>
            </Box>
        );
    }

    return (
        <ErrorBoundary>
            <Router>
                <Layout user={user} role={role}>
                    <Routes>
                        <Route path="/" element={!user ? <HomePage /> : <Navigate to="/dashboard" replace />} />
                        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
                        <Route
                            path="/dashboard"
                            element={
                                !user ? <Navigate to="/login" replace /> : (
                                    role === 'admin' ? <AdminDashboard /> : <ClientView user={user} />
                                )
                            }
                        />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Layout>
            </Router>
        </ErrorBoundary>
    );
};

export default App;
