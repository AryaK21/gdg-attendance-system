
import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Container maxWidth="sm" sx={{ mt: 10, textAlign: 'center' }}>
                    <Box className="glass-effect" sx={{ p: 6, borderRadius: 8 }}>
                        <Typography variant="h4" gutterBottom sx={{ fontWeight: 800, color: 'error.main' }}>
                            Something went wrong
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 4, opacity: 0.7 }}>
                            An unexpected error occurred in the application interface.
                        </Typography>
                        <Box sx={{
                            p: 2,
                            bgcolor: 'rgba(0,0,0,0.3)',
                            borderRadius: 2,
                            mb: 4,
                            textAlign: 'left',
                            overflow: 'auto',
                            maxHeight: 200
                        }}>
                            <Typography variant="caption" component="pre" sx={{ color: 'error.light', fontFamily: 'monospace' }}>
                                {this.state.error?.toString()}
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            onClick={() => window.location.reload()}
                            fullWidth
                        >
                            Reload Application
                        </Button>
                    </Box>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
