import kakaoMap from '../modules/mapLoader.js';

let crewsData = [];
let isLoggedIn = false;
let myCrewIds = []; // ✅ 전역으로 이동

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)     return '방금 전';
  if (diff < 3600)   return Math.floor(diff / 60) + '분 전';
  if (diff < 86400)  return Math.floor(diff / 3600) + '시간 전';
  return Math.floor(diff / 86400) + '일 전';
}

// ✅ 내 모임/다른 모임 섹션 분리 함수
function renderCrewList() {
  const container = document.querySelector('.map-list-items');
  const items = [...container.querySelectorAll('.map-item')];

  if (myCrewIds.length === 0) return;

  const myItems = items.filter(item => myCrewIds.includes(item.dataset.id));
  const otherItems = items.filter(item => !myCrewIds.includes(item.dataset.id));

  container.innerHTML = '';

  if (myItems.length > 0) {
    const myHeader = document.createElement('div');
    myHeader.style.cssText = `padding:8px 18px;font-size:11px;font-weight:700;letter-spacing:1px;
      text-transform:uppercase;color:var(--text-3);background:var(--bg);border-bottom:1px solid var(--border);`;
    myHeader.textContent = '⚡ 내 모임';
    container.appendChild(myHeader);
    myItems.forEach(item => container.appendChild(item));
  }

  if (otherItems.length > 0) {
    const otherHeader = document.createElement('div');
    otherHeader.style.cssText = `padding:8px 18px;font-size:11px;font-weight:700;letter-spacing:1px;
      text-transform:uppercase;color:var(--text-3);background:var(--bg);
      border-bottom:1px solid var(--border);border-top:1px solid var(--border);`;
    otherHeader.textContent = '🏃 다른 모임';
    container.appendChild(otherHeader);
    otherItems.forEach(item => container.appendChild(item));
  }
}

// ── MAP POPUP ──
function showMapPopup(data) {
  document.getElementById('pp-sport').textContent = data.sportKr;

  const isFull = data.current >= data.capacity;
  const isAlmost = !isFull && (data.current / data.capacity) >= 0.8;
  const statusEl = document.getElementById('pp-status');
  if (isFull) {
    statusEl.className = 'pill pill-closed'; statusEl.textContent = '마감';
  } else if (isAlmost) {
    statusEl.className = 'pill pill-warn'; statusEl.textContent = '마감임박';
  } else {
    statusEl.className = 'pill pill-open'; statusEl.textContent = '참가가능';
  }

  const acceptEl = document.getElementById('pp-accept');
  acceptEl.className = 'tag tag-outline';
  acceptEl.textContent = data.isAutoAccept ? '⚡ 자동수락' : '✋ 수동수락';

  document.getElementById('pp-title').textContent = data.title;
  document.getElementById('pp-intro').textContent = data.intro || '';
  document.getElementById('pp-loc').textContent = '📍 ' + data.state + ' ' + data.city;
  document.getElementById('pp-members').textContent = '👥 ' + data.current + '/' + data.capacity + '명';
  document.getElementById('pp-host-av').textContent = data.host.charAt(0);
  document.getElementById('pp-host').textContent = data.host;
  document.getElementById('pp-reputation').textContent = data.avgReputation > 0 ? '⭐ ' + data.avgReputation.toFixed(1) : '평점 없음';
  document.getElementById('pp-time').textContent =
    '⏰ ' + (data.meetAt ? new Date(data.meetAt).toLocaleString('ko-KR') : '미정') +
    '  🕐 ' + timeAgo(data.createdAt);

  const applyBtn = document.getElementById('popup-apply-btn');
  applyBtn.dataset.crewId = data.id;

  if (isFull) {
    applyBtn.textContent = '마감';
    applyBtn.disabled = true;
  } else {
    applyBtn.textContent = '참가 신청';
    applyBtn.disabled = false;
    applyBtn.onclick = async () => {
      if (!isLoggedIn) {
        window.location.href = '/user/login';
        return;
      }
      try {
        const res = await fetch(`/crew/instant/${data.id}/apply`, { method: 'POST' });
        const result = await res.json();
        if (result.success) {
          alert('참가 신청이 완료됐습니다!');
          closeMapPopup();
        } else {
          alert(result.message || '신청에 실패했습니다');
        }
      } catch (e) {
        alert('서버 오류가 발생했습니다');
      }
    };
  }

  document.getElementById('map-popup').classList.add('show');
}

