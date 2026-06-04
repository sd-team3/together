const CONSTANTS = window.CONSTANTS;
// 받은 api 한글로 변경하는 함수들
function getSportText(sport) {
  return CONSTANTS.SPORTS[sport]?.kr || sport;
}
function getDayText(day) {
  const days = Array.isArray(day) ? day : [day];

  return days
    .map((item) => CONSTANTS.DAYS[item]?.short || item)
    .join(', ');
}
function getAgeText(ageRange) {
  const ages = Array.isArray(ageRange) ? ageRange : [ageRange];

  return ages
    .map((ageValue) => {
      const age = Object.values(CONSTANTS.AGES).find((item) => item.v === ageValue);
      return age ? age.kr : ageValue;
    })
    .join(', ');
}
// 재구성한 화면에 필요한 요소들
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
// escape 해주기
function escapeHTML(value) {
  if (value === null || value === undefined) return '';

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// 필터 클릭하면 api 요청하기
// 보낸 api로 화면 재구성
function renderRegularCards(regularCrews) {
  const cardList = document.querySelector('#regularCardList');

  if (!cardList) return;

  if (!regularCrews || regularCrews.length === 0) {
    cardList.innerHTML = `
      <div class="empty-regular-list">
        조건에 맞는 정기모임이 없습니다.
      </div>
    `;
    return;
  }

  cardList.innerHTML = regularCrews.map((crew) => {
    const capacity = crew.member?.capacity || 0;
    const memberCount = crew.member?.memberList?.length || 0;
    const remain = Math.max(capacity - memberCount, 0);

    const periodText = getPeriodText(crew.period);
    const dayText = getDayText(crew.day);
    const sportText = getSportText(crew.sport);
    const ageText = getAgeText(crew.ageRange);

    const statusText = getStatusText(remain);
    const fee = Number(crew.fee || 0);
    const feeText = fee === 0 ? '무료' : `${fee.toLocaleString()}원/회`;

    return `
      <div class="reg-card">
        <div class="reg-card-head">
          <img 
            class="reg-crew-profile-img"
            src="/images/crew-profile/${escapeHTML(crew.profileImage || 'default-crew-profile.jpg')}"
            alt="정기모임 이미지"
          >

          <div>
            <div class="reg-card-title">${escapeHTML(crew.title)}</div>
            <div class="reg-card-sub">
              ${periodText} ${dayText} · 
              ${escapeHTML(crew.address?.state || '')} ${escapeHTML(crew.address?.city || '')}
            </div>
          </div>

          <span class="pill pill-warn" style="margin-left:auto">
            ${statusText}
          </span>
        </div>

        <div class="reg-card-body">
          <div class="reg-meta-row">
            <span>${sportText}</span>
            <span>💰 ${feeText}</span>
            <span>${ageText}</span>
          </div>

          <div class="reg-progress"></div>

          <div class="reg-progress-label">
            <span>${memberCount}/${capacity}명</span>
            ${
              remain > 0
                ? `<span>${remain} 자리남음</span>`
                : `<span>모집 마감</span>`
            }
          </div>
        </div>
      </div>
    `;
  }).join('');
}