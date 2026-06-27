import { getSupabase, isConfigured, showConfigWarning } from './supabase-client.js';
import { requireAuth, getDisplayName } from './auth.js';

export async function initCommunityPage() {
    const alertBox = document.getElementById('alert-box');
    const postForm = document.getElementById('post-form');
    const postsList = document.getElementById('posts-list');

    if (!isConfigured()) {
        showConfigWarning('alert-box');
        postForm?.classList.add('hidden');
        return;
    }

    const session = await requireAuth();
    if (!session) return;

    async function loadPosts() {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            postsList.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
            return;
        }

        if (!data?.length) {
            postsList.innerHTML = '<div class="empty-state">No posts yet. Start the conversation!</div>';
            return;
        }

        postsList.innerHTML = data.map(post => `
            <div class="post-item">
                <div class="post-meta">
                    <span class="post-author">${escapeHtml(post.author_name)}</span>
                    <span>${formatDate(post.created_at)}</span>
                </div>
                <h3 class="post-title">${escapeHtml(post.title)}</h3>
                <div class="post-content">${escapeHtml(post.content)}</div>
            </div>
        `).join('');
    }

    postForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.innerHTML = '';

        const title = document.getElementById('post-title').value.trim();
        const content = document.getElementById('post-content').value.trim();
        const btn = postForm.querySelector('button[type="submit"]');

        if (!title || !content) {
            alertBox.innerHTML = '<div class="alert alert-error">Title and content are required.</div>';
            return;
        }

        btn.disabled = true;
        const sb = getSupabase();
        const { error } = await sb.from('posts').insert({
            user_id: session.user.id,
            author_name: getDisplayName(session.user),
            title,
            content
        });
        btn.disabled = false;

        if (error) {
            alertBox.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
            return;
        }

        postForm.reset();
        alertBox.innerHTML = '<div class="alert alert-success">Post published!</div>';
        setTimeout(() => { alertBox.innerHTML = ''; }, 2000);
        loadPosts();
    });

    loadPosts();
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(iso) {
    return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}
