import kakaoMap from '../modules/mapLoader.js';

let crewsData = [];
let isLoggedIn = false;
let myCrewIds = [];
let _maCrewId = null;
let _maUserId = null;

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)     return '방금 전';
  if (diff < 3600)   return Math.floor(diff / 60) + '분 전';
  if (diff < 86400)  return Math.floor(diff / 3600) + '시간 전';
  return Math.floor(diff / 86400) + '일 전';
}

// ── 내 모임/다른 모임 섹션 분리
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

// ── 비회원/미가입자용 팝업 ──
function showMapPopup(data) {
  document.getElementById('pp-sport').textContent = data.sportKr;

  const isFull    = data.current >= data.capacity;
  const isAlmost  = !isFull && (data.current / data.capacity) >= 0.8;
  const statusEl  = document.getElementById('pp-status');

  if (isFull) {
    statusEl.className = 'pill pill-closed'; statusEl.textContent = '마감';
  } else if (isAlmost) {
    statusEl.className = 'pill pill-warn';   statusEl.textContent = '마감임박';
  } else {
    statusEl.className = 'pill pill-open';   statusEl.textContent = '참가가능';
  }

  const acceptEl = document.getElementById('pp-accept');
  acceptEl.className = 'tag tag-outline';
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

// ── 호스트/멤버용 상세 모달 ──
let _mpCrewId       = null;
let _mpCrewData     = null;
let _mpIsHost       = false;
let _mpTopTab       = 'crew';
let _mpActiveTab    = 'member';
let _mpActiveFilter = 'all';
let _mpSearch       = '';

async function showMemberPopup(crewId) {
  const modal = document.getElementById('member-popup');
  const body  = document.getElementById('mp-body');

  body.innerHTML = '<div style="padding:40px;text-align:center;color:#aaa;">불러오는 중...</div>';
  modal.classList.add('show');

  try {
    const res  = await fetch(`/instant/api/${crewId}`);
    const data = await res.json();
    if (!data.success) { body.innerHTML = '<div style="padding:40px;text-align:center;color:#f00;">불러오기 실패</div>'; return; }

    _mpCrewId       = crewId;
    _mpCrewData     = { ...data.crew, pendingApps: data.pendingApps || [] };
    _mpIsHost       = data.isHost;
    _mpTopTab       = 'crew';
    _mpActiveTab    = 'member';
    _mpActiveFilter = 'all';
    _mpSearch       = '';

    renderMemberPopupBody();
  } catch (e) {
    body.innerHTML = '<div style="padding:40px;text-align:center;color:#f00;">오류가 발생했습니다</div>';
  }
}

function renderMemberPopupBody() {
  const body        = document.getElementById('mp-body');
  const crew        = _mpCrewData;
  const crewId      = _mpCrewId;
  const isHost      = _mpIsHost;
  const memberList  = crew.member.memberList;
  const pendingList = crew.pendingApps || [];
  const confirmed   = memberList.filter(m => m.status === 'confirmed');

  const isFull   = memberList.length >= crew.member.capacity;
  const isAlmost = !isFull && (memberList.length / crew.member.capacity) >= 0.8;
  const statusPill = isFull
    ? '<span class="pill pill-closed">마감</span>'
    : isAlmost
      ? '<span class="pill pill-warn">마감임박</span>'
      : '<span class="pill pill-open">참가가능</span>';

  const topTabs = `
    <div style="display:flex;gap:0;border-bottom:2px solid #f0f0f0;margin-bottom:20px;">
      ${[['crew','📋 모임'],['chat','💬 채팅방']].map(([key, label]) => `
        <button onclick="mpSetTopTab('${key}')"
          style="padding:10px 18px;font-size:14px;font-weight:600;border:none;background:none;cursor:pointer;
            border-bottom:2px solid ${_mpTopTab === key ? '#222' : 'transparent'};
            color:${_mpTopTab === key ? '#222' : '#aaa'};margin-bottom:-2px;">
          ${label}
        </button>`).join('')}
    </div>`;

  if (_mpTopTab === 'chat') {
    body.innerHTML = `
      <div class="popup-title" style="margin-bottom:16px;">${crew.title}</div>
      ${topTabs}
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
        padding:60px 20px;color:#aaa;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">💬</div>
        <div style="font-size:15px;font-weight:600;color:#555;margin-bottom:6px;">채팅 기능 준비 중</div>
        <div style="font-size:13px;">곧 모달에서 바로 채팅할 수 있어요</div>
      </div>`;
    return;
  }

  const stats = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px;">
      ${[
        ['전체 참여자', memberList.length,  '#222'],
        ['참가 확정',   confirmed.length,   '#22c55e'],
        ['모집 현황',   `${memberList.length} / ${crew.member.capacity}`, '#3b82f6'],
        ['신청 대기',   pendingList.length, '#f97316']
      ].map(([label, val, color]) => `
        <div style="background:#f8f8f8;border-radius:10px;padding:12px 8px;text-align:center;">
          <div style="font-size:11px;color:#aaa;margin-bottom:4px;">${label}</div>
          <div style="font-size:20px;font-weight:700;color:${color};">${val}</div>
        </div>`).join('')}
    </div>`;

  const tabs = `
    <div style="display:flex;gap:0;border-bottom:2px solid #f0f0f0;margin-bottom:16px;">
      ${[['member','참여자 목록'],['pending','신청 대기']].map(([key, label]) => `
        <button onclick="mpSetTab('${key}')"
          style="padding:10px 18px;font-size:13px;font-weight:600;border:none;background:none;cursor:pointer;
            border-bottom:2px solid ${_mpActiveTab === key ? '#222' : 'transparent'};
            color:${_mpActiveTab === key ? '#222' : '#aaa'};margin-bottom:-2px;">
          ${label} ${key === 'member' ? memberList.length : pendingList.length}
        </button>`).join('')}
    </div>`;

  // ── 신청 대기 탭: 카드 형태 ──
  if (_mpActiveTab === 'pending') {
    const cards = pendingList.length === 0
      ? `<div style="padding:40px;text-align:center;color:#aaa;font-size:13px;">신청 대기 중인 멤버가 없어요</div>`
      : pendingList.map(app => {
          const u = app.userId || {};
          return `
            <div style="background:#fff;border:1px solid #f0f0f0;border-radius:12px;padding:16px;margin-bottom:12px;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:40px;height:40px;border-radius:50%;background:var(--primary,#3b82f6);
                    color:#fff;font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    ${(u.name || '?').charAt(0)}
                  </div>
                  <div>
                    <div style="font-size:14px;font-weight:700;">${u.name || '멤버'}</div>
                    <div style="font-size:12px;color:#aaa;">${u.tel || ''}</div>
                  </div>
                </div>
                <div style="font-size:12px;color:#aaa;">${timeAgo(app.createdAt)}</div>
              </div>
              <div style="display:flex;gap:16px;font-size:12px;color:#555;margin-bottom:12px;">
                ${u.gender ? `<span>${u.gender === 'male' ? '남성' : '여성'}</span>` : ''}
                ${u.age ? `<span>${u.age}세</span>` : ''}
                ${u.honor !== undefined ? `<span>⭐ 매너점수 ${u.honor}</span>` : ''}
              </div>
              ${isHost ? `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
                  <button onclick="mpJoinProcess('${app._id}','accept','${crewId}')"
                    style="padding:10px;border-radius:8px;border:1px solid #bbf7d0;
                      background:#f0fdf4;color:#16a34a;font-size:13px;font-weight:600;cursor:pointer;">
                    ✓ 수락
                  </button>
                  <button onclick="mpJoinProcess('${app._id}','reject','${crewId}')"
                    style="padding:10px;border-radius:8px;border:1px solid #fecaca;
                      background:#fff5f5;color:#ef4444;font-size:13px;font-weight:600;cursor:pointer;">
                    ✕ 거절
                  </button>
                </div>` : ''}
            </div>`;
        }).join('');

    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <div class="popup-sport">${crew.sportKr || ''}</div>
        ${statusPill}
      </div>
      <div class="popup-title" style="margin-bottom:4px;">${crew.title}</div>
      <div style="font-size:13px;color:#aaa;margin-bottom:16px;">
        📍 ${crew.address?.state} ${crew.address?.city}
        &nbsp;·&nbsp; ⏰ ${crew.meetAt ? new Date(crew.meetAt).toLocaleString('ko-KR') : '미정'}
      </div>
      ${topTabs}${stats}${tabs}${cards}`;
    return;
  }

  // ── 참여자 목록 탭: 테이블 형태 ──
  const filterBar = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
      <div style="display:flex;gap:6px;flex:1;flex-wrap:wrap;">
        ${[['all','전체'],['host','모임장'],['confirmed','참가확정'],['noshow','노쇼']].map(([key, label]) => `
          <button onclick="mpSetFilter('${key}')"
            style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;
              border:1px solid ${_mpActiveFilter === key ? '#222' : '#e5e7eb'};
              background:${_mpActiveFilter === key ? '#222' : '#fff'};
              color:${_mpActiveFilter === key ? '#fff' : '#555'};">
            ${label}
          </button>`).join('')}
      </div>
      <div style="position:relative;">
        <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#aaa;font-size:13px;">🔍</span>
        <input id="mp-search" type="text" placeholder="이름 검색" value="${_mpSearch}"
          oninput="mpSetSearch(this.value)"
          style="padding:6px 12px 6px 30px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;width:130px;outline:none;">
      </div>
    </div>`;

  const filtered = memberList.filter(m => {
    const u = m.user || {};
    const name = (u.name || '').toLowerCase();
    const matchSearch = !_mpSearch || name.includes(_mpSearch.toLowerCase());
    const matchFilter =
      _mpActiveFilter === 'all'       ? true :
      _mpActiveFilter === 'host'      ? m.role === 'host' :
      _mpActiveFilter === 'confirmed' ? m.status === 'confirmed' :
      _mpActiveFilter === 'noshow'    ? m.status === 'noshow' : true;
    return matchSearch && matchFilter;
  });

  const rows = filtered.length === 0
    ? `<tr><td colspan="7" style="padding:30px;text-align:center;color:#aaa;font-size:13px;">해당하는 멤버가 없어요</td></tr>`
    : filtered.map(m => {
        const u       = m.user || {};
        const isOwner = m.role === 'host';
        const joinedAt = m.joinedAt
          ? new Date(m.joinedAt).toLocaleDateString('ko-KR', {year:'numeric', month:'numeric', day:'numeric'})
          : '-';
        const statusBadge = m.status === 'confirmed'
          ? '<span style="padding:2px 8px;border-radius:12px;background:#dcfce7;color:#15803d;font-size:12px;">참가확정</span>'
          : m.status === 'noshow'
            ? '<span style="padding:2px 8px;border-radius:12px;background:#fee2e2;color:#dc2626;font-size:12px;">노쇼</span>'
            : '<span style="padding:2px 8px;border-radius:12px;background:#fef9c3;color:#ca8a04;font-size:12px;">대기중</span>';

        return `
          <tr style="border-bottom:1px solid #f0f0f0;">
            <td style="padding:10px 12px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:28px;height:28px;border-radius:50%;
                  background:${isOwner ? '#3b82f6' : '#e5e7eb'};
                  color:${isOwner ? '#fff' : '#555'};
                  display:flex;align-items:center;justify-content:center;
                  font-size:12px;font-weight:600;flex-shrink:0;">
                  ${(u.name || '?').charAt(0)}
                </div>
                <div>
                  <div style="font-size:13px;font-weight:600;">${u.name || '멤버'}</div>
                  <div style="font-size:11px;color:#aaa;">${u.tel || ''}</div>
                </div>
              </div>
            </td>
            <td style="padding:10px 8px;">
              <span style="padding:2px 8px;border-radius:12px;font-size:12px;
                background:${isOwner ? '#dbeafe' : '#f3f4f6'};
                color:${isOwner ? '#1d4ed8' : '#555'};">
                ${isOwner ? '모임장' : '일반'}
              </span>
            </td>
            <td style="padding:10px 8px;">${statusBadge}</td>
            <td style="padding:10px 8px;font-size:12px;color:#555;">
              ${u.gender === 'male' ? '남성' : u.gender === 'female' ? '여성' : '-'}
            </td>
            <td style="padding:10px 8px;font-size:12px;color:#555;">${u.age ? u.age + '세' : '-'}</td>
            <td style="padding:10px 8px;font-size:12px;color:#aaa;">${joinedAt}</td>
            <td style="padding:10px 8px;">
              ${isHost && !isOwner ? `
                <button onclick="mpManageMember('${crewId}','${u._id}','${u.name || '멤버'}')"
                  style="width:28px;height:28px;border-radius:50%;border:1px solid #e5e7eb;
                    background:#fff;color:#555;font-size:14px;cursor:pointer;
                    display:flex;align-items:center;justify-content:center;">
                  👤
                </button>` : ''}
            </td>
          </tr>`;
      }).join('');

  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
      <div class="popup-sport">${crew.sportKr || ''}</div>
      ${statusPill}
    </div>
    <div class="popup-title" style="margin-bottom:4px;">${crew.title}</div>
    <div style="font-size:13px;color:#aaa;margin-bottom:16px;">
      📍 ${crew.address?.state} ${crew.address?.city}
      &nbsp;·&nbsp; ⏰ ${crew.meetAt ? new Date(crew.meetAt).toLocaleString('ko-KR') : '미정'}
    </div>
    ${topTabs}${stats}${tabs}${filterBar}
    <div style="overflow-x:auto;border-radius:10px;border:1px solid #f0f0f0;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8f8f8;border-bottom:1px solid #eee;">
            ${['멤버','역할','상태','성별','나이','가입일','관리'].map(h =>
              `<th style="padding:8px 12px;font-size:11px;color:#aaa;font-weight:600;text-align:left;">${h}</th>`
            ).join('')}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${isHost ? `
      <div style="margin-top:16px;">
        <button onclick="deleteCrew('${crewId}')"
          style="padding:10px 20px;border-radius:8px;border:1px solid #fca5a5;
            background:#fff5f5;color:#ef4444;font-size:13px;font-weight:600;cursor:pointer;">
          🗑 모임 삭제
        </button>
      </div>` : ''}
  `;
}

