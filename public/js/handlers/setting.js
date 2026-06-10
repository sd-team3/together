function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove('show'), 2000);
}

let _modalCb = null;

function showModal(title, msg, cb) {
  const emojiMatch = title.match(/^(\p{Emoji})/u);
  const emoji = emojiMatch ? emojiMatch[1] : '💡';
  const rest  = title.replace(/^(\p{Emoji}\s*)/u, '');

  document.getElementById('modal-icon').textContent  = emoji;
  document.getElementById('modal-title').textContent = rest;
  document.getElementById('modal-msg').innerHTML     = msg;

  _modalCb = cb;
  const okBtn = document.getElementById('modal-ok-btn');
  const newOkBtn = okBtn.cloneNode(true); // 기존 리스너 전부 제거
  okBtn.parentNode.replaceChild(newOkBtn, okBtn);

  newOkBtn.addEventListener('click', cb
    ? () => { closeModal(); cb(); }
    : closeModal
  );

  document.getElementById('modal').classList.add('show');
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

function openInquiryModal() {
  document.getElementById('inquiry-modal').classList.add('show');
}

function closeInquiryModal() {
  document.getElementById('inquiry-modal').classList.remove('show');
}

function submitInquiry() {
  const type  = document.getElementById('inquiry-type').value;
  const title = document.getElementById('inquiry-title').value.trim();
  const body  = document.getElementById('inquiry-body').value.trim();

  if (!type)  { showToast('문의 유형을 선택해주세요.'); return; }
  if (!title) { showToast('제목을 입력해주세요.'); return; }
  if (!body)  { showToast('내용을 입력해주세요.'); return; }

  closeInquiryModal();
  document.getElementById('inquiry-type').value  = '';
  document.getElementById('inquiry-title').value = '';
  document.getElementById('inquiry-body').value  = '';

  showModal('✅ 문의 접수 완료', '문의가 정상적으로 접수되었습니다.<br>가입하신 이메일로 24시간 내 답변 드리겠습니다.', null);
}

function openFaqModal() {
  document.getElementById('faq-modal').classList.add('show');
}

function closeFaqModal() {
  document.getElementById('faq-modal').classList.remove('show');
}

function toggleFaq(el) {
  const isOpen = el.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
  if (!isOpen) el.classList.add('open');
}

function saveSetting(key, value) {
  console.log('[설정 저장]', key, ':', value);
  showToast('설정이 저장되었습니다.');
}

function toggleDarkMode(on) {
  document.body.classList.toggle('dark', on);
  localStorage.setItem('darkMode', on ? '1' : '0');
  showToast(on ? '다크 모드가 켜졌습니다.' : '라이트 모드로 전환됐습니다.');
}

function confirmLogout() {
  showModal('👋 로그아웃', '정말 로그아웃 하시겠습니까?', () => {
    window.location.href = '/user/logout';
  });
}

// 탈퇴 모달 열기
function confirmWithdraw() {
  const pwEl  = document.getElementById('withdraw-pw');
  const errEl = document.getElementById('withdraw-error');
  if (pwEl)  pwEl.value = '';
  if (errEl) errEl.style.display = 'none';
  document.getElementById('withdraw-modal').classList.add('show');
}

document.addEventListener('DOMContentLoaded', () => {

  // 토글 스위치
  document.getElementById('priv-history').addEventListener('change', function () { 
      saveSetting('priv-history', this.checked); 
  });
  document.getElementById('priv-manner').addEventListener('change', function () { 
      saveSetting('priv-manner', this.checked); 
  });
  
  document.getElementById('app-darkmode').addEventListener('change', function () { toggleDarkMode(this.checked); });

  // 셀렉트
  document.getElementById('priv-profile').addEventListener('change', function () { 
      saveSetting('priv-profile', this.value); 
  });

  //다크모드
  document.getElementById('app-darkmode').checked = localStorage.getItem('darkMode') === '1';
    

  // 계정 관리
document.getElementById('btn-edit-profile')
  .addEventListener('click', () => {
    window.location.href = '/user/edit-profile';
  });

  //서비스
  document.getElementById('btn-terms').addEventListener('click', () => { showModal('📋 서비스 이용약관', '이용약관 내용은 웹사이트를 참조해주세요.', null); });
  document.getElementById('btn-privacy').addEventListener('click', () => { showModal('🛡️ 개인정보 처리방침', '개인정보 처리방침 내용은 웹사이트를 참조해주세요.', null); });

  // 고객센터
  document.getElementById('btn-inquiry').addEventListener('click', openInquiryModal);
  document.getElementById('btn-faq').addEventListener('click', openFaqModal);
  document.getElementById('btn-notice').addEventListener('click', () => { showModal('📣 공지사항', '서비스 점검 및 업데이트 소식은<br>공지사항에서 확인하실 수 있습니다.', null); });

  // 위험 영역
  document.getElementById('btn-logout').addEventListener('click', confirmLogout);
  document.getElementById('btn-withdraw').addEventListener('click', confirmWithdraw);

  // 공용 모달
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });

  // 문의 모달
  document.getElementById('inquiry-cancel-btn').addEventListener('click', closeInquiryModal);
  document.getElementById('inquiry-submit-btn').addEventListener('click', submitInquiry);
  document.getElementById('inquiry-modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeInquiryModal(); });

  // FAQ 모달
  document.getElementById('faq-close-btn').addEventListener('click', closeFaqModal);
  document.getElementById('faq-to-inquiry-btn').addEventListener('click', () => { closeFaqModal(); openInquiryModal(); });
  document.getElementById('faq-modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeFaqModal(); });
  document.querySelectorAll('.faq-item').forEach(item => { item.addEventListener('click', () => toggleFaq(item)); });

  // 탈퇴 모달
  document.getElementById('withdraw-cancel-btn').addEventListener('click', () => {
  document.getElementById('withdraw-modal').classList.remove('show');
  });
  document.getElementById('withdraw-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('withdraw-modal').classList.remove('show');
  });
  document.getElementById('withdraw-confirm-btn').addEventListener('click', async () => {
    const provider = document.getElementById('withdraw-confirm-btn').dataset.provider;
    const isSocial = provider !== 'local';

    const pw    = isSocial ? null : document.getElementById('withdraw-pw').value;
    const errEl = isSocial ? null : document.getElementById('withdraw-error');

    if (!isSocial && !pw) {
        errEl.textContent = '비밀번호를 입력해주세요.';
        errEl.style.display = 'block';
        return;
    }

    const res  = await fetch('/user/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
    });
    const data = await res.json();

    if (data.success) {
        window.location.href = '/user/login';
    } else {
        if (errEl) {
            errEl.textContent = data.message || '비밀번호가 틀렸습니다.';
            errEl.style.display = 'block';
        }
    }
});

});

async function saveSetting(key, value) {
    try {
        await fetch('/user/privacy', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
        });
        showToast('설정이 저장되었습니다.');
    } catch (err) {
        showToast('저장에 실패했습니다.');
    }
}