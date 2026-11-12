(() => {
  const navigation = document.getElementById('site-navigation');
  const toggle = document.querySelector('.mobile-menu-toggle');
  const close = document.querySelector('.mobile-menu-close');
  const backdrop = document.querySelector('.mobile-nav-backdrop');
  const main = document.querySelector('body > .main');
  const mobile = window.matchMedia('(max-width: 768px)');
  if (!navigation || !toggle || !close || !backdrop) return;

  function setOpen(open, restoreFocus = true) {
    open = mobile.matches && open;
    document.body.classList.toggle('mobile-menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    backdrop.hidden = !open;
    navigation.inert = mobile.matches && !open;
    if (main) main.inert = open;
    if (open) close.focus();
    else if (restoreFocus && mobile.matches) toggle.focus();
  }

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  close.addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));

  navigation.addEventListener('click', event => {
    if (!event.target.closest('.community-toggle') && event.target.closest('a, .nav-item, .user-chip')) setOpen(false);
  });

  document.addEventListener('keydown', event => {
    if (!document.body.classList.contains('mobile-menu-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
    if (event.key === 'Tab') {
      const items = [...navigation.querySelectorAll('a[href], button, [tabindex="0"]')]
        .filter(item => !item.disabled && item.getClientRects().length);
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  
  mobile.addEventListener('change', () => setOpen(false, false));
  setOpen(false, false);
})();
