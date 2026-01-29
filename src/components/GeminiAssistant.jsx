
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Chip,
  Avatar,
  Stack,
  CircularProgress,
  IconButton,
  Divider
} from '@mui/material';
import {
  AutoAwesome as SparklesIcon,
  Send as SendIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  DeleteOutline as ClearIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { getAiResponse } from '../utils/aiAssistant';
import ReactMarkdown from 'react-markdown';

const GeminiAssistant = ({ activeSessions, pastSessions, attendance }) => {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      content: "System online. I am ATLAS, your Operational Intelligence Unit. I have analyzed current session cycles and attendance metrics. How can I assist your operations today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
    setLoading(true);

    const context = { activeSessions, pastSessions, attendance };
    const response = await getAiResponse(userMsg, context);

    setMessages(prev => [...prev, { role: 'bot', content: response, timestamp: new Date() }]);
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([{
      role: 'bot',
      content: "Chat cleared. What else can I help you with?",
      timestamp: new Date()
    }]);
  };

  return (
    <Box sx={{ height: '550px', display: 'flex', flexDirection: 'column', p: 1 }}>
      {/* Header Info */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SparklesIcon sx={{ color: '#00f3ff', fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#00f3ff', letterSpacing: 1 }}>ATLAS INTELLIGENCE CORE</Typography>
        </Box>
        <IconButton size="small" onClick={clearChat} sx={{ color: 'rgba(255,255,255,0.3)' }} title="Clear Chat">
          <ClearIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Messages Window */}
      <Paper
        className="glass-effect"
        sx={{
          flexGrow: 1,
          mb: 2,
          p: 3,
          overflowY: 'auto',
          bgcolor: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(0, 243, 255, 0.1)',
          borderRadius: 0,
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0, 243, 255, 0.2)' }
        }}
      >
        <Stack spacing={3}>
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: 2,
                  alignItems: 'flex-start'
                }}>
                  <Avatar sx={{
                    bgcolor: msg.role === 'user' ? '#ff00ff' : '#00f3ff',
                    width: 32,
                    height: 32,
                    boxShadow: `0 0 10px ${msg.role === 'user' ? 'rgba(255,0,255,0.3)' : 'rgba(0,243,255,0.3)'}`
                  }}>
                    {msg.role === 'user' ? <PersonIcon fontSize="small" /> : <BotIcon fontSize="small" />}
                  </Avatar>

                  <Box sx={{
                    maxWidth: '80%',
                    p: 2,
                    bgcolor: msg.role === 'user' ? 'rgba(255, 0, 255, 0.05)' : 'rgba(0, 243, 255, 0.05)',
                    border: `1px solid ${msg.role === 'user' ? 'rgba(255, 0, 255, 0.1)' : 'rgba(0, 243, 255, 0.1)'}`,
                    borderRadius: msg.role === 'user' ? '12px 0 12px 12px' : '0 12px 12px 12px',
                    '& .markdown-content': {
                      color: 'white',
                      fontSize: '0.85rem',
                      lineHeight: 1.6,
                      '& p': { m: 0 },
                      '& strong': { color: '#00f3ff', fontWeight: 900 },
                      '& ul, & ol': { pl: 2, mt: 1, mb: 1 },
                      '& li': { mb: 0.5 },
                      '& hr': { border: 'none', borderTop: '1px solid rgba(0, 243, 255, 0.2)', my: 2 }
                    }
                  }}>
                    <Box className="markdown-content">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.3, textAlign: msg.role === 'user' ? 'right' : 'left', fontSize: '0.6rem' }}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: '#00f3ff', width: 32, height: 32, opacity: 0.5 }}><BotIcon fontSize="small" /></Avatar>
              <CircularProgress size={16} thickness={4} sx={{ color: '#00f3ff' }} />
              <Typography variant="caption" sx={{ color: '#00f3ff', opacity: 0.5, fontWeight: 700 }}>AI IS THINKING...</Typography>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Stack>
      </Paper>

      {/* Input Area */}
      <Box
        component="form"
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        sx={{
          display: 'flex',
          gap: 1,
          bgcolor: 'rgba(255,255,255,0.02)',
          p: 1,
          border: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Ask ATLAS AI anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 0,
              color: 'white',
              fontSize: '0.85rem',
              '& fieldset': { border: 'none' },
            }
          }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!input.trim() || loading}
          sx={{
            minWidth: 50,
            width: 50,
            height: 40,
            borderRadius: 0,
            p: 0,
            bgcolor: '#00f3ff',
            '&:hover': { bgcolor: '#00c3ff' }
          }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon sx={{ color: '#050505' }} />}
        </Button>
      </Box>
    </Box>
  );
};

export default GeminiAssistant;
