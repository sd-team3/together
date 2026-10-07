(function () {
  const MIN_REVIEW_COUNT = 3;
  const REQUEST_TIMEOUT_MS = 45000;

  const summaryEl = document.getElementById('reviewSummary');

  if (!summaryEl) return;

  const crewId = summaryEl.dataset.crewId;
  const totalReviewCount = Number(summaryEl.dataset.reviewCount) || 0;

  if (!crewId || totalReviewCount < MIN_REVIEW_COUNT) return;

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);

    if (className) element.className = className;
    if (text != null) element.textContent = text;

    return element;
  }

  function clearSummary() {
    summaryEl.replaceChildren();
  }

  function renderLoading() {
    clearSummary();

    const state = createElement('div', 'review-summary-state');
    state.setAttribute('role', 'status');

    const content = createElement('div');
    const loader = createElement('span', 'review-summary-loader');
    loader.setAttribute('aria-hidden', 'true');

    content.append(
      loader,
      createElement('strong', '', '후기 내용을 분석하고 있어요.')
    );
    state.appendChild(content);
    summaryEl.appendChild(state);
  }

  function renderInsufficient(message) {
    clearSummary();

    const state = createElement('div', 'review-summary-state');
    const content = createElement('div');

    content.append(
      createElement('strong', '', '✨ AI 요약 준비 중'),
      createElement(
        'p',
        '',
        message || '후기가 3개 이상 모이면 핵심 내용을 요약해드려요.'
      )
    );
    state.appendChild(content);
    summaryEl.appendChild(state);
  }

  function createPointList(title, points, modifierClass) {
    const section = createElement(
      'section',
      `review-summary-point ${modifierClass}`
    );
    section.appendChild(createElement('h4', '', title));

    if (!Array.isArray(points) || points.length === 0) {
      section.appendChild(
        createElement('p', '', '여러 후기에서 공통된 내용이 확인되지 않았어요.')
      );
      return section;
    }

    const list = createElement('ul');

    points.forEach(point => {
      const item = createElement('li');
      item.append(
        createElement('strong', '', point.topic),
        document.createTextNode(` ${point.detail}`)
      );
      list.appendChild(item);
    });

    section.appendChild(list);
    return section;
  }

  function renderSummary(summary) {
    clearSummary();

    const header = createElement('div', 'review-summary-header');
    const title = createElement('h3', 'review-summary-title', '✨ AI 후기 요약');
    const analyzedCount = Number(summary.reviewCount) || totalReviewCount;
    const averageScore = Number(summary.averageScore);
    const countLabel = analyzedCount < totalReviewCount
      ? `최근 ${analyzedCount}개 후기 기준`
      : `후기 ${analyzedCount}개 기준`;
    const scoreLabel = Number.isFinite(averageScore)
      ? ` · 평균 ${averageScore.toFixed(1)}`
      : '';

    header.append(
      title,
      createElement(
        'span',
        'review-summary-meta',
        `${countLabel}${scoreLabel}`
      )
    );

    const summaryText = createElement(
      'p',
      'review-summary-text',
      summary.summary
    );
    const tags = createElement('div', 'review-summary-tags');

    (summary.keywords || []).forEach(keyword => {
      tags.appendChild(
        createElement('span', 'review-summary-tag', `#${keyword}`)
      );
    });

    const points = createElement('div', 'review-summary-points');
    points.append(
      createPointList('좋았던 점', summary.pros, 'is-positive'),
      createPointList('아쉬웠던 점', summary.cons, 'is-negative')
    );

    const notes = createElement('div', 'review-summary-notes');

    if (summary.caution) {
      notes.appendChild(
        createElement('p', 'review-summary-caution', summary.caution)
      );
    }

    notes.appendChild(
      createElement(
        'p',
        'review-summary-disclaimer',
        'AI가 참여 후기 내용을 요약한 결과이며, 개인마다 경험이 다를 수 있어요.'
      )
    );

    summaryEl.append(header, summaryText);
    if (tags.childElementCount > 0) summaryEl.appendChild(tags);
    summaryEl.append(points, notes);
  }

  function renderError() {
    clearSummary();

    const state = createElement('div', 'review-summary-state is-error');
    const content = createElement('div');
    const retryButton = createElement(
      'button',
      'review-summary-retry',
      '다시 시도'
    );

    retryButton.type = 'button';
    retryButton.addEventListener('click', loadSummary);

    content.append(
      createElement('strong', '', '요약을 불러오지 못했어요.'),
      createElement('p', '', '후기 목록은 정상적으로 확인할 수 있어요.'),
      retryButton
    );
    state.appendChild(content);
    summaryEl.appendChild(state);
  }

  async function loadSummary() {
    renderLoading();

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch(
        `/regular/review/${encodeURIComponent(crewId)}/summary`,
        {
          headers: { Accept: 'application/json' },
          signal: controller.signal
        }
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || '후기 요약 요청 실패');
      }

      if (!result.summary) {
        renderInsufficient(result.message);
        return;
      }

      renderSummary(result.summary);
    } catch (error) {
      console.error('AI 후기 요약 조회 오류:', error);
      renderError();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  loadSummary();
})();
