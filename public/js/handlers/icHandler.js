import kakaoMap from '../modules/mapLoader.js';
import { apiGetCrew, apiNoshow, apiKick } from './instantCrew/instantApi.js';
import { renderMemberPopupBody, setPopupState } from './instantCrew/instantPopupMember.js';

let crewsData  = [];
let isLoggedIn = false;
let myCrewIds  = [];
let _maCrewId  = null;
let _maUserId  = null;

function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)    return '방금 전';
    if (diff < 3600)  return Math.floor(diff / 60) + '분 전';
    if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
    return Math.floor(diff / 86400) + '일 전';
}

function renderCrewList() {
    const container = document.querySelector('.map-list-items');
    const items = [...container.querySelectorAll('.map-item')];
    if (myCrewIds.length === 0) return;

    const myItems    = items.filter(item =>  myCrewIds.includes(item.dataset.id));
    const otherItems = items.filter(item => !myCrewIds.includes(item.dataset.id));
    container.innerHTML = '';

    if (myItems.length > 0) {
        const h = document.createElement('div');
        h.style.cssText = `padding:8px 18px;font-size:11px;font-weight:700;letter-spacing:1px;
            text-transform:uppercase;color:var(--text-3);background:var(--bg);border-bottom:1px solid var(--border);`;
        h.textContent = '⚡ 내 모임';
        container.appendChild(h);
        myItems.forEach(item => container.appendChild(item));
    }
    if (otherItems.length > 0) {
        const h = document.createElement('div');
        h.style.cssText = `padding:8px 18px;font-size:11px;font-weight:700;letter-spacing:1px;
            text-transform:uppercase;color:var(--text-3);background:var(--bg);
            border-bottom:1px solid var(--border);border-top:1px solid var(--border);`;
        h.textContent = '🏃 다른 모임';
        container.appendChild(h);
        otherItems.forEach(item => container.appendChild(item));
    }
}

function showMapPopup(data) {
    document.getElementById('pp-sport').textContent = data.sportKr;

    const isFull   = data.current >= data.capacity;
    const isAlmost = !isFull && (data.current / data.capacity) >= 0.8;
    const statusEl = document.getElementById('pp-status');

    if (isFull)        { statusEl.className = 'pill pill-closed'; statusEl.textContent = '마감'; }
    else if (isAlmost) { statusEl.className = 'pill pill-warn';   statusEl.textContent = '마감임박'; }
    else               { statusEl.className = 'pill pill-open';   statusEl.textContent = '참가가능'; }

    const acceptEl = document.getElementById('pp-accept');
    acceptEl.className   = 'tag tag-outline';
    acceptEl.textContent = data.isAutoAccept ? '⚡ 자동수락' : '✋ 수동수락';

    document.getElementById('pp-title').textContent      = data.title;
    document.getElementById('pp-intro').textContent      = data.intro || '';
    document.getElementById('pp-loc').textContent        = '📍 ' + data.state + ' ' + data.city;
    document.getElementById('pp-members').textContent    = '👥 ' + data.current + '/' + data.capacity + '명';
    document.getElementById('pp-host-av').textContent    = data.host.charAt(0);
    document.getElementById('pp-host').textContent       = data.host;
    document.getElementById('pp-reputation').textContent = data.avgReputation > 0
        ? '⭐ ' + data.avgReputation.toFixed(1) : '평점 없음';
    document.getElementById('pp-time').textContent =
        '⏰ ' + (data.meetAt ? new Date(data.meetAt).toLocaleString('ko-KR') : '미정') +
        '  🕐 ' + timeAgo(data.createdAt);

    const applyBtn = document.getElementById('popup-apply-btn');
    applyBtn.dataset.crewId = data.id;

    if (isFull) {
        applyBtn.textContent = '마감';
        applyBtn.disabled    = true;
    } else {
        applyBtn.textContent = '참가 신청';
        applyBtn.disabled    = false;
        applyBtn.onclick = async () => {
            if (!isLoggedIn) { window.location.href = '/user/login'; return; }
            try {
                const res = await fetch(`/instant/application/${data.id}`, { method: 'POST' });
                if (res.ok) {
                    document.querySelector('.map-popup').innerHTML = `
                        <div style="display:flex;flex-direction:column;align-items:center;
                            justify-content:center;padding:60px 20px;text-align:center;">
                            <div style="font-size:48px;margin-bottom:16px;">🎉</div>
                            <div style="font-size:18px;font-weight:700;margin-bottom:8px;">참가 신청 완료!</div>
                            <div style="font-size:13px;color:#aaa;margin-bottom:24px;">
                                ${data.isAutoAccept ? '자동 수락되어 모임에 참가됐습니다.' : '호스트 승인 후 참가가 확정됩니다.'}
                            </div>
                            <button id="popup-success-btn"
                                style="padding:12px 32px;border-radius:8px;background:#222;color:#fff;
                                    border:none;font-size:14px;font-weight:600;cursor:pointer;">
                                확인
                            </button>
                        </div>`;
                    document.getElementById('popup-success-btn').addEventListener('click', () => {
                        closeMapPopup();
                        location.reload();
                    });
                } else {
                    const result = await res.json();
                    alert(result.message || '신청에 실패했습니다');
                }
            } catch (e) { alert('서버 오류가 발생했습니다'); }
        };
    }
    document.getElementById('map-popup').classList.add('show');
}

