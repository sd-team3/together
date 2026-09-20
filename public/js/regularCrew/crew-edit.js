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

  // 크루장이 아니면 crew-edit-area 자체가 없음
  if (!editArea) return;

  function openEditArea() {
    editArea.style.display = 'block';

    editArea.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  function closeEditArea() {
    editArea.style.display = 'none';
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

    formData.append('title', title);
    formData.append('intro', intro);
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
      saveBtn.textContent = '💾 변경사항 저장';
    }
  }
});