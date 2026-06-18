// /public/js/components/profileModal.js

let _socket = null;
let _currentUserId = null;
let _myUserId = null;

export function initProfileModal(socket, myUserId) {
    _socket = socket;
    _myUserId = myUserId;
    _injectHTML();
    _bindEvents();
}

export async function openProfileModal(userId) {
    _currentUserId = userId;

    document.getElementById('pm-name').textContent = '...';
    document.getElementById('pm-meta').textContent = '...';
    document.getElementById('pm-score').textContent = '0';
    document.getElementById('pm-img').src = '/images/user-profile/default-profile-image.jpg';
    document.getElementById('pm-crew-list').innerHTML = '<div style="color:var(--text-3);font-size:13px;">불러오는 중...</div>';

    const friendBtn = document.getElementById('pm-friend-btn');
    friendBtn.textContent = '+ 친구 추가';
    friendBtn.disabled = false;
    friendBtn.style.display = '';
    document.getElementById('pm-friend-since').style.display = 'none';
    document.getElementById('pm-friend-since').textContent = '';

    const overlay = document.getElementById('pm-overlay');
    overlay.style.display = 'flex';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    // 내 프로필이면 친구 추가 버튼 숨김
    if (_myUserId && userId === _myUserId.toString()) {
        friendBtn.style.display = 'none';
    }

    try {
        const res = await fetch(`/user/api/${userId}/profile`);
        const data = await res.json();
        if (!data.ok) {
            if (data.reason === 'private') {
                document.getElementById('pm-name').textContent = '비공개 프로필';
                document.getElementById('pm-meta').textContent = '이 사용자는 프로필을 비공개로 설정했습니다';
                document.getElementById('pm-friend-btn').style.display = 'none';
                document.getElementById('pm-crew-list').innerHTML = '';

                document.getElementById('pm-score').textContent = '비공개';
                document.getElementById('pm-score').style.color = 'var(--text-3)';
                document.getElementById('pm-score').style.fontSize = '13px';
            }
            return;
        }

        const u = data.user;
        document.getElementById('pm-name').textContent = u.name;
        document.getElementById('pm-img').src = u.profileImage && u.profileImage !== 'default-profile-image.jpg'
            ? `/images/user-profile/${u.profileImage}`
            : '/images/user-profile/default-profile-image.jpg';

        const genderKor = u.gender === 'male' ? '남성' : '여성';
        document.getElementById('pm-meta').textContent = `${genderKor} · ${u.age}세`;
        document.getElementById('pm-score').textContent = u.reputation || 0;

        if (u.privacy?.showManner === false) {
        document.getElementById('pm-score').textContent = '비공개';
        document.getElementById('pm-score').style.color = 'var(--text-3)';
    }

        // 친구 여부 확인
        if (data.friendInfo) {
            friendBtn.style.display = 'none';
            const sinceEl = document.getElementById('pm-friend-since');
            sinceEl.style.display = '';
            const since = new Date(data.friendInfo.since);
            const formatted = `${since.getFullYear()}.${String(since.getMonth()+1).padStart(2,'0')}.${String(since.getDate()).padStart(2,'0')}`;
            sinceEl.textContent = `👥 ${formatted}에 친구가 됐어요`;
        }

        const crewList = document.getElementById('pm-crew-list');
        if (data.crews && data.crews.length > 0) {
            crewList.innerHTML = data.crews.map(c => `
                <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);">
                    <div style="font-size:18px;">${c.sportEmoji || '🏅'}</div>
                    <div>
                        <div style="font-size:13px;font-weight:600;">${c.title}</div>
                        <div style="font-size:11.5px;color:var(--text-3);">${c.sport} · ${c.address}</div>
                    </div>
                </div>
            `).join('');
        } else if (!data.showHistory) {
            crewList.innerHTML = '<div style="color:var(--text-3);font-size:13px;">활동 이력을 비공개로 설정했습니다</div>';
        } else {
            crewList.innerHTML = '<div style="color:var(--text-3);font-size:13px;">가입한 크루가 없습니다</div>';
        }
    } catch (e) {
        console.error('프로필 로딩 실패', e);
    }
}

