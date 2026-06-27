const CLUB_FAQ = [
    {
        keywords: ['join', 'qq', 'group', 'sign up', 'member'],
        answer: 'Welcome to Jacaranda Music Club!\n\n1. Join our QQ group: 824329430\n2. Create an account on this site (student or teacher)\n3. Vote on the Song Board for next month\'s dismissal music\n\nAll music lovers are welcome!'
    },
    {
        keywords: ['founded', 'when', '2025', 'established'],
        answer: 'Jacaranda Music Club was founded on November 13, 2025, under the Sino-US Curriculum Program of Hefei No.1 High School.'
    },
    {
        keywords: ['song', 'board', 'vote', 'dismissal', 'bell', 'music'],
        answer: 'Our school plays one song at dismissal each day — but only one song per semester!\n\nVisit the Song Board to request songs and vote (♥) for your favorites. Each month, club leadership picks the top 2 most-voted approved songs as the new dismissal playlist.'
    },
    {
        keywords: ['post', 'community', 'forum'],
        answer: 'After logging in, visit Community to share posts and talk with other members about music, events, and more.'
    },
    {
        keywords: ['register', 'login', 'account', 'email', 'student', 'teacher'],
        answer: 'Click Sign Up and choose Student or Teacher registration.\n\nStudents need a 4-digit ID (starting with 2 or 3) plus email verification.\nTeachers register with their legal name.\n\nVerify your email before logging in.'
    },
    {
        keywords: ['jacaranda', 'name', 'meaning', 'purple'],
        answer: 'Jacaranda is named after the jacaranda tree, symbolizing youth, elegance, dreams, and growth. The purple-blue blooms represent our passion for music.'
    },
    {
        keywords: ['hello', 'hi', 'hey'],
        answer: 'Hello! I\'m the Jacaranda Music Club assistant. Ask me anything about the club, Song Board, or how to get involved!'
    }
];

function matchFAQ(input) {
    const lower = input.toLowerCase();
    for (const item of CLUB_FAQ) {
        if (item.keywords.some(kw => lower.includes(kw.toLowerCase()))) {
            return item.answer;
        }
    }
    return null;
}

async function askAI(message) {
    const proxyUrl = window.JMC_CONFIG?.ai?.proxyUrl;
    if (!proxyUrl) return null;

    try {
        const res = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.reply || data.message || null;
    } catch {
        return null;
    }
}

function createWidget() {
    const widget = document.createElement('div');
    widget.className = 'agent-widget';
    widget.innerHTML = `
        <div class="agent-panel" id="agent-panel">
            <div class="agent-header">
                <h3>Jacaranda Assistant</h3>
                <button class="agent-close" id="agent-close" aria-label="Close">&times;</button>
            </div>
            <div class="agent-messages" id="agent-messages"></div>
            <div class="agent-typing" id="agent-typing" style="display:none">Typing…</div>
            <div class="agent-input-area">
                <input type="text" id="agent-input" placeholder="Ask about the club…" maxlength="500">
                <button id="agent-send">Send</button>
            </div>
        </div>
        <button class="agent-toggle" id="agent-toggle" aria-label="Open assistant">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
        </button>`;
    document.body.appendChild(widget);

    const panel = document.getElementById('agent-panel');
    const toggle = document.getElementById('agent-toggle');
    const closeBtn = document.getElementById('agent-close');
    const messagesEl = document.getElementById('agent-messages');
    const input = document.getElementById('agent-input');
    const sendBtn = document.getElementById('agent-send');
    const typingEl = document.getElementById('agent-typing');

    let opened = false;

    function addMessage(text, role) {
        const div = document.createElement('div');
        div.className = `agent-msg ${role}`;
        div.innerHTML = `<div class="agent-bubble">${escapeHtml(text)}</div>`;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function openPanel() {
        panel.classList.add('open');
        if (!opened) {
            opened = true;
            addMessage(window.JMC_CONFIG?.ai?.welcomeMessage ||
                'Hi! I\'m the Jacaranda Music Club assistant. How can I help?', 'bot');
        }
        input.focus();
    }

    toggle.addEventListener('click', () => {
        panel.classList.toggle('open');
        if (panel.classList.contains('open') && !opened) openPanel();
    });
    closeBtn.addEventListener('click', () => panel.classList.remove('open'));

    async function handleSend() {
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        addMessage(text, 'user');
        typingEl.style.display = 'block';

        let reply = matchFAQ(text);
        if (!reply) reply = await askAI(text);
        if (!reply) {
            reply = 'I\'m not sure about that one.\n\nTry:\n• QQ group 824329430\n• The Song Board or Community pages\n• Sign Up to create an account';
        }

        await new Promise(r => setTimeout(r, 400));
        typingEl.style.display = 'none';
        addMessage(reply, 'bot');
    }

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSend();
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function initAgentWidget() {
    if (document.getElementById('agent-panel')) return;
    createWidget();
}

initAgentWidget();
