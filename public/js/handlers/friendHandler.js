// ── 상태 ──
const allFriends = Array.from(document.querySelectorAll('#friend-list .friend-card'));
let removingId = null;
const isFriendPage = !!document.getElementById('count-all');

// ── 유틸 ──
function profileImg(img) {
    return img && img !== 'default-profile-image.jpg'
        ? `/images/user-profile/${img}`
        : '/images/user-profile/default-profile-image.jpg';
}

function updateCount() {
    if (!isFriendPage) return;
    const favCount = allFriends.filter(c => c.dataset.fav === 'true').length;
    document.getElementById('count-all').textContent = allFriends.length;
    document.getElementById('count-fav').textContent = favCount;
}
updateCount();

function makeFriendCard(u) {
    const img = profileImg(u.profileImage);
    const genderKor = u.gender === 'male' ? '남성' : '여성';
    const div = document.createElement('div');
    div.className = 'friend-card';
    div.dataset.id = u._id;
    div.dataset.name = u.name;
    div.dataset.fav = 'false';
    div.innerHTML = `
        <div class="friend-av"><img src="${img}" alt="profile"></div>
        <div class="friend-info">
            <div class="friend-name">${u.name}</div>
            <div class="friend-meta">${genderKor} · ${u.age}세</div>
        </div>
        <div class="friend-actions">
            <button class="btn-fav" data-id="${u._id}" title="즐겨찾기">☆</button>
            <button class="btn-remove" data-id="${u._id}" data-name="${u.name}">삭제</button>
        </div>
    `;
    bindFriendCardEvents(div);
    return div;
}

function makePendingCard(requestId, sender) {
    const img = profileImg(sender.profileImage);
    const genderKor = sender.gender === 'male' ? '남성' : '여성';
    const div = document.createElement('div');
    div.className = 'friend-card';
    div.dataset.requestId = requestId;
    div.innerHTML = `
        <div class="friend-av"><img src="${img}" alt="profile"></div>
        <div class="friend-info">
            <div class="friend-name">${sender.name}</div>
            <div class="friend-meta">${genderKor} · ${sender.age}세</div>
        </div>
        <div class="friend-actions">
            <button class="btn-accept" data-id="${requestId}" data-sender-id="${sender._id}">수락</button>
            <button class="btn-reject" data-id="${requestId}">거절</button>
        </div>
    `;
    bindPendingCardEvents(div);
    return div;
}

function bindFriendCardEvents(card) {
    card.querySelector('.btn-fav').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const friendId = btn.dataset.id;
        const res = await fetch(`/friends/${friendId}/favorite`, { method: 'PATCH' });
        const data = await res.json();
        if (!data.ok) return;

        card.dataset.fav = data.isFavorite ? 'true' : 'false';
        btn.textContent = data.isFavorite ? '⭐' : '☆';
        btn.classList.toggle('active', data.isFavorite);
        updateCount();

        const list = document.getElementById('friend-list');
        if (data.isFavorite) {
            list.prepend(card);
        } else {
            const favCards = list.querySelectorAll('.friend-card[data-fav="true"]');
            const lastFav = favCards[favCards.length - 1];
            if (lastFav) lastFav.after(card);
            else list.prepend(card);
        }
    });

    card.querySelector('.btn-remove').addEventListener('click', () => {
        const btn = card.querySelector('.btn-remove');
        removingId = btn.dataset.id;
        document.getElementById('remove-modal-name').textContent = `${btn.dataset.name}님을 친구 목록에서 삭제할까요?`;
        document.getElementById('remove-modal').style.display = 'flex';
    });

    // 프로필 모달 — 카드 클릭 (버튼 제외)
    card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const userId = card.dataset.id;
        if (userId) openProfileModal(userId);
    });
}

function bindPendingCardEvents(card) {
    card.querySelector('.btn-accept').addEventListener('click', () => {
        const btn = card.querySelector('.btn-accept');
        const requestId = btn.dataset.id;
        const senderId  = btn.dataset.senderId;
        if (_notiSocket) {
            _notiSocket.emit('friend:accept', { requestId, senderId });
            card.remove();
            updatePendingCount(-1);
        }
    });

    card.querySelector('.btn-reject').addEventListener('click', () => {
        const btn = card.querySelector('.btn-reject');
        const requestId = btn.dataset.id;
        if (_notiSocket) {
            _notiSocket.emit('friend:reject', { requestId });
            card.remove();
            updatePendingCount(-1);
        }
    });
}

function updatePendingCount(delta) {
    const el = document.getElementById('count-pending');
    if (!el) return;
    const cur = parseInt(el.textContent) || 0;
    el.textContent = Math.max(0, cur + delta);
}

