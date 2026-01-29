
import { createTheme } from '@mui/material/styles';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00f3ff', // Cyber Cyan
    },
    secondary: {
      main: '#ff00ff', // Neon Pink
    },
    error: {
      main: '#ff0055', // Red-Pink
    },
    warning: {
      main: '#ffff00', // Warning Yellow
    },
    success: {
      main: '#39ff14', // Acid Green
    },
    background: {
      default: '#050505', // Deep Obsidian
      paper: '#0a0a0a',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 800,
    },
    h3: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 700,
    },
    h4: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 700,
    },
    h5: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 700,
    },
    h6: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 700,
    },
    button: {
      textTransform: 'uppercase',
      fontWeight: 800,
      fontFamily: '"Outfit", sans-serif',
      letterSpacing: '0.1em',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          padding: '10px 28px',
          transition: 'all 0.2s ease-in-out',
          border: '1px solid transparent',
          '&:hover': {
            transform: 'scale(1.02)',
            boxShadow: '0 0 15px rgba(0, 243, 255, 0.4)',
            borderColor: '#00f3ff',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #00f3ff, #ff00ff)',
          color: '#000',
          '&:hover': {
            background: 'linear-gradient(45deg, #00d8e4, #e600e6)',
          },
        },
        outlinedPrimary: {
          borderColor: '#00f3ff',
          color: '#00f3ff',
          '&:hover': {
            backgroundColor: 'rgba(0, 243, 255, 0.05)',
            borderColor: '#00f3ff',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(10, 10, 10, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 243, 255, 0.1)',
          borderRadius: 4,
          backgroundImage: 'none',
          '&:hover': {
            borderColor: 'rgba(0, 243, 255, 0.3)',
            boxShadow: '0 0 20px rgba(0, 243, 255, 0.1)',
          }
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(5, 5, 5, 0.9)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0, 243, 255, 0.2)',
          boxShadow: '0 0 20px rgba(0, 243, 255, 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            '& fieldset': {
              borderColor: 'rgba(0, 243, 255, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 243, 255, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00f3ff',
              boxShadow: '0 0 10px rgba(0, 243, 255, 0.2)',
            },
          },
        },
      },
    },
  },
});

export default darkTheme;
