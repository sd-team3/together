(() => {
  if (localStorage.getItem('darkMode') === '1') document.body.classList.add('dark');

  const csrf = document.querySelector('meta[name="attendance-csrf"]').content;
  const message = document.getElementById('attendance-message');

  async function post(url, body = {}) {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Attendance-CSRF': csrf }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || '다시 시도해주세요.');
    return data;
  }

  let timer;
  const generate = document.getElementById('generate-qr');

  generate?.addEventListener('click', async () => {
    generate.disabled = true;
    message.textContent = 'QR을 생성하고 있어요…';

    const panel = document.getElementById('qr-panel');
    const image = document.getElementById('qr-image');
    clearInterval(timer); image.hidden = true;

    try {
      const data = await post(generate.dataset.endpoint);
      image.src = data.image; image.hidden = false; panel.hidden = false;
      message.textContent = ''; generate.textContent = '▦ QR 다시 생성';

      const countdown = () => {
        const seconds = Math.max(0, Math.ceil((new Date(data.expiresAt) - Date.now()) / 1000));
        document.getElementById('qr-timer').textContent = seconds ? `${seconds}초 후 만료` : 'QR이 만료됐어요. 다시 생성해주세요.';
        if (!seconds) { image.hidden = true; clearInterval(timer); }
      };

      countdown(); timer = setInterval(countdown, 1000);
    } catch (error) { panel.hidden = true; message.textContent = error.message; }
    finally { generate.disabled = false; }
  });

  const check = document.getElementById('check-attendance');
  const token = new URLSearchParams(location.hash.slice(1)).get('token');

  if (check && !token) { check.disabled = true; message.textContent = '모임장이 보여주는 QR을 스캔해서 접속해주세요.'; }

  check?.addEventListener('click', async () => {
    check.disabled = true; message.textContent = '출석을 확인하고 있어요…';
    
    try {
      const data = await post(check.dataset.endpoint, { token });
      message.textContent = data.alreadyAttended ? '이미 출석 완료된 활동이에요.' : '출석 완료! 오늘도 즐겁게 운동하세요.';
      check.textContent = '출석 완료';
      history.replaceState(null, '', location.pathname);
    } catch (error) {
      message.textContent = error.message; check.disabled = false; 
    }
  });
})();