function updateSentCount(delta) {
    const el = document.getElementById('count-sent');
    if (!el) return;
    const cur = parseInt(el.textContent) || 0;
    el.textContent = Math.max(0, cur + delta);
}

// openProfileModal — profileModal.js 에서 import
let openProfileModal = () => {};
import('/js/components/profileModal.js').then(mod => {
    openProfileModal = mod.openProfileModal;
});

if (isFriendPage) {
    // 기존 카드에 이벤트 바인딩
    document.querySelectorAll('#friend-list .friend-card').forEach(bindFriendCardEvents);
    document.querySelectorAll('#pending-list .friend-card').forEach(bindPendingCardEvents);

    // 탭 전환
    document.querySelectorAll('.friend-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.friend-tab').forEach(t => t.classList.remove('on'));
            tab.classList.add('on');

            const type = tab.dataset.tab;
            const friendList   = document.getElementById('friend-list');
            const pendingList  = document.getElementById('pending-list');
            const sentList     = document.getElementById('sent-list');
            const searchBar    = document.getElementById('search-bar');

            friendList.style.display  = type === 'all' || type === 'favorite' ? 'flex' : 'none';
            pendingList.style.display = type === 'pending' ? 'flex' : 'none';
            sentList.style.display    = type === 'sent'    ? 'flex' : 'none';
            searchBar.style.display   = type === 'all' || type === 'favorite' ? '' : 'none';

            if (type === 'favorite') {
                document.querySelectorAll('#friend-list .friend-card').forEach(card => {
                    card.style.display = card.dataset.fav !== 'true' ? 'none' : '';
                });
            } else if (type === 'all') {
                document.querySelectorAll('#friend-list .friend-card').forEach(card => {
                    card.style.display = '';
                });
            }
        });
    });

    // 검색
    document.getElementById('friend-search').addEventListener('input', function () {
        const keyword = this.value.trim();
        document.querySelectorAll('#friend-list .friend-card').forEach(card => {
            card.style.display = card.dataset.name.includes(keyword) ? '' : 'none';
        });
    });

    // 삭제 모달
    const removeModal = document.getElementById('remove-modal');

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
        const idx = allFriends.indexOf(card);
        if (idx > -1) allFriends.splice(idx, 1);
        card?.remove();
        removeModal.style.display = 'none';
        removingId = null;
        updateCount();
    });

    // 보낸 신청 취소
    document.querySelectorAll('#sent-list .btn-cancel-sent').forEach(btn => {
        btn.addEventListener('click', async () => {
            const requestId = btn.dataset.id;
            const res = await fetch(`/friends/requests/${requestId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.ok) return;
            btn.closest('.friend-card')?.remove();
            updateSentCount(-1);
        });
    });
}

// ── 소켓 ──
let _notiSocket = null;

export function initFriendSocket(socket) {
    _notiSocket = socket;

    // 내가 보낸 요청 확인
    socket.on('friend:request:sent', ({ message }) => {
        // profileModal 쪽에서 처리하므로 여기선 생략 가능
    });

    socket.on('friend:error', ({ message }) => {
        alert(message);
    });

    // 수락 완료 — 새로고침 없이 카드 추가
    socket.on('friend:accept:done', ({ newFriend }) => {
        if (!isFriendPage) return;
        const list = document.getElementById('friend-list');

        // 빈 상태 메시지 제거
        const emptyEl = list.querySelector('.friend-empty');
        if (emptyEl) emptyEl.remove();

        const card = makeFriendCard(newFriend);
        list.appendChild(card);
        allFriends.push(card);
        updateCount();
    });

    // 실시간 친구 신청 수신 — 카드 동적 추가 + 카운트 업
    socket.on('friend:requested', ({ requestId, sender }) => {
        if (!isFriendPage) return;

        const pendingList = document.getElementById('pending-list');

        // 빈 상태 메시지 제거
        const emptyEl = pendingList.querySelector('.friend-empty');
        if (emptyEl) emptyEl.remove();

        const card = makePendingCard(requestId, sender);
        pendingList.prepend(card);
        updatePendingCount(1);
    });

    // 상대방이 내 요청 수락 — 보낸 신청 탭에서 카드 제거
    socket.on('friend:accepted', ({ receiver }) => {
        if (!isFriendPage) return;
        // 보낸 신청 목록에서 해당 카드 제거 (receiver._id 기준으로 data-receiver-id 사용)
        const sentCard = document.querySelector(`#sent-list .friend-card[data-receiver-id="${receiver._id}"]`);
        if (sentCard) {
            sentCard.remove();
            updateSentCount(-1);
        }
    });
}

export function emitFriendRequest(receiverId) {
    if (!_notiSocket) { console.log('소켓 없음'); return; }
    _notiSocket.emit('friend:request', { receiverId });
}