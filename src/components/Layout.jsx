
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    AppBar,
    Toolbar,
    Typography,
    Button,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Avatar,
    useMediaQuery,
    useTheme
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    ExitToApp as LogoutIcon,
    Login as LoginIcon,
    Home as HomeIcon,
    LocationCity as LocationIcon,
    GetApp as InstallIcon
} from '@mui/icons-material';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import useInstallPrompt from '../hooks/useInstallPrompt';
import InstallModal from './InstallModal';

const Layout = ({ children, user, role }) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { deferredPrompt, isIOS, isStandalone, promptToInstall } = useInstallPrompt();
    const [installModalOpen, setInstallModalOpen] = useState(false);
    // Show button if not standalone (native app), regardless of deferredPrompt (we'll show manual instructions if needed)
    const showInstallButton = !isStandalone;

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error("Logout error", error);
        }
    };

    const navItems = user ? [
        { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon sx={{ color: '#00f3ff' }} /> },
    ] : [
        { text: 'Home', path: '/', icon: <HomeIcon sx={{ color: '#00f3ff' }} /> },
        { text: 'Login', path: '/login', icon: <LoginIcon sx={{ color: '#ff00ff' }} /> },
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#050505' }}>
            <AppBar position="sticky" elevation={0} sx={{ borderBottom: '1px solid rgba(0, 243, 255, 0.2)' }}>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={() => setDrawerOpen(true)}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon sx={{ color: '#00f3ff' }} />
                    </IconButton>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }}>
                        <LocationIcon sx={{ color: '#00f3ff', fontSize: 28 }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography
                                variant="h6"
                                component={Link}
                                to="/"
                                sx={{
                                    textDecoration: 'none',
                                    color: '#00f3ff',
                                    fontWeight: 900,
                                    fontFamily: 'Outfit',
                                    letterSpacing: -0.5,
                                    lineHeight: 1,
                                    textShadow: '0 0 10px rgba(0, 243, 255, 0.5)'
                                }}
                            >
                                ATLAS
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: 0.5 }}>
                                Attendance Tracking & Location Authenticated System
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 2 }}>
                        {navItems.map((item) => (
                            <Button
                                key={item.path}
                                component={Link}
                                to={item.path}
                                color="inherit"
                                sx={{
                                    color: location.pathname === item.path ? '#00f3ff' : 'rgba(255,255,255,0.6)',
                                    fontWeight: 800,
                                    letterSpacing: 1,
                                    fontSize: '0.75rem',
                                    borderBottom: location.pathname === item.path ? '2px solid #00f3ff' : '2px solid transparent',
                                    borderRadius: 0,
                                    '&:hover': {
                                        color: '#00f3ff',
                                        bgcolor: 'rgba(0, 243, 255, 0.05)'
                                    }
                                }}
                            >
                                {item.text}
                            </Button>
                        ))}
                        {user && (
                            <Button
                                onClick={handleLogout}
                                sx={{
                                    color: '#ff00ff',
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    '&:hover': { bgcolor: 'rgba(255, 0, 255, 0.05)' }
                                }}
                            >
                                LOGOUT
                            </Button>
                        )}
                    </Box>
                    {user && (
                        <Avatar sx={{
                            ml: 2,
                            width: 32,
                            height: 32,
                            bgcolor: '#ff00ff',
                            fontSize: '0.8rem',
                            boxShadow: '0 0 10px rgba(255, 0, 255, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                            {user.email?.charAt(0).toUpperCase()}
                        </Avatar>
                    )}
                </Toolbar>
            </AppBar>

            <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                PaperProps={{
                    sx: { bgcolor: '#050505', borderRight: '1px solid rgba(0, 243, 255, 0.2)', width: 280 }
                }}
            >
                <Box sx={{ p: 4 }}>
                    <Typography variant="h5" sx={{ color: '#00f3ff', fontWeight: 900, mb: 4, fontFamily: 'Outfit' }}>
                        ATLAS_
                    </Typography>
                    <List>
                        {navItems.map((item) => (
                            <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                                <ListItemButton
                                    component={Link}
                                    to={item.path}
                                    onClick={() => setDrawerOpen(false)}
                                    sx={{
                                        borderRadius: 1,
                                        bgcolor: location.pathname === item.path ? 'rgba(0, 243, 255, 0.05)' : 'transparent',
                                        border: location.pathname === item.path ? '1px solid rgba(0, 243, 255, 0.2)' : '1px solid transparent'
                                    }}
                                >
                                    <ListItemIcon>{item.icon}</ListItemIcon>
                                    <ListItemText
                                        primary={item.text}
                                        primaryTypographyProps={{
                                            fontWeight: 700,
                                            color: location.pathname === item.path ? '#00f3ff' : 'white',
                                            letterSpacing: 1
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                        {showInstallButton && (
                            <ListItem disablePadding sx={{ mb: 1, mt: 2, borderTop: '1px solid rgba(255,255,255,0.1)', pt: 2 }}>
                                <ListItemButton
                                    onClick={() => {
                                        setDrawerOpen(false);
                                        setInstallModalOpen(true);
                                    }}
                                    sx={{
                                        borderRadius: 1,
                                        bgcolor: 'rgba(0, 243, 255, 0.1)',
                                        border: '1px solid rgba(0, 243, 255, 0.3)'
                                    }}
                                >
                                    <ListItemIcon><InstallIcon sx={{ color: '#00f3ff' }} /></ListItemIcon>
                                    <ListItemText
                                        primary="INSTALL APP"
                                        primaryTypographyProps={{
                                            fontWeight: 900,
                                            color: '#00f3ff',
                                            letterSpacing: 1
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        )}
                    </List>
                </Box>
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {children}
            </Box>

            <Box sx={{
                p: 3,
                textAlign: 'center',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                bgcolor: '#050505'
            }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700 }}>
                    POWERED BY <span style={{ color: '#ff00ff' }}>TEAM ALGOFORGE</span> // 2026.1
                </Typography>
            </Box>

            <InstallModal
                open={installModalOpen}
                onClose={() => setInstallModalOpen(false)}
                isIOS={isIOS}
                onInstall={async () => {
                    const installed = await promptToInstall();
                    if (installed) setInstallModalOpen(false);
                }}
                hasDeferredPrompt={!!deferredPrompt}
            />
        </Box>
    );
};

export default Layout;
