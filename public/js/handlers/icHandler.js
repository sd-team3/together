let crewsData = [];
let isLoggedIn = false;
function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)         return '방금 전';
  if (diff < 3600)       return Math.floor(diff / 60) + '분 전';
  if (diff < 86400)      return Math.floor(diff / 3600) + '시간 전';
  return Math.floor(diff / 86400) + '일 전';
}
// ── MAP POPUP ──
function showMapPopup(data) {
  // 종목
  document.getElementById('pp-sport').textContent = data.sportKr;

  // 상태 뱃지
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

  // 자동/수동 수락
  const acceptEl = document.getElementById('pp-accept');
  acceptEl.className = 'tag tag-outline';
  acceptEl.textContent = data.isAutoAccept ? '⚡ 자동수락' : '✋ 수동수락';

  // 제목, 소개글
  document.getElementById('pp-title').textContent = data.title;
  document.getElementById('pp-intro').textContent = data.intro || '';

  // 위치, 인원
  document.getElementById('pp-loc').textContent = '📍 ' + data.state + ' ' + data.city;
  document.getElementById('pp-members').textContent = '👥 ' + data.current + '/' + data.capacity + '명';

  // 호스트
  document.getElementById('pp-host-av').textContent = data.host.charAt(0);
  document.getElementById('pp-host').textContent = data.host;
  document.getElementById('pp-reputation').textContent = data.avgReputation > 0 ? '⭐ ' + data.avgReputation.toFixed(1) : '평점 없음';

  // 등록 시간
  document.getElementById('pp-time').textContent = '🕐 ' + timeAgo(data.createdAt);

  document.getElementById('map-popup').classList.add('show');

  const applyBtn = document.getElementById('popup-apply-btn');
  applyBtn.dataset.crewId = data.id;
  if(isFull){
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
function setSortTab(el) {
  el.closest('.map-sort-tabs').querySelectorAll('.map-sort-tab').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
}

// ── LEAFLET MAP ──
let leafletMap = null;
let leafletMarkers = [];

function makeLeafletIcon(emoji, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 44 52">
    <path d="M22 0C10 0 1 9 1 21c0 16 21 31 21 31s21-15 21-31C43 9 34 0 22 0z" fill="${color}" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>
    <text x="22" y="27" text-anchor="middle" dominant-baseline="middle" font-size="18">${emoji}</text>
  </svg>`;
  return L.divIcon({ html: svg, iconSize: [44,52], iconAnchor: [22,52], popupAnchor: [0,-54], className: '' });
}

const sportColor = {
  futsal: '#1A5CFF', basketball: '#FF6B00', badminton: '#00C8D4',
  running: '#00C853', tennis: '#FF3B30', etc: '#9B59B6'
};

function initLeafletMap() {
  if (leafletMap) return;
  leafletMap = L.map('leaflet-map', { zoomControl: false }).setView([37.5350, 127.0050], 13);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    subdomains: 'abcd', maxZoom: 19
  }).addTo(leafletMap);

  L.control.zoom({ position: 'topright' }).addTo(leafletMap);

  // // lat/lng 있는 crew만 마커 표시
  // crewsData.forEach(c => {
  //   if (!c.lat || !c.lng) return;
  //   const emoji = c.sportKr || c.sport;
  //   const color = sportColor[c.sport] || '#999';
  //   const marker = L.marker([c.lat, c.lng], { icon: makeLeafletIcon(emoji, color) })
  //     .addTo(leafletMap);
  //   marker._crewData = c;
  //   marker.on('click', () => showMapPopup(c));
  //   leafletMarkers.push(marker);
  // });
}

// ── 지도 필터 ──
function leafletFilterToggle(btn, type) {
  document.querySelectorAll('.map-filter-chip').forEach(c => c.classList.remove('on'));
  btn.classList.add('on');
  leafletMarkers.forEach(marker => {
    const c = marker._crewData;
    if (type === 'all' || c.sport === type) {
      if (!leafletMap.hasLayer(marker)) marker.addTo(leafletMap);
    } else {
      if (leafletMap.hasLayer(marker)) leafletMap.removeLayer(marker);
    }
  });
}

// ── DOMContentLoaded ──
document.addEventListener('DOMContentLoaded', () => {
  const pageData = JSON.parse(document.getElementById('page-data'). textContent);
  crewsData = pageData.crews;
  isLoggedIn = pageData.isLoggedIn;
  initLeafletMap();

  // 매칭 카드 클릭 → 팝업
  document.querySelectorAll('.map-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const crew = crewsData.find(c => c.id == id);
      if (crew) showMapPopup(crew);
    });
  });

  // 지도 필터 chip
  document.querySelectorAll('.map-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => leafletFilterToggle(chip, chip.dataset.filter));
  });

  // 정렬 탭
  document.querySelectorAll('.map-sort-tab').forEach(tab => {
    tab.addEventListener('click', () => setSortTab(tab));
  });

  // 맵 팝업 닫기
  const mapPopupEl = document.getElementById('map-popup');
  if (mapPopupEl) mapPopupEl.addEventListener('click', e => { if (e.target === mapPopupEl) closeMapPopup(); });
  document.getElementById('popup-close-btn')?.addEventListener('click', closeMapPopup);
  document.getElementById('popup-close-btn2')?.addEventListener('click', closeMapPopup);

  // // 참가 신청 버튼 (추후 실제 API 연결)
  // document.getElementById('popup-apply-btn')?.addEventListener('click', async () => {
  //   if(!isLoggedIn) {
  //     window.location.href = '/user/login';
  //     return;
  //   }
  //   const crewId = document.getElementById('popup-apply-btn').dataset.crewId;
  //   if(!crewId) return;

  //   try {
  //     const res = await fetch(`/crew/instant/${crewId}/apply`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json'}
  //     });
  //     const result = await res.json();
  //     console.log(result.message); // 일단 콘솔에 명시, 추후에 바꿀 예정
  //     if(result.success){
  //       closeMapPopup();
  //       location.reload();
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).send('서버 오류가 발생했습니다.');
  //   }
  // });

  document.getElementById('btn-create-match')?.addEventListener('click', () => {
    if(!isLoggedIn) {
      window.location.href = "/user/login";
      return;
    }
    window.location.href = "/crew/instant-create";
  });
});