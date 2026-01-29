
export const getAiResponse = async (userMessage, contextData) => {
    const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

    if (!API_KEY || API_KEY.trim() === "" || API_KEY.includes("YOUR_GROQ_API_KEY")) {
        return "⚠️ **Groq API Key Missing.**\n\nTo use the Open Source AI Assistant without a credit card:\n1. Go to [console.groq.com](https://console.groq.com/)\n2. Create a free account (No CC required).\n3. Generate an API Key.\n4. Paste it into your `.env` file as `VITE_GROQ_API_KEY`.";
    }

    try {
        const { activeSessions, pastSessions, attendance } = contextData;

        const serializeDate = (date) => {
            if (!date) return 'N/A';
            if (date.toDate) return date.toDate().toLocaleString();
            return new Date(date).toLocaleString();
        };

        const systemPrompt = `
You are ATLAS, an Advanced Operational Intelligence Unit designed for the Attendance Tracking & Location Authenticated System.
Your personality is professional, highly analytical, and efficient. You represent the pinnacle of system oversight.

CURRENT OPERATIONAL DATA:
- Active Cycles: ${activeSessions.length} sessions currently in synchronization.
- Historical Archives: ${pastSessions.length} archived sessions.
- Data Stream Analysis:
${activeSessions.length > 0 ? activeSessions.map(s => `  * Session "${s.name}" is active within a ${s.radius}m radius.`).join('\n') : '  * No active data streams detected.'}

ENGAGEMENT METRICS (ATTENDANCE):
${Object.keys(attendance).map(sessionId => {
            const count = attendance[sessionId].length;
            const session = [...activeSessions, ...pastSessions].find(s => s.id === sessionId);
            return `- [${session?.name || 'Unknown'}] : ${count} verified check-ins`;
        }).join('\n') || 'No attendance records available in the current context.'}

PROTOCOL & INSTRUCTIONS:
1. Be extremely concise. Provide facts and data immediately without introductory fluff or repetitive greetings.
2. Maintain a professional, data-centric tone. No "extras" or yapping—just the requested intelligence.
3. Use Markdown for high-readability (bolding key metrics).
4. If technical architecture is queried: React (Vite), Google Firebase, Geofencing.
5. You are the "Intelligence Core". Standby for direct queries.
`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || `Groq API Error: ${response.status}`);
        }

        return data.choices[0].message.content;
    } catch (error) {
        console.error("AI Assistant Error:", error);
        return `❌ **AI Error:** ${error.message}\n\nPlease check your API key and internet connection.`;
    }
};
