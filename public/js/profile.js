// ── 프로필 모달 ──
function openProfileModal(name, img, meta, score) {
  document.getElementById('profileModalName').textContent = name;
  document.getElementById('profileModalImg').src = img || '/images/user-profile/default-profile-image.jpg';
  document.getElementById('profileModalMeta').textContent = meta;
  document.getElementById('profileModalScore').textContent = score || 0;
  document.getElementById('profileDropdown').style.display = 'none';
  const el = document.getElementById('modalProfile');
  el.style.display = 'flex';
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeProfileModal() {
  const el = document.getElementById('modalProfile');
  el.classList.remove('open');
  el.style.display = 'none';
  document.body.style.overflow = '';
}
function toggleProfileMenu(e) {
  e.stopPropagation();
  const dd = document.getElementById('profileDropdown');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}
function profileAction(action) {
  document.getElementById('profileDropdown').style.display = 'none';
  const msgs = {
    report: '🚨 신고가 접수되었습니다',
    block: '🚫 차단되었습니다',
    message: '💬 쪽지를 보냈습니다',
    kick: '👢 강퇴되었습니다',
    friend: '👋 친구 요청을 보냈습니다',
  };
  showToast(msgs[action] || '처리되었습니다');
  if (action === 'kick') closeProfileModal();
}
document.addEventListener('click', () => {
  const dd = document.getElementById('profileDropdown');
  if (dd) dd.style.display = 'none';
});

// 프로필 모달 예시는 crewManage.ejs 368번째 줄 참고
// <script src="/js/profile.js"></script> 필수