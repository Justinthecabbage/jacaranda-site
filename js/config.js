// Jacaranda Music Club — configuration
// Fill in your Supabase project credentials from https://supabase.com/dashboard

function detectBasePath() {
    const p = window.location.pathname;
    if (p.includes('/pages/')) return p.split('/pages/')[0];
    return p.replace(/\/?index\.html$/, '').replace(/\/$/, '') || '';
}

window.JMC_BASE = detectBasePath();

window.JMC_CONFIG = {
    supabase: {
        url: 'YOUR_SUPABASE_URL',
        anonKey: 'YOUR_SUPABASE_ANON_KEY'
    },

    allowedEmailDomains: [],

    ai: {
        proxyUrl: '',
        welcomeMessage: 'Hi! I\'m the Jacaranda Music Club assistant.\n\nAsk me about joining the club, the Song Board, community posts, or how to sign up!'
    }
};

window.JMC_CONFIG.emailRedirectTo =
    window.location.origin + window.JMC_BASE + '/pages/login.html?verified=1';
