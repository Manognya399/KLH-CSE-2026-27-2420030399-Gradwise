import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './AIAssistant.css';
function cleanAIResponse(text) {
    return text
        // Convert escaped Markdown symbols into normal Markdown
        .replace(/\\([#*_`[\]()!>-])/g, '$1')
        // Convert HTML non-breaking spaces into normal spaces
        .replace(/&#x20;/gi, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&#160;/gi, ' ')
        // Remove zero-width and unnecessary invisible characters
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        // Remove trailing spaces from each line
        .replace(/[ \t]+$/gm, '')
        // Normalize excessive blank lines
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
function AIAssistant() {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hi! 👋 I am your GradWise AI assistant. Ask me anything about your B.Tech subjects!'
        }
    ]);
    const [loading, setLoading] = useState(false);

    const handleSend = async (event) => {
        event.preventDefault();

        const question = message.trim();

        if (!question || loading) return;

        const token = sessionStorage.getItem('gradwiseToken');

        if (!token) {
            setMessages((previous) => [
                ...previous,
                {
                    role: 'assistant',
                    content: 'Please log in again to use the AI assistant.'
                }
            ]);
            return;
        }

        setMessages((previous) => [
            ...previous,
            { role: 'user', content: question }
        ]);

        setMessage('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:5000/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ message: question })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to get an AI response.');
            }

            setMessages((previous) => [
                ...previous,
                { role: 'assistant', content: data.answer }
            ]);
        } catch (error) {
            setMessages((previous) => [
                ...previous,
                {
                    role: 'assistant',
                    content: error.message || 'Something went wrong. Please try again.'
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="ai-assistant">
            <div className="ai-header">
                <div>
                    <h2>GradWise AI Assistant</h2>
                    <p>Your personal learning companion</p>
                </div>
                <span className="ai-status">● AI Ready</span>
            </div>

            <div className="ai-messages" aria-live="polite">
                {messages.map((item, index) => (
                    <div
                        key={index}
                        className={`ai-message ${item.role === 'user' ? 'user-message' : 'assistant-message'}`}
                    >
                        <strong>{item.role === 'user' ? 'You' : 'GradWise AI'}</strong>
                        <div className="ai-message-content">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {cleanAIResponse(item.content)}
    </ReactMarkdown>
</div>
                    </div>
                ))}

                {loading && (
                    <div className="ai-message assistant-message">
                        <strong>GradWise AI</strong>
                        <p>Thinking... Please wait ⏳</p>
                    </div>
                )}
            </div>

            <form className="ai-input-form" onSubmit={handleSend}>
                <input
                    type="text"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Ask a question about your studies..."
                    maxLength={2000}
                    disabled={loading}
                    aria-label="Ask GradWise AI a question"
                />

                <button type="submit" disabled={loading || !message.trim()}>
                    {loading ? 'Wait...' : 'Ask AI'}
                </button>
            </form>
        </section>
    );
}

export default AIAssistant;