// 탭 전환
window.mpSetTopTab = (tab) => { _mpTopTab = tab; renderMemberPopupBody(); };
window.mpSetTab    = (tab) => { _mpActiveTab = tab; _mpActiveFilter = 'all'; renderMemberPopupBody(); };
window.mpSetFilter = (f)   => { _mpActiveFilter = f; renderMemberPopupBody(); };
window.mpSetSearch = (val) => { _mpSearch = val; renderMemberPopupBody(); };

// 신청 수락/거절
window.mpJoinProcess = async (appId, action, crewId) => {
  try {
    const res    = await fetch(`/instant/join/${appId}/${action}`, { method: 'POST' });
    const result = await res.json();
    if (result.success) showMemberPopup(crewId);
    else alert(result.message || '처리 실패');
  } catch (e) { alert('서버 오류'); }
};

// 관리 버튼 — 액션 모달 열기
window.mpManageMember = (crewId, userId, userName) => {
  _maCrewId = crewId;
  _maUserId = userId;
  document.getElementById('ma-name').textContent = userName;
  document.getElementById('ma-sub').textContent  = '멤버 관리';
  document.getElementById('member-action-modal').classList.add('show');
};

function closeMemberPopup() {
  document.getElementById('member-popup').classList.remove('show');
}

// 모임 삭제
window.deleteCrew = async (crewId) => {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  try {
    const res    = await fetch(`/instant/delete/${crewId}`, { method: 'POST' });
    const result = await res.json();
    if (result.success) { closeMemberPopup(); location.reload(); }
    else alert(result.message || '삭제 실패');
  } catch (e) { alert('서버 오류'); }
};

