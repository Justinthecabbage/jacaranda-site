function detectBasePath() {
    const p = window.location.pathname;
    if (p.includes('/pages/')) return p.split('/pages/')[0];
    return p.replace(/\/?index\.html$/, '').replace(/\/$/, '') || '';
}

window.JMC_BASE = detectBasePath();

window.JMC_CONFIG = {
    supabase: {
        url: "https://drmrzplznhhwrpskucem.supabase.co",
        anonKey: "sb_publishable_MVMLcIZq1cu6u1TswSpWcg_BLs_dDdG"
    },

    allowedEmailDomains: [],

    ai: {
        proxyUrl: '',
        welcomeMessage: "Hi! I'm the Jacaranda Music Club assistant.\n\nAsk me about joining the club, the Song Board, community posts, or how to sign up!"
    }
};

window.JMC_CONFIG.emailRedirectTo =
    window.location.origin + window.JMC_BASE + '/pages/login.html?verified=1';