function closeMapPopup() {
    document.getElementById('map-popup').classList.remove('show');
}

async function showMemberPopup(crewId) {
    const modal = document.getElementById('member-popup');
    const body  = document.getElementById('mp-body');

    body.innerHTML = '<div style="padding:40px;text-align:center;color:#aaa;">불러오는 중...</div>';
    modal.classList.add('show');

    try {
        const data = await apiGetCrew(crewId);
        if (!data.success) {
            body.innerHTML = '<div style="padding:40px;text-align:center;color:#f00;">불러오기 실패</div>';
            return;
        }
        setPopupState({
            crewId:       crewId,
            crewData:     { ...data.crew, pendingApps: data.pendingApps || [] },
            isHost:       data.isHost,
            topTab:       'crew',
            activeTab:    'member',
            activeFilter: 'all',
            search:       ''
        });
        renderMemberPopupBody();
    } catch (e) {
        body.innerHTML = '<div style="padding:40px;text-align:center;color:#f00;">오류가 발생했습니다</div>';
    }
}

window.showMemberPopup = showMemberPopup;

function closeMemberPopup() {
    document.getElementById('member-popup').classList.remove('show');
}

window.mpManageMember = (crewId, userId, userName) => {
    _maCrewId = crewId;
    _maUserId = userId;
    document.getElementById('ma-name').textContent = userName;
    document.getElementById('ma-sub').textContent  = '멤버 관리';
    document.getElementById('member-action-modal').classList.add('show');
};

function setSortTab(el, type) {
    el.closest('.map-sort-tabs').querySelectorAll('.map-sort-tab').forEach(t => t.classList.remove('on'));
    el.classList.add('on');

    const container = document.querySelector('.map-list-items');
    const items = [...container.querySelectorAll('.map-item')];

    if (type === '시간순') {
        items.sort((a, b) => {
            const aC = crewsData.find(c => String(c.id) === a.dataset.id);
            const bC = crewsData.find(c => String(c.id) === b.dataset.id);
            return new Date(bC.createdAt) - new Date(aC.createdAt);
        });
    } else if (type === '인원순') {
        items.sort((a, b) => {
            const parse = str => str.replace('명', '').split('/').map(Number);
            const [aCur] = parse(a.dataset.members);
            const [bCur] = parse(b.dataset.members);
            return bCur - aCur;
        });
    }
    items.forEach(item => container.appendChild(item));
    renderCrewList();
}

