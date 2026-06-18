const stateSelect = document.getElementById('stateSelect');
const citySelect = document.getElementById('citySelect');
const AREAS = JSON.parse(stateSelect.dataset.areas);

stateSelect.addEventListener('change', ()=>{
    const citys = AREAS[stateSelect.value] || [];
    const options = citys.map(city=>{
        return `<option value="${city}">${city}</option>`;
    }).join(' ');

    citySelect.innerHTML = `<option value="">시/군/구</option>` + options;
});

const profileInput = document.getElementById('profile-input');
const profileReset = document.getElementById('profile-reset');
const removeImage = document.getElementById('removeImage');
const profileImage = document.getElementById('profileImage');

const filePath = '/images/reg-crew/profile/';

profileInput.addEventListener('change', (e)=>{
  const file = e.target.files[0];

  if (file) {
    if (file.size > 5 * 1024 * 1024) {
        alert('5MB 이하의 이미지 파일만 가능합니다.');
        e.target.value = '';
        return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
        alert('이미지 파일(jpg, jpeg, png, webp)만 업로드 가능합니다.');
        e.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = (event)=>{
      profileImage.src = event.target.result;
    };

    reader.readAsDataURL(file);
  }
});

profileReset.addEventListener('click', () => {
  const fileName = profileImg.src.split('/').pop();
  if(fileName !== 'default-profile-image.png') {
    removeImage.value = filePath + fileName;
  } else {
    removeImage.value = false;
  }

  profileInput.value = '';
  profileImage.src = filePath + 'default-profile-image.png';
});