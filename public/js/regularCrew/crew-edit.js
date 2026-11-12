document.addEventListener('DOMContentLoaded', () => {
  const editArea =
    document.getElementById('crew-edit-area');

  const headerEditBtn =
    document.getElementById('crew-edit-btn');

  const footerEditBtn =
    document.getElementById('footer-edit-btn');

  const cancelBtn =
    document.getElementById('crew-edit-cancel-btn');

  const saveBtn =
    document.getElementById('crew-save-btn');

  if (!editArea) return;

  const editBlocks = [...editArea.querySelectorAll('[data-crew-edit-block]')];
  editBlocks.forEach(block => {
    document.querySelector(`[data-crew-edit-slot="${block.dataset.crewEditBlock}"]`).append(block);
  });
  const readViews = [...document.querySelectorAll('.crew-read-view')];

  const profileInput = document.getElementById('crew-profile-input');
  const profilePreview = document.getElementById('crew-profile-preview');
  const profileMessage = document.getElementById('crew-profile-message');
  const originalProfile = profilePreview.src;
  let previewUrl = null;

  function resetProfile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    profileInput.value = '';
    profilePreview.src = originalProfile;
    profileMessage.textContent = '';
  }

  document.getElementById('crew-profile-reset').addEventListener('click', resetProfile);
  
  profileInput.addEventListener('change', () => {
    const file = profileInput.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      resetProfile();
      profileMessage.textContent = '5MB 이하의 JPG·PNG·WebP 사진을 선택해주세요.';
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    profilePreview.src = previewUrl;
    profileMessage.textContent = '';
  });

  function openEditArea() {
    editArea.style.display = 'block';
    editBlocks.forEach(block => { block.hidden = false; });
    readViews.forEach(view => { view.hidden = true; });
    if (footerEditBtn) footerEditBtn.hidden = true;
    document.querySelector('[data-crew-edit-slot="profile"]').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  function closeEditArea() {
    resetProfile();
    editArea.style.display = 'none';
    editBlocks.forEach(block => { block.hidden = true; });
    readViews.forEach(view => { view.hidden = false; });
    if (footerEditBtn) footerEditBtn.hidden = false;
  }

  headerEditBtn?.addEventListener(
    'click',
    openEditArea
  );

  footerEditBtn?.addEventListener(
    'click',
    openEditArea
  );

  cancelBtn?.addEventListener(
    'click',
    closeEditArea
  );

  saveBtn?.addEventListener(
    'click',
    saveCrew
  );

  window.toggleChip = function (button) {
    button.classList.toggle('on');
  };

  window.selectSingle = function (button, group) {
    document
      .querySelectorAll(`[data-group="${group}"]`)
      .forEach(item => {
        item.classList.remove('on');
      });

    button.classList.add('on');
  };

  async function saveCrew() {
    const crewId = editArea.dataset.crewId;

    const title =
      document.getElementById('crewTitle').value.trim();

    const intro =
      document.getElementById('crewIntro').value.trim();

    const capacity = Number(
      document.getElementById('capacity').value
    );

    const fee = Number(
      document.getElementById('fee').value
    );

    const detail =
      document.getElementById('detail').value.trim();

    if (!title) {
      alert('크루 이름을 입력해주세요.');
      return;
    }

    if (
      !Number.isInteger(capacity) ||
      capacity < 2 ||
      capacity > 50
    ) {
      alert('최대 인원은 2명에서 50명 사이여야 합니다.');
      return;
    }

    if (!Number.isFinite(fee) || fee < 0) {
      alert('참가비를 올바르게 입력해주세요.');
      return;
    }

    const selectedDays = Array.from(
      document.querySelectorAll('#day .chip.on')
    ).map(button => button.dataset.val);

    const selectedAges = Array.from(
      document.querySelectorAll('#ageRange .chip.on')
    ).map(button => button.dataset.val);

    const acceptButton =
      document.querySelector('#autoAccept .chip.on');

    if (!acceptButton) {
      alert('가입 승인 방식을 선택해주세요.');
      return;
    }

    const formData = new FormData();
    if (profileInput.files[0]) formData.append('uploadFile', profileInput.files[0]);

    formData.append('title', title);
    formData.append('intro', intro);
    const introEditor = document.querySelector('[data-crew-edit-slot="intro"] .crew-intro-editor');
    if (introEditor?.dataset.uploading === 'true') {
      alert('사진 업로드가 끝난 뒤 저장해주세요.');
      return;
    }
    const blocksInput = introEditor?.querySelector('.intro-blocks-data');
    if (blocksInput && !blocksInput.disabled) formData.append('introBlocks', blocksInput.value);
    formData.append('member.capacity', capacity);
    formData.append('fee', fee);
    formData.append('address.detail', detail);

    formData.append(
      'sport',
      document.getElementById('sport').value
    );

    formData.append(
      'period',
      document.getElementById('period').value
    );

    formData.append(
      'level',
      document.getElementById('level').value
    );

    if (selectedDays.length === 0) {
      formData.append('day', 'none');
    } else {
      selectedDays.forEach(day => {
        formData.append('day', day);
      });
    }

    if (selectedAges.length === 0) {
      formData.append('ageRange', 'all');
    } else {
      selectedAges.forEach(age => {
        formData.append('ageRange', age);
      });
    }

    formData.append(
      'isAutoAccept',
      acceptButton.dataset.val === 'auto'
    );

    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';

    try {
      const response = await fetch(
        `/regular/manage/${crewId}/update`,
        {
          method: 'POST',
          body: formData
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(
          result.message ||
          '크루 정보 수정에 실패했습니다.'
        );
        return;
      }

      alert('크루 정보가 수정되었습니다.');
      window.location.reload();
    } catch (error) {
      console.error('크루 수정 오류:', error);
      alert('크루 정보 수정 중 오류가 발생했습니다.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '변경사항 저장';
    }
  }
});