function filterToggle(btn, type) {
    document.querySelectorAll('.map-filter-chip').forEach(c => c.classList.remove('on'));
    btn.classList.add('on');
    kakaoMap.getMarkers().forEach(marker => {
        const crew    = marker._crewData;
        const visible = type === 'all' || crew.sport === type;
        marker.setMap(visible ? window.MAP : null);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const pageData = JSON.parse(document.getElementById('page-data').textContent);
    crewsData  = pageData.crews;
    isLoggedIn = pageData.isLoggedIn;
    myCrewIds  = pageData.myCrewIds || [];

    // ── 친구 소켓 초기화 (notiHandler의 소켓 재사용) ──
    if (isLoggedIn) {
        const { getNotiSocket } = await import('./notiHandler.js');
        const { initFriendSocket } = await import('./friendHandler.js');
        
        const tryInit = () => {
            const existingSocket = getNotiSocket();
            if (existingSocket) {
                initFriendSocket(existingSocket);
            } else {
                setTimeout(tryInit, 100);
            }
        };
        tryInit();
    }

    await kakaoMap.loadMapByGPS();
    const crewsWithLocation = crewsData.filter(c => c.lat && c.lng);

    await kakaoMap.loadMarker(
        crewsWithLocation.map(c => ({
            ...c,
            onClick: () => {
                if (isLoggedIn && myCrewIds.includes(String(c.id))) showMemberPopup(c.id);
                else showMapPopup(c);
            }
        }))
    );

    renderCrewList();

    document.querySelectorAll('.map-item').forEach(item => {
        item.addEventListener('click', () => {
            const crew = crewsData.find(c => c.id == item.dataset.id);
            if (!crew) return;
            if (isLoggedIn && myCrewIds.includes(String(crew.id))) showMemberPopup(crew.id);
            else showMapPopup(crew);
        });
    });

    document.querySelectorAll('.map-filter-chip').forEach(chip => {
        chip.addEventListener('click', () => filterToggle(chip, chip.dataset.filter));
    });

    document.querySelectorAll('.map-sort-tab').forEach(tab => {
        tab.addEventListener('click', () => setSortTab(tab, tab.textContent.trim()));
    });

    const mapPopupEl = document.getElementById('map-popup');
    if (mapPopupEl) mapPopupEl.addEventListener('click', e => { if (e.target === mapPopupEl) closeMapPopup(); });
    document.getElementById('popup-close-btn')?.addEventListener('click', closeMapPopup);

    const memberPopupEl = document.getElementById('member-popup');
    if (memberPopupEl) memberPopupEl.addEventListener('click', e => { if (e.target === memberPopupEl) closeMemberPopup(); });
    document.getElementById('mp-close-btn')?.addEventListener('click', closeMemberPopup);

    const actionModal = document.getElementById('member-action-modal');
    if (actionModal) actionModal.addEventListener('click', e => { if (e.target === actionModal) actionModal.classList.remove('show'); });

    document.getElementById('ma-noshow-btn')?.addEventListener('click', async () => {
        actionModal.classList.remove('show');
        try {
            const result = await apiNoshow(_maCrewId, _maUserId);
            if (result.success) showMemberPopup(_maCrewId);
            else alert(result.message || '노쇼 처리 실패');
        } catch (e) { alert('서버 오류'); }
    });

    document.getElementById('ma-kick-btn')?.addEventListener('click', async () => {
        actionModal.classList.remove('show');
        try {
            const result = await apiKick(_maCrewId, _maUserId);
            if (result.success) showMemberPopup(_maCrewId);
            else alert(result.message || '강퇴 실패');
        } catch (e) { alert('서버 오류'); }
    });

    document.getElementById('ma-cancel-btn')?.addEventListener('click', () => {
        actionModal.classList.remove('show');
    });

    document.getElementById('btn-create-match')?.addEventListener('click', () => {
        if (!isLoggedIn) { window.location.href = '/user/login'; return; }
        window.location.href = '/instant/create';
    });
});

// ── 친구추가 모달 ──
let _friendTargetId = null;

window.mpShowFriendModal = (userId, name, gender, age, profileImage) => {
    _friendTargetId = userId;

    const genderKr = gender === 'male' ? '남성' : gender === 'female' ? '여성' : '-';
    const profileSrc = profileImage && profileImage !== 'default-profile-image.jpg'
        ? `/images/user-profile/${profileImage}`
        : '/images/user-profile/default-profile-image.jpg';

    document.getElementById('fm-avatar').src          = profileSrc;
    document.getElementById('fm-name').textContent    = name;
    document.getElementById('fm-gender').textContent  = genderKr;
    document.getElementById('fm-age').textContent     = age ? age + '세' : '-';

    document.getElementById('friend-modal').classList.add('show');
};

document.getElementById('fm-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('friend-modal').classList.remove('show');
    _friendTargetId = null;
});

document.getElementById('fm-confirm-btn')?.addEventListener('click', () => {
    if (!_friendTargetId) return;
    const targetId = _friendTargetId;  // 먼저 복사
    _friendTargetId = null;
    document.getElementById('friend-modal').classList.remove('show');
    console.log('친구추가 receiverId:', targetId);
    import('./friendHandler.js').then(({ emitFriendRequest }) => {
        emitFriendRequest(targetId);
    });
});