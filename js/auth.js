import { getSupabase, isConfigured, showConfigWarning } from './supabase-client.js';

const config = window.JMC_CONFIG || {};

function getDisplayName(user) {
    return user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Member';
}

function validateEmail(email) {
    const domains = config.allowedEmailDomains || [];
    if (domains.length === 0) return null;

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain || !domains.some(d => domain === d.toLowerCase())) {
        return `Please use one of these email domains: ${domains.join(', ')}`;
    }
    return null;
}

function validateStudentId(studentId) {
    if (!/^\d{4}$/.test(studentId)) {
        return 'Student ID must be exactly 4 digits.';
    }
    if (studentId[0] !== '2' && studentId[0] !== '3') {
        return 'Student ID must start with 2 or 3.';
    }
    return null;
}

function validateRealName(name) {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
        return 'Please enter your full legal name (at least 2 characters).';
    }
    if (!/^[\u4e00-\u9fffA-Za-z\s'.-]+$/.test(trimmed)) {
        return 'Legal name may only contain letters, spaces, hyphens, and apostrophes.';
    }
    if (!/[\u4e00-\u9fffA-Za-z]/.test(trimmed)) {
        return 'Please enter your real name, not numbers or symbols alone.';
    }
    return null;
}

export async function initNavAuth() {
    const userEl = document.getElementById('nav-user');
    const loginEl = document.getElementById('nav-login');
    const registerEl = document.getElementById('nav-register');
    const logoutEl = document.getElementById('nav-logout');

    if (!userEl) return;

    if (!isConfigured()) {
        userEl.textContent = '';
        return;
    }

    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();

    function render(session) {
        if (session?.user) {
            userEl.textContent = getDisplayName(session.user);
            if (loginEl) loginEl.style.display = 'none';
            if (registerEl) registerEl.style.display = 'none';
            if (logoutEl) logoutEl.style.display = 'inline-block';
        } else {
            userEl.textContent = '';
            if (loginEl) loginEl.style.display = 'inline-block';
            if (registerEl) registerEl.style.display = 'inline-block';
            if (logoutEl) logoutEl.style.display = 'none';
        }
    }

    render(session);
    sb.auth.onAuthStateChange((_event, session) => render(session));

    logoutEl?.addEventListener('click', async (e) => {
        e.preventDefault();
        await sb.auth.signOut();
        window.location.href = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
    });
}

export async function initRegisterHubPage() {
    // Static page — no JS needed beyond agent widget
}

export async function initStudentRegisterPage() {
    const form = document.getElementById('register-form');
    const alertBox = document.getElementById('alert-box');

    if (!isConfigured()) {
        showConfigWarning('alert-box');
        form?.querySelector('button')?.setAttribute('disabled', 'true');
        return;
    }

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.innerHTML = '';

        const displayName = document.getElementById('display-name').value.trim();
        const studentId = document.getElementById('student-id').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirm-password').value;
        const btn = form.querySelector('button[type="submit"]');

        if (!displayName || !studentId || !email || !password) {
            alertBox.innerHTML = '<div class="alert alert-error">Please fill in all required fields.</div>';
            return;
        }

        const idError = validateStudentId(studentId);
        if (idError) {
            alertBox.innerHTML = `<div class="alert alert-error">${idError}</div>`;
            return;
        }
        if (password.length < 6) {
            alertBox.innerHTML = '<div class="alert alert-error">Password must be at least 6 characters.</div>';
            return;
        }
        if (password !== confirm) {
            alertBox.innerHTML = '<div class="alert alert-error">Passwords do not match.</div>';
            return;
        }

        const domainError = validateEmail(email);
        if (domainError) {
            alertBox.innerHTML = `<div class="alert alert-error">${domainError}</div>`;
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Creating account…';

        const sb = getSupabase();
        const { error } = await sb.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: config.emailRedirectTo,
                data: {
                    display_name: displayName,
                    role: 'student',
                    student_id: studentId
                }
            }
        });

        btn.disabled = false;
        btn.textContent = 'Create Student Account';

        if (error) {
            alertBox.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
            return;
        }

        alertBox.innerHTML = `
            <div class="alert alert-success">
                Account created! Check your email and click the verification link before logging in.
            </div>`;
        form.reset();
    });
}

export async function initTeacherRegisterPage() {
    const form = document.getElementById('register-form');
    const alertBox = document.getElementById('alert-box');

    if (!isConfigured()) {
        showConfigWarning('alert-box');
        form?.querySelector('button')?.setAttribute('disabled', 'true');
        return;
    }

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.innerHTML = '';

        const legalName = document.getElementById('legal-name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirm-password').value;
        const btn = form.querySelector('button[type="submit"]');

        if (!legalName || !email || !password) {
            alertBox.innerHTML = '<div class="alert alert-error">Please fill in all required fields.</div>';
            return;
        }

        const nameError = validateRealName(legalName);
        if (nameError) {
            alertBox.innerHTML = `<div class="alert alert-error">${nameError}</div>`;
            return;
        }
        if (password.length < 6) {
            alertBox.innerHTML = '<div class="alert alert-error">Password must be at least 6 characters.</div>';
            return;
        }
        if (password !== confirm) {
            alertBox.innerHTML = '<div class="alert alert-error">Passwords do not match.</div>';
            return;
        }

        const domainError = validateEmail(email);
        if (domainError) {
            alertBox.innerHTML = `<div class="alert alert-error">${domainError}</div>`;
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Creating account…';

        const sb = getSupabase();
        const { error } = await sb.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: config.emailRedirectTo,
                data: {
                    display_name: legalName,
                    role: 'teacher',
                    legal_name: legalName
                }
            }
        });

        btn.disabled = false;
        btn.textContent = 'Create Teacher Account';

        if (error) {
            alertBox.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
            return;
        }

        alertBox.innerHTML = `
            <div class="alert alert-success">
                Account created! Check your email and click the verification link before logging in.
            </div>`;
        form.reset();
    });
}

export async function initLoginPage() {
    const form = document.getElementById('login-form');
    const alertBox = document.getElementById('alert-box');

    if (!isConfigured()) {
        showConfigWarning('alert-box');
        form?.querySelector('button')?.setAttribute('disabled', 'true');
        return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === '1') {
        alertBox.innerHTML = '<div class="alert alert-success">Email verified successfully. You can log in now.</div>';
    }

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.innerHTML = '';

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const btn = form.querySelector('button[type="submit"]');

        btn.disabled = true;
        btn.textContent = 'Logging in…';

        const sb = getSupabase();
        const { data, error } = await sb.auth.signInWithPassword({ email, password });

        btn.disabled = false;
        btn.textContent = 'Log In';

        if (error) {
            let msg = error.message;
            if (error.message.includes('Email not confirmed')) {
                msg = 'Please verify your email before logging in (check your inbox for the verification link).';
            }
            alertBox.innerHTML = `<div class="alert alert-error">${msg}</div>`;
            return;
        }

        if (data.session) {
            window.location.href = '../index.html';
        }
    });
}

export async function requireAuth(redirectTo = 'login.html') {
    if (!isConfigured()) return null;

    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();

    if (!session) {
        window.location.href = redirectTo;
        return null;
    }
    return session;
}

export { getDisplayName, validateStudentId, validateRealName };
