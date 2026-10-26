(() => {
  const root = document.querySelector('.crew-spotlight');
  if (!root) return;
  const card = root.querySelector('#crew-spotlight-card');
  const position = root.querySelector('#crew-position');
  let meetings = [], source = [], index = 0;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  function render() {
    root.querySelectorAll('[data-crew-step]').forEach(button => { button.disabled = meetings.length < 2; });
    position.textContent = meetings.length ? `${String(index + 1).padStart(2, '0')} / ${String(meetings.length).padStart(2, '0')}` : '0 / 0';
    if (!meetings.length) {
      card.innerHTML = '<div class="spotlight-empty">조건에 맞는 모임이 없어요. 다른 종목을 선택해 보세요.</div>';
      return;
    }
    const m = meetings[index];

    const colors = ['#eef6db', '#ffe4d0', '#e4edff', '#f1e6f5'];
    root.style.setProperty('--slide-bg', colors[index % colors.length]);
    const hasPhoto = m.profileImage && !m.profileImage.includes('default-profile');
    const reasonsHtml = (m.matchReasons || []).map(reason => '<span>' + escape(reason.icon) + ' ' + escape(reason.label) + '</span>').join('');
    const scoreHtml = typeof m.matchScore === 'number' ? '<div class="meeting-score">AI 추천 ' + escape(m.matchScore) + '%</div>' : '';
    card.innerHTML = `<article class="banner-slide" aria-label="${escape(m.title)}">
      <div class="banner-copy"><span class="banner-badge">${escape(m.sportLabel)} · ${escape(m.pillLabel)}</span><h3>${escape(m.title)}</h3><p>${escape(m.district)}<br>${escape(m.schedule)} · ${escape(m.level)}</p><div class="meeting-reasons">${reasonsHtml}</div>${scoreHtml}<a href="/regular/list/${encodeURIComponent(m.id)}">모임 자세히 보기 <span>↗</span></a></div>
      <div class="banner-visual"><div class="banner-placeholder"><span>${escape(m.emoji)}</span><p>함께하는 순간을 담아보세요</p></div>${hasPhoto ? `<img src="${escape(m.profileImage)}" alt="${escape(m.title)} 대표 사진">` : ''}</div>
    </article>`;
    const image = card.querySelector('img');
    image?.addEventListener('error', () => image.remove(), { once: true });
  }
  window.crewSpotlight = {
    setMeetings(items) { source = items; meetings = items; index = 0; render(); },
    filter({ sport = '', district = '', keyword = '' }) {
      meetings = source.filter(m => (!sport || m.emoji === sport) && (!district || m.district.includes(district)) && (!keyword || m.title.includes(keyword)));
      index = 0; render();
    },
    setMessage(message) { source = []; meetings = []; index = 0; render(); card.firstElementChild.textContent = message; }
  };
  function move(step) { if (meetings.length > 1) { index = (index + step + meetings.length) % meetings.length; render(); } }
  root.addEventListener('click', event => { const button = event.target.closest('[data-crew-step]'); if (button) move(Number(button.dataset.crewStep)); });
  root.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
  });
  window.crewSpotlight.setMeetings(JSON.parse(document.getElementById('crew-spotlight-data').textContent));
})();