export function closeProfileModal() {
    const overlay = document.getElementById('pm-overlay');
    overlay.classList.remove('open');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    _currentUserId = null;
    document.getElementById('pm-dropdown').style.display = 'none';
}

function _showToast(msg) {
    const toastEl = document.getElementById('manageToast');
    if (toastEl) {
        const msgEl = document.getElementById('toastMsg');
        if (msgEl) msgEl.textContent = msg;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 2800);
    } else {
        alert(msg);
    }
}

function _bindEvents() {
    
    document.getElementById('pm-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('pm-overlay')) closeProfileModal();
    });

    document.getElementById('pm-close').addEventListener('click', closeProfileModal);

    document.getElementById('pm-menu-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const dd = document.getElementById('pm-dropdown');
        dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', () => {
        const dd = document.getElementById('pm-dropdown');
        if (dd) dd.style.display = 'none';
    });

    document.getElementById('pm-friend-btn').addEventListener('click', () => {
        if (!_socket) { _showToast('⚠️ 로그인이 필요합니다.'); return; }
        if (!_currentUserId) return;
        _socket.emit('friend:request', { receiverId: _currentUserId });
        document.getElementById('pm-friend-btn').textContent = '요청 완료';
        document.getElementById('pm-friend-btn').disabled = true;
    });

    document.getElementById('pm-dropdown').addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (!action) return;
        document.getElementById('pm-dropdown').style.display = 'none';
        if (action === 'kick') closeProfileModal();
    });

    if (_socket) {
        _socket.on('friend:error', ({ message }) => {
            const btn = document.getElementById('pm-friend-btn');
            if (btn) {
                btn.textContent = '+ 친구 추가';
                btn.disabled = false;
            }
            _showToast('⚠️ ' + message);
        });

        _socket.on('friend:request:sent', ({ message }) => {
            _showToast('👋 ' + message);
        });
    }
}

function _injectHTML() {
    if (document.getElementById('pm-overlay')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay" id="pm-overlay" style="display:none; z-index:9999;">
            <div class="modal-box" style="max-width:560px;position:relative;">
                <button id="pm-close" style="position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:50%;background:var(--bg);border:1px solid var(--border);color:var(--text-3);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">✕</button>
                <div class="modal-head">
                    <span class="modal-head-title">👤 멤버 프로필</span>
                </div>
                <div class="modal-body" style="padding:20px 24px;">
                    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;position:relative;">
                        <img id="pm-img" src="" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--border);flex-shrink:0;">
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:16px;font-weight:700;" id="pm-name">이름</div>
                            <div style="font-size:12.5px;color:var(--text-3);margin-top:3px;" id="pm-meta">성별 · 나이</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:22px;font-weight:700;font-family:'DM Mono',monospace;color:var(--primary);" id="pm-score">0</div>
                            <div style="font-size:11px;color:var(--text-3);">활동 점수</div>
                        </div>
                        <div style="position:relative;">
                            <button class="btn btn-outline btn-sm" id="pm-menu-btn" style="padding:6px 10px;">•••</button>
                            <div id="pm-dropdown" style="display:none;position:absolute;right:0;top:calc(100% + 6px);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);box-shadow:var(--shadow-lg);min-width:130px;z-index:600;overflow:hidden;">
                                <button class="profile-menu-item" data-action="report">🚨 신고</button>
                                <button class="profile-menu-item" data-action="block">🚫 차단</button>
                                <button class="profile-menu-item" data-action="message">💬 쪽지 보내기</button>
                                <button class="profile-menu-item" data-action="kick" style="color:var(--red);">👢 강퇴</button>
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-outline btn-full" id="pm-friend-btn" style="margin-bottom:8px;">+ 친구 추가</button>
                    <div id="pm-friend-since" style="display:none;font-size:12px;color:var(--text-3);text-align:center;margin-bottom:12px;"></div>
                    <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">가입한 크루</div>
                    <div id="pm-crew-list" style="display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto;"></div>
                </div>
            </div>
        </div>
    `);
}

