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
    const intro = Array.from((m.intro || '').replace(/\s+/g, ' ').trim());
    const introPreview = intro.length ? intro.slice(0, 50).join('') + (intro.length > 50 ? '...' : '') : '아직 크루 소개가 등록되지 않았어요. 상세 정보를 확인해 보세요.';
    const remaining = Math.max(0, m.total - m.current);
    card.innerHTML = `<article class="spotlight-card" aria-label="${escape(m.title)}">
      <header class="spotlight-cover">
        <div class="spotlight-cover-top"><span>TOGETHER CLUB / ${escape(m.sportLabel)}</span><span class="spotlight-status">${escape(m.pillLabel)}</span></div>
        <div class="spotlight-identity"><img class="spotlight-icon" src="${escape(m.profileImage || '/images/reg-crew/profile/default-profile-image.jpg')}" alt="${escape(m.title)}"><div><p>${escape(m.district)} · 정기 모임</p><h3>${escape(m.title)}</h3></div></div>
      </header>
      <div class="spotlight-content">
        <dl class="spotlight-facts">${[['모이는 날', m.schedule], ['참가 비용', m.fee], ['참여 수준', m.level], ['가입 방식', m.approval]].map(([label, value]) => `<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>
        <div class="spotlight-intro-heading"><h4>우리 크루를 소개해요</h4><span>ABOUT OUR CREW</span></div>
        <a class="spotlight-intro" href="/regular/list/${encodeURIComponent(m.id)}" aria-label="${escape(m.title)} 소개와 상세 정보 보기">${escape(introPreview)}<span class="spotlight-intro-more">소개 더 보기 ↗</span></a>
        <footer class="spotlight-footer"><div class="spotlight-capacity"><div><strong>${escape(m.current)}<span> / ${escape(m.total)}명 함께하는 중</span></strong><span>${remaining ? `${remaining}자리 남았어요` : '현재 정원이 찼어요'}</span></div><div class="spotlight-progress"><span style="width:${Math.max(0, Math.min(100, Number(m.fillPct) || 0))}%"></span></div></div><a class="spotlight-detail" href="/regular/list/${encodeURIComponent(m.id)}">모임 자세히 보기 <span>↗</span></a></footer>
      </div>
    </article>`;
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
