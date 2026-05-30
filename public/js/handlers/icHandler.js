import kakaoMap from '../modules/mapLoader.js';

let crewsData = [];
let isLoggedIn = false;

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)     return '방금 전';
  if (diff < 3600)   return Math.floor(diff / 60) + '분 전';
  if (diff < 86400)  return Math.floor(diff / 3600) + '시간 전';
  return Math.floor(diff / 86400) + '일 전';
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

  // 카카오맵 초기화 및 마커 로드
  await kakaoMap.loadMapByGPS();
  const crewsWithLocation = crewsData.filter(c => c.lat && c.lng);
  await kakaoMap.loadMarker(
    crewsWithLocation.map(c => ({ ...c, onClick: () => showMapPopup(c) }))
  );

  // 매칭 카드 클릭 → 팝업
  document.querySelectorAll('.map-item').forEach(item => {
    item.addEventListener('click', () => {
      const crew = crewsData.find(c => c.id == item.dataset.id);
      if (crew) showMapPopup(crew);
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
      window.location.href = "/user/login";
      return;
    }
    window.location.href = "/instant/create";
  });
  console.log(crewsData.map(c => c.sport));
});