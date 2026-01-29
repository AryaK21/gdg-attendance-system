import React, { useState, useEffect, useRef } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { setUserRole, getUser } from '../firebase/firestore';
import { Box, Button, TextField, Typography, Container, Alert, Divider, Paper, IconButton, Stack } from '@mui/material';
import { Google as GoogleIcon, LockOutlined as LockIcon, Close as CloseIcon } from '@mui/icons-material';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import anime from 'animejs';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const auraX = useSpring(mouseX, { stiffness: 50, damping: 30 });
    const auraY = useSpring(mouseY, { stiffness: 50, damping: 30 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };
        window.addEventListener('mousemove', handleMouseMove);

        // Background particles loop
        anime({
            targets: '.bg-particle',
            translateY: ['-100vh', '100vh'],
            opacity: [0, 0.2, 0],
            duration: () => anime.random(5000, 10000),
            delay: () => anime.random(0, 5000),
            loop: true,
            easing: 'linear'
        });

        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Hardcoded admin login for development/testing
            if (email === 'admin' && password === 'admin') {
                const adminFirebaseEmail = 'admin@example.com'; // Use your actual admin Firebase email
                const adminFirebasePassword = 'admin_password_123'; // Use your actual admin Firebase password
                const userCredential = await signInWithEmailAndPassword(auth, adminFirebaseEmail, adminFirebasePassword);
                await setUserRole(userCredential.user.uid, 'admin');
                setLoading(false);
                return; // Exit function after handling admin login
            }

            if (isSignUp) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setUserRole(userCredential.user.uid, 'client', displayName);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(err.message.replace('Firebase:', ''));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const userDoc = await getUser(user.uid);
            if (!userDoc) {
                await setUserRole(user.uid, 'client', user.displayName);
            }
        } catch (err) {
            setError(err.message.replace('Firebase:', ''));
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', bg: '#050505' }}>
            <div className="noise-overlay" />

            {/* Background Aura */}
            <motion.div
                className="fixed w-[800px] h-[800px] pointer-events-none z-0 opacity-40 hidden md:block"
                style={{
                    x: auraX,
                    y: auraY,
                    left: -400,
                    top: -400,
                    background: 'radial-gradient(circle, rgba(0, 243, 255, 0.1) 0%, transparent 70%)',
                    filter: 'blur(100px)'
                }}
            />

            {/* Background Particles */}
            {[...Array(15)].map((_, i) => (
                <div
                    key={i}
                    className="bg-particle absolute w-[1px] h-20 bg-cyan-400/20 top-0 pointer-events-none"
                    style={{ left: `${Math.random() * 100}%` }}
                />
            ))}

            <Container maxWidth="xs" sx={{ py: 10, position: 'relative', zIndex: 10 }}>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                    <Paper className="glass-card" sx={{
                        p: 5,
                        borderRadius: 0,
                        bgcolor: 'rgba(5, 5, 5, 0.8)',
                        border: '1px solid rgba(0, 243, 255, 0.1)',
                        boxShadow: '0 0 50px rgba(0, 243, 255, 0.1)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'linear-gradient(90deg, #00f3ff, #ff00ff, #00f3ff)', backgroundSize: '200% 100%' }} />

                        <Box sx={{ textAlign: 'center', mb: 4 }}>
                            <motion.div
                                animate={{ rotate: [0, -10, 10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                <LockIcon sx={{ color: '#00f3ff', fontSize: 40, mb: 1, filter: 'drop-shadow(0 0 10px #00f3ff)' }} />
                            </motion.div>
                            <Typography variant="h4" sx={{ mb: 1, fontWeight: 900, fontFamily: 'Outfit', color: 'white', letterSpacing: -1 }}>
                                {isSignUp ? 'CREATE ACCOUNT' : 'LOGIN'}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.4, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>
                                Secure Access Portal // ATLAS
                            </Typography>
                        </Box>

                        {error && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                                <Alert severity="error" sx={{ mb: 3, borderRadius: 0, bgcolor: 'rgba(255, 0, 85, 0.1)', color: '#ff0055', border: '1px solid #ff0055' }}>{error}</Alert>
                            </motion.div>
                        )}

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isSignUp ? 'signup' : 'login'}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Box component="form" onSubmit={handleAuth}>
                                    <Stack spacing={3}>
                                        <TextField
                                            fullWidth
                                            label="Email Address"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            variant="outlined"
                                        />
                                        {isSignUp && (
                                            <TextField
                                                fullWidth
                                                label="Full Name"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                required
                                            />
                                        )}
                                        <TextField
                                            fullWidth
                                            type="password"
                                            label="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            type="submit"
                                            disabled={loading}
                                            sx={{
                                                height: 54,
                                                fontWeight: 900,
                                                borderRadius: 0,
                                                bgcolor: '#00f3ff',
                                                color: '#000',
                                                '&:hover': { bgcolor: '#00f3ff', filter: 'brightness(1.1)' }
                                            }}
                                        >
                                            {loading ? 'AUTHENTICATING...' : (isSignUp ? 'SIGN UP' : 'SIGN IN')}
                                        </Button>
                                    </Stack>
                                </Box>
                            </motion.div>
                        </AnimatePresence>

                        <Divider sx={{ my: 4, '&::before, &::after': { borderColor: 'rgba(255, 255, 255, 0.1)' } }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>OR</Typography>
                        </Divider>

                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<GoogleIcon />}
                            onClick={handleGoogleSignIn}
                            sx={{
                                height: 50,
                                borderRadius: 0,
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                '&:hover': { borderColor: '#00f3ff', color: '#00f3ff' }
                            }}
                        >
                            SIGN IN WITH GOOGLE
                        </Button>

                        <Button
                            fullWidth
                            variant="text"
                            onClick={() => setIsSignUp(!isSignUp)}
                            sx={{
                                mt: 3,
                                textTransform: 'none',
                                color: isSignUp ? '#00f3ff' : '#ff00ff',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                '&:hover': { bgcolor: 'transparent', opacity: 0.8 }
                            }}
                        >
                            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                        </Button>
                    </Paper>
                </motion.div>
                <Typography variant="caption" sx={{ display: 'block', mt: 4, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: 1 }}>
                    PROTECTED BY ATLAS // TEAM ALGOFORGE
                </Typography>
            </Container>
        </Box>
    );
};

export default Login;