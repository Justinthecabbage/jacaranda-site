import { getSupabase, isConfigured, showConfigWarning } from './supabase-client.js';
import { requireAuth, getDisplayName } from './auth.js';

const STATUS_LABELS = {
    pending: 'Pending',
    approved: 'Approved'
};

export async function initSongRequestPage() {
    const alertBox = document.getElementById('alert-box');
    const requestForm = document.getElementById('song-form');
    const songsList = document.getElementById('songs-list');

    if (!isConfigured()) {
        showConfigWarning('alert-box');
        requestForm?.classList.add('hidden');
        return;
    }

    const session = await requireAuth();
    if (!session) return;

    const userId = session.user.id;
    let userVotes = new Set();

    async function loadUserVotes() {
        const sb = getSupabase();
        const { data } = await sb
            .from('song_votes')
            .select('song_request_id')
            .eq('user_id', userId);
        userVotes = new Set((data || []).map(v => v.song_request_id));
    }

    function normalizeKey(title, artist) {
        return `${title.trim().toLowerCase()}|${(artist || '').trim().toLowerCase()}`;
    }

    async function findDuplicate(title, artist) {
        const sb = getSupabase();
        const { data } = await sb.from('song_requests').select('id, song_title, artist');
        if (!data) return null;
        const key = normalizeKey(title, artist);
        return data.find(s => normalizeKey(s.song_title, s.artist || '') === key) || null;
    }

    async function loadRequests() {
        await loadUserVotes();
        const sb = getSupabase();
        const { data, error } = await sb
            .from('song_requests')
            .select('*')
            .order('vote_count', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            songsList.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
            return;
        }

        if (!data?.length) {
            songsList.innerHTML = '<div class="empty-state">No songs yet. Be the first to request one!</div>';
            return;
        }

        songsList.innerHTML = data.map(song => {
            const voted = userVotes.has(song.id);
            return `
            <div class="song-item" data-id="${song.id}">
                <div class="song-info">
                    <h4>${escapeHtml(song.song_title)}${song.artist ? ` — ${escapeHtml(song.artist)}` : ''}</h4>
                    <p>Requested by ${escapeHtml(song.requester_name)} · ${formatDate(song.created_at)}</p>
                </div>
                <div class="song-actions">
                    <span class="song-status status-${song.status}">${STATUS_LABELS[song.status] || song.status}</span>
                    <button class="vote-btn${voted ? ' voted' : ''}" data-vote="${song.id}" ${voted ? 'disabled' : ''}>
                        ♥ ${song.vote_count || 0}
                    </button>
                </div>
            </div>`;
        }).join('');

        songsList.querySelectorAll('[data-vote]').forEach(btn => {
            btn.addEventListener('click', () => handleVote(btn.dataset.vote, btn));
        });
    }

    async function handleVote(songId, btn) {
        if (userVotes.has(songId)) return;

        btn.disabled = true;
        const sb = getSupabase();
        const { error } = await sb.from('song_votes').insert({
            song_request_id: songId,
            user_id: userId
        });

        if (error) {
            alertBox.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
            btn.disabled = false;
            return;
        }

        userVotes.add(songId);
        btn.classList.add('voted');
        loadRequests();
    }

    requestForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.innerHTML = '';

        const songTitle = document.getElementById('song-title').value.trim();
        const artist = document.getElementById('artist').value.trim();
        const btn = requestForm.querySelector('button[type="submit"]');

        if (!songTitle) {
            alertBox.innerHTML = '<div class="alert alert-error">Please enter a song title.</div>';
            return;
        }

        const duplicate = await findDuplicate(songTitle, artist);
        if (duplicate) {
            alertBox.innerHTML = `
                <div class="alert alert-warning">
                    This song is already on the board. Use the ♥ button to vote for it instead!
                </div>`;
            return;
        }

        btn.disabled = true;
        const sb = getSupabase();
        const { data: inserted, error } = await sb.from('song_requests').insert({
            user_id: userId,
            requester_name: getDisplayName(session.user),
            song_title: songTitle,
            artist: artist || null,
            status: 'pending'
        }).select('id').single();
        btn.disabled = false;

        if (error) {
            alertBox.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
            return;
        }

        if (inserted?.id) {
            await sb.from('song_votes').insert({
                song_request_id: inserted.id,
                user_id: userId
            });
        }

        requestForm.reset();
        alertBox.innerHTML = '<div class="alert alert-success">Song submitted! Your vote has been counted.</div>';
        setTimeout(() => { alertBox.innerHTML = ''; }, 2500);
        loadRequests();
    });

    await loadRequests();

    const sb = getSupabase();
    sb.channel('song-board')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'song_requests' }, () => loadRequests())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'song_votes' }, () => loadRequests())
        .subscribe();
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
