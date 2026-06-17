/* 텍스트 안전 */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/*XSS 공격 방지 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ── 공용 모달 ─────────────────────────────────
let _modalCb = null;

function showModal(title, msg, cb) {
  const emojiMatch = title.match(/^(\p{Emoji})/u);
  const emoji = emojiMatch ? emojiMatch[1] : '💡';
  const rest  = title.replace(/^(\p{Emoji}\s*)/u, '');

  setText('modal-icon',  emoji);
  setText('modal-title', rest);
  document.getElementById('modal-msg').textContent = msg;

  _modalCb = cb || null;
  document.getElementById('modal').classList.add('show');
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
  _modalCb = null;
}

// ── 페이지 이동 (SPA 내부) ────────────────────
function goPage(p) {
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const pg = document.getElementById('page-' + p);
  if (pg) pg.classList.add('active');

  document.querySelector('.main')?.scrollTo(0, 0);

  const pageGroup = { 'map-create': 'map', 'regular-create': 'regular', 'trade-sell': 'trade' };
  const activeKey = pageGroup[p] || p;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === activeKey);
  });

  if (p === 'map') {
    setTimeout(() => {
      initLeafletMap();
      leafletMap?.invalidateSize();
    }, 50);
  }
}

// ── 지도 팝업 ─────────────────────────────────
function showMapPopup(data) {
  setText('pp-sport',   data.emoji);
  setText('pp-title',   data.title);
  setText('pp-loc',     '📍 ' + data.addr);
  setText('pp-time',    '⏰ ' + data.time);
  setText('pp-members', '👥 ' + data.members);
  setText('pp-level',   data.level);
  setText('pp-price',   data.price);
  document.getElementById('map-popup').classList.add('show');
}

function closeMapPopup() {
  document.getElementById('map-popup').classList.remove('show');
}

// ── 필터 헬퍼 ─────────────────────────────────
function toggleFilter(el) {
  el.closest('[data-filter-group]')
    ?.querySelectorAll('.map-filter-chip')
    .forEach(c => c.classList.remove('on'));
  el.classList.add('on');
}

function setFilter(el) {
  el.closest('.filter-section')
    ?.querySelectorAll('.filter-item')
    .forEach(i => i.classList.remove('active'));
  el.classList.add('active');
}



function regFilter(type) {
  document.querySelectorAll('.reg-card').forEach(card => {
    const f = card.dataset.filter || '';
    card.style.display = (type === 'all' || f.includes(type)) ? '' : 'none';
  });
}

// 정기모임 검색
function searchRegCards() {
  const sport    = document.getElementById('qs-sport')?.value.trim()    || '';
  const district = document.getElementById('qs-district')?.value.trim() || '';
  const keyword  = document.getElementById('qs-keyword')?.value.trim()  || '';

  let found = 0;
  document.querySelectorAll('.reg-card').forEach(card => {
    const matchSport    = !sport    || card.dataset.sport    === sport;
    const matchDistrict = !district || (card.dataset.district || '').includes(district);
    const matchKeyword  = !keyword  || (card.dataset.title   || '').includes(keyword);

    const show = matchSport && matchDistrict && matchKeyword;
    card.style.display = show ? '' : 'none';
    if (show) found++;
  });

  let emptyEl = document.getElementById('reg-empty-msg');
  if (!emptyEl) {
    emptyEl = document.createElement('div');
    emptyEl.id = 'reg-empty-msg';
    emptyEl.style.cssText = 'grid-column:1/-1;text-align:center;padding:40px 0;color:var(--text-3);font-size:14px';
    emptyEl.textContent = '조건에 맞는 모임이 없어요 🥲';
    document.querySelector('.regular-grid')?.appendChild(emptyEl);
  }
  emptyEl.style.display = found === 0 ? '' : 'none';
}

// ── Leaflet 지도 ──────────────────────────────
let leafletMap     = null;
let leafletMarkers = [];
let leafletMatches = [];

try {
  const raw = document.getElementById('app-data')?.textContent;
  if (raw) leafletMatches = JSON.parse(raw);
} catch (e) {
  console.error('지도 데이터 파싱 오류:', e);
}

function makeLeafletIcon(emoji, color) {
  const safeColor = escapeHtml(color);
  const safeEmoji = escapeHtml(emoji);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 44 52">
    <path d="M22 0C10 0 1 9 1 21c0 16 21 31 21 31s21-15 21-31C43 9 34 0 22 0z"
          fill="${safeColor}" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>
    <text x="22" y="27" text-anchor="middle" dominant-baseline="middle" font-size="18">${safeEmoji}</text>
  </svg>`;
  return L.divIcon({ html: svg, iconSize: [44, 52], iconAnchor: [22, 52], className: '' });
}

function buildLeafletPopup(m) {
  const div = document.createElement('div');
  div.style.cssText = "font-family:'DM Sans',sans-serif;min-width:200px;padding:4px 0";

  const title = document.createElement('div');
  title.style.cssText = 'font-size:15px;font-weight:700;margin-bottom:6px';
  title.textContent = m.emoji + ' ' + m.title;

  const addr = document.createElement('div');
  addr.style.cssText = 'font-size:12px;color:#666;margin-bottom:3px';
  addr.textContent = '📍 ' + m.addr;

  const time = document.createElement('div');
  time.style.cssText = 'font-size:12px;color:#666;margin-bottom:3px';
  time.textContent = '⏰ ' + m.time;

  const members = document.createElement('div');
  members.style.cssText = 'font-size:12px;color:#666;margin-bottom:3px';
  members.textContent = '👥 ' + m.members + ' · ' + m.level;

  const fee = document.createElement('div');
  fee.style.cssText = 'font-size:13px;font-weight:700;margin-top:8px;color:' + m.color;
  fee.textContent = '💰 ' + m.fee;

  const btn = document.createElement('button');
  btn.style.cssText = 'margin-top:10px;width:100%;padding:7px;background:#111;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer';
  btn.textContent = '참가 신청하기';
  btn.addEventListener('click', () => showMapPopup(m));

  div.append(title, addr, time, members, fee, btn);
  return div;
}

function initLeafletMap() {
  if (leafletMap) return;

  leafletMap = L.map('leaflet-map', { zoomControl: false }).setView([37.5350, 127.0050], 13);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(leafletMap);

  const myIcon = L.divIcon({
    html: `<div style="width:14px;height:14px;background:#C8FF00;border:2px solid #111;border-radius:50%;box-shadow:0 0 0 8px rgba(200,255,0,.25)"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7], className: ''
  });
  L.marker([37.5447, 127.0461], { icon: myIcon }).addTo(leafletMap)
    .bindTooltip('📍 내 위치');

  L.control.zoom({ position: 'topright' }).addTo(leafletMap);

  leafletMatches.forEach(m => {
    const marker = L.marker([m.lat, m.lng], { icon: makeLeafletIcon(m.emoji, m.color) })
      .addTo(leafletMap)
      .bindPopup(buildLeafletPopup(m), { maxWidth: 240 });
    marker._sportEmoji = m.emoji;
    leafletMarkers.push(marker);
  });
}

function leafletFilterToggle(type) {
  leafletMarkers.forEach((marker, i) => {
    const m = leafletMatches[i];
    const show = type === 'all' || m.emoji === type;
    if (show && !leafletMap.hasLayer(marker)) marker.addTo(leafletMap);
    if (!show && leafletMap.hasLayer(marker)) leafletMap.removeLayer(marker);
  });
}

// 카드 HTML 생성 함수 (새로 추가)
function renderRegCards(meetings) {
  const grid = document.querySelector('.regular-grid');
  if (!grid) return;

  grid.innerHTML = ''; // 기존 카드 전부 지우기

  if (meetings.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px 0;
                  color:var(--text-3);font-size:14px">
        조건에 맞는 모임이 없어요 🥲
      </div>`;
    return;
  }

  meetings.forEach(m => {
    const card = document.createElement('div');
    // data 속성들 (모달용)
    card.className = 'reg-card';
    card.dataset.modalTitle = `${m.emoji} ${m.title}`;
    card.dataset.modalBody  = m.modalBody;
    card.dataset.sport      = m.emoji;
    card.dataset.district   = m.district;
    card.dataset.title      = m.title;
    card.innerHTML = `
      <div class="reg-card-head">
        <div class="reg-sport-icon">${m.emoji}</div>
        <div>
          <div class="reg-card-title">${m.title}</div>
          <div class="reg-card-sub">${m.district}</div>
        </div>
        <span class="pill pill-${m.pillType}" style="margin-left:auto">
          ${m.pillLabel}
        </span>
      </div>
      <div class="reg-card-body">
        <div class="reg-meta-row">
          <span>🗓️ ${m.schedule}</span>
          <span>💰 ${m.fee}</span>
          <span>📊 ${m.level}</span>
        </div>
        <div class="reg-progress">
          <div class="reg-progress-fill" style="width:${m.fillPct}%"></div>
        </div>
        <div class="reg-progress-label">
          <span>${m.current}/${m.total}명</span>
          <span>${m.total - m.current}자리 남음</span>
        </div>
      </div>`;

    // 카드 클릭 → 모달
    card.addEventListener('click', () => {
      showModal(card.dataset.modalTitle, card.dataset.modalBody, () =>
        showModal('✅ 신청 완료!', '모임 참가 신청이 완료되었습니다!')
      );
    });

    grid.appendChild(card);
  });
}

// API 호출 함수 (새로 추가)
async function fetchAndRenderMeetings(sportKey = '') {
  const grid = document.querySelector('.regular-grid');
  if (grid) grid.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-3)">불러오는 중...</div>';

  try {
    const url = sportKey
      ? `/api/regular-meetings?sport=${sportKey}`
      : `/api/regular-meetings`;

    const res  = await fetch(url);
    const data = await res.json();

    if (data.ok) renderRegCards(data.meetings);
  } catch (err) {
    console.error('모임 불러오기 실패:', err);
    if (grid) grid.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-3)">불러오기에 실패했어요 😢</div>';
  }
}

// filterSport
function filterSport(el) {
  document.querySelectorAll('.sport-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');

  const sportKey = el.dataset.sportKey || ''; // 영문 키 ('soccer' 등), 전체면 ''
  fetchAndRenderMeetings(sportKey);
}
//번개모임

// ── DOMContentLoaded ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  goPage('home');

  setText('stat-instant-count', leafletMatches.length);

  // data-href: 실제 페이지 이동 (서버 라우트)
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-href]');
    if (el) window.location.href = el.dataset.href;
  });

  // data-goto: SPA 내부 이동
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => goPage(btn.dataset.goto));
  });

  // 종목 칩
 document.querySelectorAll('.sport-chip').forEach(chip => {
  chip.addEventListener('click', (e) => {
    e.stopPropagation();
    filterSport(chip);
  });
});

  // 정기모임 카드 클릭 → 모달
  document.querySelectorAll('.reg-card').forEach(card => {
  card.addEventListener('click', (e) => {
    e.stopPropagation();
    const title = card.dataset.modalTitle || '';
    const body  = card.dataset.modalBody  || '';
    showModal(title, body, () =>
      showModal('✅ 신청 완료!', '모임 참가 신청이 완료되었습니다!')
    );
  });
});
  


  

  // 정기모임 필터 칩
  document.querySelectorAll('.reg-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.reg-filter-chip').forEach(c => c.classList.remove('on'));
      chip.classList.add('on');
      regFilter(chip.dataset.type || 'all');
    });
  });

  // 지도 팝업
  document.getElementById('map-popup')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeMapPopup();
  });
  document.getElementById('btn-close-map-popup')?.addEventListener('click', closeMapPopup);
  document.getElementById('btn-popup-join')?.addEventListener('click', () => {
    closeMapPopup();
    showModal('🎉 참가 신청 완료!', '매칭에 참가 신청이 완료되었습니다! 당일 30분 전 알림을 드립니다.');
  });
  document.getElementById('btn-popup-share')?.addEventListener('click', closeMapPopup);

  // 공용 모달
  document.getElementById('modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-ok-btn')?.addEventListener('click', () => {
    closeModal();
    _modalCb?.();
  });

  // 커뮤니티 탭
  document.querySelectorAll('.comm-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      const group = this.closest('.comm-tabs');
      if (group) group.querySelectorAll('.comm-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // 지도 필터 칩
  document.querySelectorAll('.map-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.map-filter-chip').forEach(c => c.classList.remove('on'));
      chip.classList.add('on');
      leafletFilterToggle(chip.dataset.sport || 'all');
    });
  });

  
  // Quick Search
  // 버튼 클릭
document.getElementById('qs-search-btn')?.addEventListener('click', searchRegCards);

// 엔터키
['qs-district', 'qs-keyword'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') searchRegCards();
  });
});

  ['qs-district', 'qs-keyword'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') searchRegCards();
    });
  });

  

});
//랭킹(테스트용)
document.getElementById('btn-my-rank')?.addEventListener('click', () => {
  showModal(
    '🏆 내 랭킹',
    '현재  랭킹 12위입니다!'
  );
});
// 현재 필요없음.
// showMapPopup
// closeMapPopup
// makeLeafletIcon
// buildLeafletPopup
// initLeafletMap
// leafletFilterToggle
// leafletMap
// leafletMarkers
// leafletMatches