(() => {
  const toggle = document.querySelector('.community-toggle');
  const menu = document.getElementById('community-submenu');
  if (!toggle || !menu) return;
  const setOpen = open => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    toggle.querySelector('.community-toggle-sign').textContent = open ? '−' : '+';
  };
  const active = location.pathname.startsWith('/community');
  const sport = new URLSearchParams(location.search).get('sport') || '';
  setOpen(active);
  toggle.classList.toggle('active', active);
  if (active) menu.querySelectorAll('a').forEach(link => {
    if (link.dataset.sport === sport) link.setAttribute('aria-current', 'page');
  });
  toggle.addEventListener('click', () => setOpen(menu.hidden));
})();
