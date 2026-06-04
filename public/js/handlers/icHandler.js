import kakaoMap from '../modules/mapLoader.js';

let crewsData = [];
let isLoggedIn = false;
let myCrewIds = [];

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
        const res    = await fetch(`/crew/instant/${data.id}/apply`, { method: 'POST' });
        const result = await res.json();
        if (result.success) { alert('참가 신청이 완료됐습니다!'); closeMapPopup(); }
        else                { alert(result.message || '신청에 실패했습니다'); }
      } catch (e) { alert('서버 오류가 발생했습니다'); }
    };
  }

  document.getElementById('map-popup').classList.add('show');
}

function closeMapPopup() {
  document.getElementById('map-popup').classList.remove('show');
}

// ── 호스트/멤버용 상세 모달 ──
async function showMemberPopup(crewId) {
  const modal = document.getElementById('member-popup');
  const body  = document.getElementById('mp-body');

  // 로딩 표시
  body.innerHTML = '<div style="padding:40px;text-align:center;color:#aaa;">불러오는 중...</div>';
  modal.classList.add('show');

  try {
    const res  = await fetch(`/instant/api/${crewId}`);
    const data = await res.json();
    if (!data.success) { body.innerHTML = '<div style="padding:40px;text-align:center;color:#f00;">불러오기 실패</div>'; return; }

    const crew        = data.crew;
    const memberList  = crew.member.memberList;
    const pendingList = crew.member.pendingList || [];
    const confirmed   = memberList.filter(m => m.status === 'confirmed');
    const isHost      = data.isHost;

    // 통계 카드
    const stats = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px;">
        ${[
          ['전체 참여자', memberList.length, '#222'],
          ['참가 확정',   confirmed.length,  '#22c55e'],
          [`모집 현황`,   `${memberList.length} / ${crew.member.capacity}`, '#3b82f6'],
          ['신청 대기',   pendingList.length, '#f97316']
        ].map(([label, val, color]) => `
          <div style="background:#f8f8f8;border-radius:10px;padding:12px 8px;text-align:center;">
            <div style="font-size:11px;color:#aaa;margin-bottom:4px;">${label}</div>
            <div style="font-size:20px;font-weight:700;color:${color};">${val}</div>
          </div>`).join('')}
      </div>`;

    // 멤버 테이블
    const rows = memberList.map(m => {
      const u       = m.user || {};
      const isOwner = m.role === 'host';
      const joinedAt = m.createdAt ? new Date(m.createdAt).toLocaleDateString('ko-KR', {month:'numeric',day:'numeric'}) : '-';
      return `
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:10px 12px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:28px;height:28px;border-radius:50%;background:${isOwner ? '#3b82f6' : '#e5e7eb'};
                color:${isOwner ? '#fff' : '#555'};display:flex;align-items:center;justify-content:center;
                font-size:12px;font-weight:600;flex-shrink:0;">
                ${(u.name || '?').charAt(0)}
              </div>
              <div>
                <div style="font-size:13px;font-weight:600;">${u.name || '멤버'}</div>
                <div style="font-size:11px;color:#aaa;">${u.tel || ''}</div>
              </div>
            </div>
          </td>
          <td style="padding:10px 8px;font-size:12px;">
            <span style="padding:2px 8px;border-radius:12px;background:${isOwner ? '#dbeafe' : '#f3f4f6'};
              color:${isOwner ? '#1d4ed8' : '#555'};">${isOwner ? '모임장' : '일반'}</span>
          </td>
          <td style="padding:10px 8px;font-size:12px;">
            <span style="padding:2px 8px;border-radius:12px;background:#dcfce7;color:#15803d;">참가확정</span>
          </td>
          <td style="padding:10px 8px;font-size:12px;color:#555;">${u.gender === 'male' ? '남성' : u.gender === 'female' ? '여성' : '-'}</td>
          <td style="padding:10px 8px;font-size:12px;color:#555;">${u.age ? u.age + '세' : '-'}</td>
          <td style="padding:10px 8px;font-size:12px;color:#aaa;">${joinedAt}</td>
          <td style="padding:10px 8px;">
            ${isHost && !isOwner ? `
              <button onclick="kickMember('${crewId}','${u._id}')"
                style="padding:3px 10px;border-radius:6px;border:1px solid #fca5a5;
                  background:#fff5f5;color:#ef4444;font-size:11px;cursor:pointer;">
                강퇴
              </button>` : ''}
          </td>
        </tr>`;
    }).join('');

    body.innerHTML = `
      <!-- 제목 영역 -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <div class="popup-sport">${crew.sportKr || ''}</div>
        <span class="pill pill-open">참가가능</span>
      </div>
      <div class="popup-title" style="margin-bottom:4px;">${crew.title}</div>
      <div style="font-size:13px;color:#aaa;margin-bottom:16px;">
        📍 ${crew.address?.state} ${crew.address?.city}
        &nbsp;·&nbsp; ⏰ ${crew.meetAt ? new Date(crew.meetAt).toLocaleString('ko-KR') : '미정'}
      </div>

      ${stats}

      <!-- 멤버 테이블 -->
      <div style="font-size:12px;font-weight:700;color:#aaa;letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px;">참여자 목록 ${memberList.length}명</div>
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
  } catch (e) {
    body.innerHTML = '<div style="padding:40px;text-align:center;color:#f00;">오류가 발생했습니다</div>';
  }
}

function closeMemberPopup() {
  document.getElementById('member-popup').classList.remove('show');
}

// 강퇴 (멤버 팝업 안 버튼에서 호출)
window.kickMember = async (crewId, userId) => {
  if (!confirm('정말 강퇴하시겠습니까?')) return;
  try {
    const res    = await fetch(`/instant/list/${crewId}/kick/${userId}`, { method: 'POST' });
    const result = await res.json();
    if (result.success) { alert('강퇴됐습니다.'); showMemberPopup(crewId); }
    else                { alert(result.message || '강퇴 실패'); }
  } catch (e) { alert('서버 오류'); }
};

// 모임 삭제 (멤버 팝업 안 버튼에서 호출)
window.deleteCrew = async (crewId) => {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  try {
    const res    = await fetch(`/instant/delete/${crewId}`, { method: 'POST' });
    const result = await res.json();
    if (result.success) { alert('삭제됐습니다.'); closeMemberPopup(); location.reload(); }
    else                { alert(result.message || '삭제 실패'); }
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

  // 카드 클릭
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

  // 지도 필터
  document.querySelectorAll('.map-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => filterToggle(chip, chip.dataset.filter));
  });

  // 정렬 탭
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

  document.getElementById('btn-create-match')?.addEventListener('click', () => {
    if (!isLoggedIn) { window.location.href = '/user/login'; return; }
    window.location.href = '/instant/create';
  });
});