function closeMapPopup() {
  document.getElementById('map-popup').classList.remove('show');
}

// ── SORT TABS ──
function setSortTab(el, type) {
  el.closest('.map-sort-tabs').querySelectorAll('.map-sort-tab').forEach(t => t.classList.remove('on'));
  el.classList.add('on');

  const container = document.querySelector('.map-list-items');
  const items = [...container.querySelectorAll('.map-item')];

  if (type === '시간순') {
    items.sort((a, b) => {
      const aCrew = crewsData.find(c => String(c.id) === a.dataset.id);
      const bCrew = crewsData.find(c => String(c.id) === b.dataset.id);
      return new Date(bCrew.createdAt) - new Date(aCrew.createdAt);
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
  renderCrewList(); // ✅ 정렬 후 섹션 재적용
}

// ── 지도 필터 ──
function filterToggle(btn, type) {
  document.querySelectorAll('.map-filter-chip').forEach(c => c.classList.remove('on'));
  btn.classList.add('on');

  kakaoMap.getMarkers().forEach(marker => {
    const crew = marker._crewData;
    const visible = type === 'all' || crew.sport === type;
    marker.setMap(visible ? window.MAP : null);
  });
}

// ── DOMContentLoaded ──
document.addEventListener('DOMContentLoaded', async () => {
  const pageData = JSON.parse(document.getElementById('page-data').textContent);
  crewsData = pageData.crews;
  isLoggedIn = pageData.isLoggedIn;
  myCrewIds = pageData.myCrewIds || []; 

  await kakaoMap.loadMapByGPS();
  const crewsWithLocation = crewsData.filter(c => c.lat && c.lng);
  // 카카오맵 초기화 및 마커 로드
  await kakaoMap.loadMarker(
    crewsWithLocation.map(c => ({
        ...c,
        onClick: () => {
            const isMyCrew = myCrewIds.includes(String(c.id));
            if (isLoggedIn && isMyCrew) {
                window.location.href = `/instant/list/${c.id}`;
            } else {
                showMapPopup(c);
            }
        }
    }))
  );

  renderCrewList();

  // 매칭 카드 클릭
  document.querySelectorAll('.map-item').forEach(item => {
    item.addEventListener('click', () => {
        const crew = crewsData.find(c => c.id == item.dataset.id);
        if (!crew) return;

        const isMyCrew = myCrewIds.includes(String(crew.id));
        if (isLoggedIn && isMyCrew) {
            window.location.href = `/instant/list/${crew.id}`;
        } else {
            showMapPopup(crew);
        }
    });
  });

  // 지도 필터 칩
  document.querySelectorAll('.map-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => filterToggle(chip, chip.dataset.filter));
  });

  // 정렬 탭
  document.querySelectorAll('.map-sort-tab').forEach(tab => {
    tab.addEventListener('click', () => setSortTab(tab, tab.textContent.trim()));
  });

  // 맵 팝업 닫기
  const mapPopupEl = document.getElementById('map-popup');
  if (mapPopupEl) mapPopupEl.addEventListener('click', e => { if (e.target === mapPopupEl) closeMapPopup(); });
  document.getElementById('popup-close-btn')?.addEventListener('click', closeMapPopup);
  document.getElementById('popup-close-btn2')?.addEventListener('click', closeMapPopup);

  document.getElementById('btn-create-match')?.addEventListener('click', () => {
    if (!isLoggedIn) {
      window.location.href = '/user/login';
      return;
    }
    window.location.href = '/instant/create';
  });
});