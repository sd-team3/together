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