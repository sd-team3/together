const allFriends = Array.from(document.querySelectorAll('#friend-list .friend-card'));
let removingId = null;
const isFriendPage = !!document.getElementById('count-all');

function updateCount() {
    if (!isFriendPage) return;
    const favCount = allFriends.filter(c => c.dataset.fav === 'true').length;
    document.getElementById('count-all').textContent = allFriends.length;
    document.getElementById('count-fav').textContent = favCount;
}
updateCount();

if (isFriendPage) {
    // 탭 전환
    document.querySelectorAll('.friend-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.friend-tab').forEach(t => t.classList.remove('on'));
            tab.classList.add('on');

            const type = tab.dataset.tab;
            const isPending = type === 'pending';

            document.getElementById('friend-list').style.display  = isPending ? 'none' : 'flex';
            document.getElementById('pending-list').style.display = isPending ? 'flex' : 'none';
            document.getElementById('search-bar').style.display   = isPending ? 'none' : '';

            if (!isPending) {
                allFriends.forEach(card => {
                    card.style.display = type === 'favorite' && card.dataset.fav !== 'true' ? 'none' : '';
                });
            }
        });
    });

    // 검색
    document.getElementById('friend-search').addEventListener('input', function () {
        const keyword = this.value.trim();
        allFriends.forEach(card => {
            card.style.display = card.dataset.name.includes(keyword) ? '' : 'none';
        });
    });

    // 즐겨찾기 토글
    document.querySelectorAll('.btn-fav').forEach(btn => {
        btn.addEventListener('click', async () => {
            const friendId = btn.dataset.id;
            const res = await fetch(`/friends/${friendId}/favorite`, { method: 'PATCH' });
            const data = await res.json();
            if (!data.ok) return;

            const card = btn.closest('.friend-card');
            card.dataset.fav = data.isFavorite ? 'true' : 'false';
            btn.textContent = data.isFavorite ? '⭐' : '☆';
            updateCount();
        });
    });

    // 삭제 버튼
    const removeModal = document.getElementById('remove-modal');

    document.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            removingId = btn.dataset.id;
            document.getElementById('remove-modal-name').textContent = `${btn.dataset.name}님을 친구 목록에서 삭제할까요?`;
            removeModal.style.display = 'flex';
        });
    });

    document.getElementById('remove-cancel-btn').addEventListener('click', () => {
        removeModal.style.display = 'none';
        removingId = null;
    });

    document.getElementById('remove-confirm-btn').addEventListener('click', async () => {
        if (!removingId) return;
        const res = await fetch(`/friends/${removingId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.ok) return;

        const card = document.querySelector(`#friend-list .friend-card[data-id="${removingId}"]`);
        card?.remove();
        removeModal.style.display = 'none';
        removingId = null;
        updateCount();
    });

    // 수락
    document.querySelectorAll('.btn-accept').forEach(btn => {
        btn.addEventListener('click', () => {
            const requestId = btn.dataset.id;
            const senderId  = btn.dataset.senderId;
            if (_notiSocket) {
                _notiSocket.emit('friend:accept', { requestId, senderId });
                btn.closest('.friend-card')?.remove();
            }
        });
    });

    // 거절
    document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', () => {
            const requestId = btn.dataset.id;
            if (_notiSocket) {
                _notiSocket.emit('friend:reject', { requestId });
                btn.closest('.friend-card')?.remove();
            }
        });
    });
}

// ── 소켓 ──
let _notiSocket = null;

export function initFriendSocket(socket) {
    _notiSocket = socket;

    socket.on('friend:request:sent', ({ message }) => {
        alert(message);
    });
    socket.on('friend:error', ({ message }) => {
        alert(message);
    });
    socket.on('friend:accept:done', () => {
        location.reload();
    });
}

export function emitFriendRequest(receiverId) {
    if (!_notiSocket) { console.log('소켓 없음'); return; }
    console.log('emit receiverId:', receiverId, 'socket id:', _notiSocket.id);
    _notiSocket.emit('friend:request', { receiverId });
}