// ── SORT TABS ──
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
      const parse = str => str.replace('명','').split('/').map(Number);
      const [aCur] = parse(a.dataset.members);
      const [bCur] = parse(b.dataset.members);
      return bCur - aCur;
    });
  }

  items.forEach(item => container.appendChild(item));
  renderCrewList();
}

// ── 지도 필터 ──
function filterToggle(btn, type) {
  document.querySelectorAll('.map-filter-chip').forEach(c => c.classList.remove('on'));
  btn.classList.add('on');

  kakaoMap.getMarkers().forEach(marker => {
    const crew    = marker._crewData;
    const visible = type === 'all' || crew.sport === type;
    marker.setMap(visible ? window.MAP : null);
  });
}

// ── DOMContentLoaded ──
document.addEventListener('DOMContentLoaded', async () => {
  const pageData = JSON.parse(document.getElementById('page-data').textContent);
  crewsData  = pageData.crews;
  isLoggedIn = pageData.isLoggedIn;
  myCrewIds  = pageData.myCrewIds || [];

  await kakaoMap.loadMapByGPS();
  const crewsWithLocation = crewsData.filter(c => c.lat && c.lng);

  await kakaoMap.loadMarker(
    crewsWithLocation.map(c => ({
      ...c,
      onClick: () => {
        if (isLoggedIn && myCrewIds.includes(String(c.id))) {
          showMemberPopup(c.id);
        } else {
          showMapPopup(c);
        }
      }
    }))
  );

  renderCrewList();

  document.querySelectorAll('.map-item').forEach(item => {
    item.addEventListener('click', () => {
      const crew = crewsData.find(c => c.id == item.dataset.id);
      if (!crew) return;
      if (isLoggedIn && myCrewIds.includes(String(crew.id))) {
        showMemberPopup(crew.id);
      } else {
        showMapPopup(crew);
      }
    });
  });

  document.querySelectorAll('.map-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => filterToggle(chip, chip.dataset.filter));
  });

  document.querySelectorAll('.map-sort-tab').forEach(tab => {
    tab.addEventListener('click', () => setSortTab(tab, tab.textContent.trim()));
  });

  // 비회원 팝업 닫기
  const mapPopupEl = document.getElementById('map-popup');
  if (mapPopupEl) mapPopupEl.addEventListener('click', e => { if (e.target === mapPopupEl) closeMapPopup(); });
  document.getElementById('popup-close-btn')?.addEventListener('click', closeMapPopup);
  document.getElementById('popup-close-btn2')?.addEventListener('click', closeMapPopup);

  // 멤버 팝업 닫기
  const memberPopupEl = document.getElementById('member-popup');
  if (memberPopupEl) memberPopupEl.addEventListener('click', e => { if (e.target === memberPopupEl) closeMemberPopup(); });
  document.getElementById('mp-close-btn')?.addEventListener('click', closeMemberPopup);

  // 멤버 관리 액션 모달
  const actionModal = document.getElementById('member-action-modal');
  if (actionModal) actionModal.addEventListener('click', e => { if (e.target === actionModal) actionModal.classList.remove('show'); });

  document.getElementById('ma-noshow-btn')?.addEventListener('click', async () => {
    document.getElementById('member-action-modal').classList.remove('show');
    try {
      const res    = await fetch(`/instant/list/${_maCrewId}/noshow/${_maUserId}`, { method: 'POST' });
      const result = await res.json();
      if (result.success) showMemberPopup(_maCrewId);
      else alert(result.message || '노쇼 처리 실패');
    } catch (e) { alert('서버 오류'); }
  });

  document.getElementById('ma-kick-btn')?.addEventListener('click', async () => {
    document.getElementById('member-action-modal').classList.remove('show');
    try {
      const res    = await fetch(`/instant/list/${_maCrewId}/kick/${_maUserId}`, { method: 'POST' });
      const result = await res.json();
      if (result.success) showMemberPopup(_maCrewId);
      else alert(result.message || '강퇴 실패');
    } catch (e) { alert('서버 오류'); }
  });

  document.getElementById('ma-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('member-action-modal').classList.remove('show');
  });

  document.getElementById('btn-create-match')?.addEventListener('click', () => {
    if (!isLoggedIn) { window.location.href = '/user/login'; return; }
    window.location.href = '/instant/create';
  });
});