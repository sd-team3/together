(function () {
  const INITIAL_SIZE = 3;
  const PAGE_SIZE = 10;

  const allReviews = window.__ALL_REVIEWS__ || [];
  let renderedCount = 0;

  const listEl = document.getElementById('reviewList');
  const moreBtn = document.getElementById('reviewMoreBtn');

  if (!listEl || !moreBtn) return;

  function escapeHtml(str) {
    if (str == null) return '';

    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getProfileImage(profileImage) {
    if (!profileImage) {
      return '/images/user-profile/default-profile-image.jpg';
    }

    // 이미 전체 경로로 저장된 경우
    if (profileImage.startsWith('/')) {
      return profileImage;
    }

    // 파일명만 저장된 경우
    return `/images/user-profile/${profileImage}`;
  }

  function getDateLabel(createdAt) {
    if (!createdAt) return '';

    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  function renderReviewCard(review) {
    const rating = Math.max(
      0,
      Math.min(5, Number(review.score) || 0)
    );

    const filledCount = Math.floor(rating);
    const emptyCount = 5 - filledCount;

    const filled = '★'.repeat(filledCount);
    const empty = '★'.repeat(emptyCount);

    const author = review.author || {};
    const userName = author.name || '알 수 없는 사용자';

    const profileImage = getProfileImage(
      author.profileImage
    );

    const dateLabel = getDateLabel(
      review.createdAt
    );

    const avatarHtml = `
      <img
        src="${escapeHtml(profileImage)}"
        alt="${escapeHtml(userName)}"
        onerror="
          this.onerror=null;
          this.src='/images/user-profile/default-profile-image.jpg';
        "
      >
    `;

    const photosHtml =
      Array.isArray(review.images) && review.images.length
        ? `
          <div class="review-photos">
            ${review.images.map(image => `
              <div class="review-photo">
                <img
                  src="${escapeHtml(image)}"
                  alt="후기 이미지"
                >
              </div>
            `).join('')}
          </div>
        `
        : '';

    return `
      <div class="review-card">
        <div class="review-head">
          <div class="review-avatar">
            ${avatarHtml}
          </div>

          <div class="review-head-info">
            <div class="review-name">
              ${escapeHtml(userName)}
            </div>

            <div class="review-rating-row">
              <span class="review-stars">
                ${filled}
                <span class="review-stars-empty">
                  ${empty}
                </span>
              </span>

              <span class="review-date">
                ${escapeHtml(dateLabel)}
              </span>
            </div>
          </div>
        </div>

        ${photosHtml}

        <div class="review-text">
          ${escapeHtml(review.content)}
        </div>
      </div>
    `;
  }

  function renderNextBatch(count) {
    const nextSlice = allReviews.slice(
      renderedCount,
      renderedCount + count
    );

    listEl.insertAdjacentHTML(
      'beforeend',
      nextSlice.map(renderReviewCard).join('')
    );

    renderedCount += nextSlice.length;
    updateMoreBtn();
  }

  function updateMoreBtn() {
    moreBtn.style.display =
      renderedCount < allReviews.length
        ? 'flex'
        : 'none';
  }

  moreBtn.addEventListener('click', () => {
    renderNextBatch(PAGE_SIZE);
  });

  renderNextBatch(INITIAL_SIZE);
})();