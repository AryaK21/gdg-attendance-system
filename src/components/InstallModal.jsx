import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    IconButton
} from '@mui/material';
import {
    Close as CloseIcon,
    IosShare as ShareIcon,
    AddBox as AddIcon,
    GetApp as InstallIcon
} from '@mui/icons-material';

const InstallModal = ({ open, onClose, isIOS, onInstall, hasDeferredPrompt }) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    bgcolor: '#0a0a0a',
                    border: '1px solid rgba(0, 243, 255, 0.2)',
                    borderRadius: 2,
                    maxWidth: 400
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#00f3ff' }}>
                Install ATLAS
                <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                {isIOS ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            To install this app on your iPhone or iPad:
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(255,255,255,0.05)', p: 2, borderRadius: 1 }}>
                            <ShareIcon sx={{ color: '#007AFF' }} />
                            <Typography variant="body2" sx={{ color: 'white' }}>
                                1. Tap the <strong>Share</strong> button in Safari's menu bar.
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(255,255,255,0.05)', p: 2, borderRadius: 1 }}>
                            <AddIcon sx={{ color: '#white' }} />
                            <Typography variant="body2" sx={{ color: 'white' }}>
                                2. Scroll down and tap <strong>Add to Home Screen</strong>.
                            </Typography>
                        </Box>
                    </Box>
                ) : hasDeferredPrompt ? (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 3 }}>
                            Install the ATLAS app for a better, offline-capable experience.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<InstallIcon />}
                            onClick={onInstall}
                            fullWidth
                            sx={{
                                bgcolor: '#00f3ff',
                                color: '#000',
                                fontWeight: 'bold',
                                '&:hover': { bgcolor: '#00c2cc' }
                            }}
                        >
                            INSTALL APP
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            To install this app:
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(255,255,255,0.05)', p: 2, borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ color: 'white' }}>
                                1. Tap the <strong>Menu</strong> button (three dots) in Chrome.
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(255,255,255,0.05)', p: 2, borderRadius: 1 }}>
                            <InstallIcon sx={{ color: '#white' }} />
                            <Typography variant="body2" sx={{ color: 'white' }}>
                                2. Tap <strong>Install App</strong> or <strong>Add to Home Screen</strong>.
                            </Typography>
                        </Box>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default InstallModal;
