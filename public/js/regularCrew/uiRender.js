import { selectedFilters } from './state.js';

const CONSTANTS = window.CONSTANTS;

function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getSportText(sport) { return CONSTANTS.SPORTS[sport]?.kr || sport; }

function getDayText(day) {
  const days = Array.isArray(day) ? day : [day];
  return days.map(item => CONSTANTS.DAYS[item]?.short || item).join(', ');
}
function getAgeText(ageRange) {
  const ages = Array.isArray(ageRange) ? ageRange : [ageRange];
  return ages.map(ageValue => {
    const age = Object.values(CONSTANTS.AGES).find(item => item.v === ageValue);
    return age ? age.kr : ageValue;
  }).join(', ');
}
function getPeriodText(period) {
  if (period === 'week') return '매주';
  if (period === '2week') return '격주';
  if (period === 'month') return '매월';
  return '';
}
function getStatusText(remain) {
  if (remain === 0) return '마감';
  if (remain < 4) return '마감 임박';
  return '모집 중';
}

// 카드 리스트 렌더링 함수 내보내기
export function renderRegularCards(regularCrews) {
  const cardList = document.querySelector('#regularCardList');
  if (!cardList) return;

  if (!regularCrews || regularCrews.length === 0) {
    cardList.innerHTML = `<div class="empty-regular-list">조건에 맞는 정기모임이 없습니다.</div>`;
    return;
  }

  cardList.innerHTML = regularCrews.map((crew) => {
    const capacity = crew.member?.capacity || 0;
    const memberCount = crew.member?.memberList?.length || 0;
    const remain = Math.max(capacity - memberCount, 0);

    const feeText = crew.fee === 0 ? '무료' : `${Number(crew.fee).toLocaleString()}원/회`;

    return `
      <div class="reg-card">
        <div class="reg-card-head">
          <img class="reg-crew-profile-img" src="/images/crew-profile/${escapeHTML(crew.profileImage || 'default-crew-profile.jpg')}" alt="정기모임 이미지">
          <div>
            <div class="reg-card-title">${escapeHTML(crew.title)}</div>
            <div class="reg-card-sub">${getPeriodText(crew.period)} ${getDayText(crew.day)} · ${escapeHTML(crew.address?.state || '')} ${escapeHTML(crew.address?.city || '')}</div>
          </div>
          <span class="pill pill-warn" style="margin-left:auto">${getStatusText(remain)}</span>
        </div>
        <div class="reg-card-body">
          <div class="reg-meta-row">
            <span>${getSportText(crew.sport)}</span>
            <span>💰 ${feeText}</span>
            <span>${getAgeText(crew.ageRange)}</span>
          </div>
          <div class="reg-progress"></div>
          <div class="reg-progress-label">
            <span>${memberCount}/${capacity}명</span>
            ${remain > 0 ? `<span>${remain} 자리남음</span>` : `<span>모집 마감</span>`}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 📌 선택된 필터 칩 렌더링 함수 (추가)
export function renderSelectedChips() {
  const panel = document.getElementById('reg-filter-panel');
  if (!panel) return;

  let chipsHTML = '';

  const getKor = (type, val) => {
    if (type === 'day') return CONSTANTS.DAYS[val]?.short || val;
    if (type === 'sport') return CONSTANTS.SPORTS[val]?.kr || val;
    if (type === 'ageRange') return Object.values(CONSTANTS.AGES).find(a => a.v === val)?.kr || val;
    return val;
  };

  ['day', 'sport', 'ageRange'].forEach(type => {
    selectedFilters[type].forEach(val => {
      chipsHTML += `
        <div class="filter-chip">
          ${getKor(type, val)}
          <button type="button" class="chip-remove-btn" data-type="${type}" data-value="${val}">✕</button>
        </div>`;
    });
  });

  if (selectedFilters.city) {
    chipsHTML += `
      <div class="filter-chip">
        ${selectedFilters.state} ${selectedFilters.city}
      </div>`;
  }

  panel.innerHTML = chipsHTML;
  panel.style.display = chipsHTML ? 'flex' : 'none';
}

// 페이징 렌더링 함수 내보내기
export function renderRegularPaging(currentPage, totalPage) {
  const pagination = document.getElementById('regularPagination');
  if (!pagination) return;
  
  let html = '';
  
  if (currentPage > 1) {
    html += `<li class="page-item"><button type="button" class="page-link" data-page="${currentPage - 1}">이전</button></li>`;
  }
  
  for (let i = 1; i <= totalPage; i++) {
    html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
               <button type="button" class="page-link" data-page="${i}">${i}</button>
             </li>`;
  }
  
  if (currentPage < totalPage) {
    html += `<li class="page-item"><button type="button" class="page-link" data-page="${currentPage + 1}">다음</button></li>`;
  }
  
  pagination.innerHTML = html;
}