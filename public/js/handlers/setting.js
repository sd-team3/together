/* =====================================================
   유틸
===================================================== */
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove('show'), 2000);
}

/* =====================================================
   공용 모달
===================================================== */
let _modalCb = null;

function showModal(title, msg, cb) {
  const emojiMatch = title.match(/^(\p{Emoji})/u);
  const emoji = emojiMatch ? emojiMatch[1] : '💡';
  const rest  = title.replace(/^(\p{Emoji}\s*)/u, '');

  document.getElementById('modal-icon').textContent  = emoji;
  document.getElementById('modal-title').textContent = rest;
  document.getElementById('modal-msg').innerHTML     = msg;

  _modalCb = cb;
  document.getElementById('modal-ok-btn').onclick = cb
    ? () => { closeModal(); cb(); }
    : closeModal;

  document.getElementById('modal').classList.add('show');
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

/* =====================================================
   1:1 문의 모달
===================================================== */
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

/* =====================================================
   FAQ 모달
===================================================== */
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

/* =====================================================
   설정 저장 (토글·셀렉트 공통)
===================================================== */
function saveSetting(key, value) {
  console.log('[설정 저장]', key, ':', value);
  showToast('설정이 저장되었습니다.');
}

/* =====================================================
   다크모드
===================================================== */
function toggleDarkMode(on) {
  document.body.classList.toggle('dark', on);
  showToast(on ? '다크 모드가 켜졌습니다.' : '라이트 모드로 전환됐습니다.');
}

/* =====================================================
   로그아웃 / 회원탈퇴
===================================================== */
function confirmLogout() {
  showModal('👋 로그아웃', '정말 로그아웃 하시겠습니까?', () => {
    window.location.href = '/user/logout';
  });
}

function confirmWithdraw() {
  showModal(
    '⚠️ 회원 탈퇴',
    '탈퇴하면 모든 데이터가 영구 삭제되며 복구할 수 없습니다.<br><br>정말 탈퇴하시겠습니까?',
    () => { window.location.href = '/user/delete'; }
  );
}

/* =====================================================
   이벤트 등록
===================================================== */
document.addEventListener('DOMContentLoaded', () => {

  // ── 토글 스위치 ──
  document.getElementById('priv-history').addEventListener('change', function () {
    saveSetting('priv-history', this.checked);
  });
  document.getElementById('priv-manner').addEventListener('change', function () {
    saveSetting('priv-manner', this.checked);
  });
  document.getElementById('priv-location').addEventListener('change', function () {
    saveSetting('priv-location', this.checked);
  });
  document.getElementById('app-darkmode').addEventListener('change', function () {
    toggleDarkMode(this.checked);
  });

  // ── 셀렉트 ──
  document.getElementById('priv-profile').addEventListener('change', function () {
    saveSetting('priv-profile', this.value);
  });
  document.getElementById('app-lang').addEventListener('change', function () {
    saveSetting('app-lang', this.value);
  });

  // ── 계정 관리 행 ──
  document.getElementById('btn-change-pw').addEventListener('click', () => {
    window.location.href = '/user/verify-password';
  });
  document.getElementById('btn-social-accounts').addEventListener('click', () => {
    showModal('💬 연결된 소셜 계정', '카카오 계정 연결됨<br>구글 계정 연결됨', null);
  });
  document.getElementById('btn-terms').addEventListener('click', () => {
    showModal('📋 서비스 이용약관', '이용약관 내용은 웹사이트를 참조해주세요.', null);
  });
  document.getElementById('btn-privacy').addEventListener('click', () => {
    showModal('🛡️ 개인정보 처리방침', '개인정보 처리방침 내용은 웹사이트를 참조해주세요.', null);
  });

  // ── 고객센터 행 ──
  document.getElementById('btn-inquiry').addEventListener('click', openInquiryModal);
  document.getElementById('btn-faq').addEventListener('click', openFaqModal);
  document.getElementById('btn-notice').addEventListener('click', () => {
    showModal('📣 공지사항', '서비스 점검 및 업데이트 소식은<br>공지사항에서 확인하실 수 있습니다.', null);
  });

  // ── 위험 영역 ──
  document.getElementById('btn-logout').addEventListener('click', confirmLogout);
  document.getElementById('btn-withdraw').addEventListener('click', confirmWithdraw);

  // ── 공용 모달 버튼 ──
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // ── 문의 모달 버튼 ──
  document.getElementById('inquiry-cancel-btn').addEventListener('click', closeInquiryModal);
  document.getElementById('inquiry-submit-btn').addEventListener('click', submitInquiry);
  document.getElementById('inquiry-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeInquiryModal();
  });

  // ── FAQ 모달 버튼 ──
  document.getElementById('faq-close-btn').addEventListener('click', closeFaqModal);
  document.getElementById('faq-to-inquiry-btn').addEventListener('click', () => {
    closeFaqModal();
    openInquiryModal();
  });
  document.getElementById('faq-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeFaqModal();
  });

  // ── FAQ 아이템 토글 ──
  document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('click', () => toggleFaq(item));
  });

});
