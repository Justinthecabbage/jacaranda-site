import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';

const config = window.JMC_CONFIG?.supabase || {};

let supabase = null;

export function getSupabase() {
    if (supabase) return supabase;

    if (!config.url || config.url === 'YOUR_SUPABASE_URL' ||
        !config.anonKey || config.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
        return null;
    }

    supabase = createClient(config.url, config.anonKey);
    return supabase;
}

export function isConfigured() {
    return getSupabase() !== null;
}

export function showConfigWarning(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
        <div class="alert alert-warning">
            <strong>Backend not configured</strong><br>
            Add your Supabase URL and anon key in <code>js/config.js</code>,
            then run <code>supabase/schema.sql</code> in the Supabase SQL Editor.
            See README.md for details.
        </div>`;
}
