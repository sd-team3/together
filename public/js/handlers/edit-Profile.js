import { addrSearch } from '/js/modules/addrSearch.js';
import kakaoMap from '/js/modules/mapLoader.js';

function setFeedback(el, msg, type) {
if (!el) return;
el.textContent = msg;
el.className = 'feedback-text ' + (type === 'success' ? 'success' : type === 'error' ? 'error' : '');
}

function formatPhone(inp) {
let v = inp.value.replace(/\D/g, '');
if (!v.startsWith('010')) v = '010' + v.replace(/^010/, '');
if (v.length > 11) v = v.slice(0, 11);
if (v.length >= 8)      v = v.slice(0, 3) + '-' + v.slice(3, 7) + '-' + v.slice(7);
else if (v.length >= 4) v = v.slice(0, 3) + '-' + v.slice(3);
inp.value = v;
}

function checkPwStrength(pw) {
const bars = ['bar1','bar2','bar3','bar4'].map(id => document.getElementById(id));
const label = document.getElementById('pw-label');
if (!bars[0] || !label) return;
bars.forEach(b => { b.className = 'pw-bar'; });
if (!pw) { label.textContent = '비밀번호를 입력하세요'; return; }

const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
const hasNum    = /[0-9]/.test(pw);
const hasUpper  = /[A-Z]/.test(pw);
const strength =
    pw.length >= 12 && hasSpecial && (hasNum || hasUpper) ? 4 :
    pw.length >= 10 && (hasSpecial || hasNum) ? 3 :
    pw.length >= 8 ? 2 : 1;

const colors = ['', 'weak', 'weak', 'medium', 'strong'];
for (let i = 0; i < strength; i++) bars[i].classList.add(colors[strength]);
label.textContent = strength >= 4 ? '매우 강함' : strength === 3 ? '강함' : strength === 2 ? '보통' : '약함';
}

function togglePw(inputEl, btn) {
inputEl.type = inputEl.type === 'password' ? 'text' : 'password';
btn.textContent = inputEl.type === 'password' ? '👁' : '🙈';
}

/* 모달 */
let redirectAfterClose = false;

function openModal(msg, shouldRedirect = false) {
document.getElementById('modal-msg').innerText = msg;
document.getElementById('modal').style.display = 'flex';
redirectAfterClose = shouldRedirect;
}

function closeModal() {
document.getElementById('modal').style.display = 'none';
if (redirectAfterClose) window.location.href = '/user/profile';
}

/* 이미지 */
const fileInput  = document.getElementById('avatar-file');
const avatarImg  = document.getElementById('avatar-img');
const defaultImg = '/images/user-profile/default-profile-image.jpg';
let imageChanged = false;

function resetAvatar() {
avatarImg.src = defaultImg;
fileInput.value = '';
document.getElementById('removeImage').value = 'true';
imageChanged = true;
}

fileInput.addEventListener('change', (e) => {
const file = e.target.files[0];
if (!file) return;
const reader = new FileReader();
reader.onload = (ev) => { avatarImg.src = ev.target.result; };
reader.readAsDataURL(file);
document.getElementById('removeImage').value = 'false';
imageChanged = true;
});

/* 변경 항목 추적 */
const norm = (v) => (v ?? '').toString().trim();

const originalUser = {
  name  : norm(window.EDIT_PROFILE_DATA.name),
  age   : norm(window.EDIT_PROFILE_DATA.age),
  tel   : norm(window.EDIT_PROFILE_DATA.tel),
  road  : norm(window.EDIT_PROFILE_DATA.road),
  detail: norm(window.EDIT_PROFILE_DATA.detail),
};

function getChangedFields(form) {
const changes = [];
if (imageChanged)                                          changes.push('프로필 이미지');
if (norm(form.name.value)   !== originalUser.name)        changes.push('이름');
if (norm(form.age.value)    !== originalUser.age)         changes.push('나이');
if (norm(form.tel.value)    !== originalUser.tel)         changes.push('전화번호');
if (norm(form.road.value)   !== originalUser.road)        changes.push('주소');
if (norm(form.detail.value) !== originalUser.detail)      changes.push('상세주소');
if (norm(form.newPassword?.value) !== '')                 changes.push('비밀번호');
return changes;
}

/* 실시간 유효성 검사 */
// 이름
document.getElementById('name').addEventListener('input', function () {
if (!this.value) {
    this.classList.remove('input-error', 'input-success');
    setFeedback(document.getElementById('nameFeedBack'), '', '');
    return;
}
const ok = /^[가-힣]{2,9}$/.test(this.value.trim());
this.classList.toggle('input-error',   !ok);
this.classList.toggle('input-success',  ok);
setFeedback(document.getElementById('nameFeedBack'),
    ok ? '' : '이름은 2~9자 한글로 입력해주세요.', ok ? 'success' : 'error');
});

// 나이
document.getElementById('age').addEventListener('input', function () {
if (!this.value) {
    this.classList.remove('input-error', 'input-success');
    setFeedback(document.getElementById('ageFeedBack'), '', '');
    return;
}
const val = parseInt(this.value);
const ok  = !isNaN(val) && val >= 14 && val <= 99;
this.classList.toggle('input-error',   !ok);
this.classList.toggle('input-success',  ok);
setFeedback(document.getElementById('ageFeedBack'),
    ok ? '' : '나이를 올바르게 입력해주세요. (14~99세)', ok ? 'success' : 'error');
});

// 전화번호
document.getElementById('tel').addEventListener('input', function () {
if (!this.value.startsWith('010')) this.value = '010-';
formatPhone(this);
const ok = this.value.replace(/\D/g, '').length === 11;
this.classList.toggle('input-error',   !ok);
this.classList.toggle('input-success',  ok);
setFeedback(document.getElementById('telFeedBack'),
    ok ? '' : '전화번호를 올바르게 입력해주세요', ok ? 'success' : 'error');
});

// 비밀번호 강도 + 실시간 검사
const newPwInput      = document.getElementById('newPassword');
const currentPwInput  = document.getElementById('currentPassword');

if (newPwInput) {
newPwInput.addEventListener('input', function () {
    checkPwStrength(this.value);
    this.classList.remove('input-error', 'input-success');
    setFeedback(document.getElementById('newPwFeedBack'), '', '');
});
}

// 눈 모양 토글
document.querySelectorAll('.input-eye').forEach(btn => {
btn.addEventListener('click', function () {
    const input = this.closest('.input-icon-wrap').querySelector('input');
    togglePw(input, this);
});
});

// 아바타 삭제 버튼
document.getElementById('avatar-remove-btn').addEventListener('click', resetAvatar);

// 모달 확인 버튼
document.getElementById('modal-confirm-btn').addEventListener('click', closeModal);

// readonly 해제 (상세주소, 현재/새 비밀번호) — 첫 포커스 시 readonly 제거
['detail', 'currentPassword', 'newPassword'].forEach(id => {
const el = document.getElementById(id);
if (el) el.addEventListener('focus', function () { this.removeAttribute('readonly'); }, { once: true });
});

/* 폼 제출 유효성 검사*/
document.getElementById('editForm').addEventListener('submit', async (e) => {
e.preventDefault();
const form = e.target;

// 이름
const nameInput    = document.getElementById('name');
const nameFeedBack = document.getElementById('nameFeedBack');
const nameVal      = nameInput.value.trim();
if (!nameVal) {
    nameInput.classList.add('input-error');
    nameInput.classList.remove('input-success');
    setFeedback(nameFeedBack, '이름을 입력해주세요.', 'error');
    nameInput.focus();
    return;
}
if (!/^[가-힣]{2,9}$/.test(nameVal)) {
    nameInput.classList.add('input-error');
    nameInput.classList.remove('input-success');
    setFeedback(nameFeedBack, '이름은 2~9자 한글로 입력해주세요.', 'error');
    nameInput.focus();
    return;
} else {
    nameInput.classList.remove('input-error');
    nameInput.classList.add('input-success');
    setFeedback(nameFeedBack, '', 'success');
}

// 나이
const ageInput    = document.getElementById('age');
const ageFeedBack = document.getElementById('ageFeedBack');
const ageVal      = parseInt(ageInput.value);
if (!ageInput.value) {
    ageInput.classList.add('input-error');
    ageInput.classList.remove('input-success');
    setFeedback(ageFeedBack, '나이를 입력해주세요', 'error');
    ageInput.focus();
    return;
} else if (isNaN(ageVal) || ageVal < 14 || ageVal > 99) {
    ageInput.classList.add('input-error');
    ageInput.classList.remove('input-success');
    setFeedback(ageFeedBack, '올바른 나이를 입력해주세요 (14~99세)', 'error');
    ageInput.focus();
    return;
} else {
    ageInput.classList.remove('input-error');
    ageInput.classList.add('input-success');
    setFeedback(ageFeedBack, '', 'success');
}

// 전화번호
const telInput    = document.getElementById('tel');
const telFeedBack = document.getElementById('telFeedBack');
const telVal      = telInput.value.replace(/\D/g, '');
if (!telInput.value || telVal.length !== 11) {
    telInput.classList.add('input-error');
    telInput.classList.remove('input-success');
    setFeedback(telFeedBack, '전화번호를 입력해주세요', 'error');
    telInput.focus();
    return;
} else {
    telInput.classList.remove('input-error');
    telInput.classList.add('input-success');
    setFeedback(telFeedBack, '', 'success');
}

// 주소
const addrFeedBack = document.getElementById('addrFeedBack');
if (!document.getElementById('zipcode').value) {
    setFeedback(addrFeedBack, '주소 검색을 통해 주소를 입력해주세요.', 'error');
    return;
} else {
    setFeedback(addrFeedBack, '', '');
}

// 비밀번호 (로컬 계정만)
if (currentPwInput && newPwInput) {
    const currentPw        = currentPwInput.value;
    const newPw            = newPwInput.value;
    const currentFeedBack  = document.getElementById('currentPwFeedBack');
    const newFeedBack      = document.getElementById('newPwFeedBack');
    const pwRegex          = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (currentPw && !newPw) {
    newPwInput.classList.add('input-error');
    newPwInput.classList.remove('input-success');
    setFeedback(newFeedBack, '새 비밀번호를 입력해주세요.', 'error');
    newPwInput.focus();
    return;
    }

    if (!currentPw && newPw) {
    currentPwInput.classList.add('input-error');
    currentPwInput.classList.remove('input-success');
    setFeedback(currentFeedBack, '현재 비밀번호를 입력해주세요.', 'error');
    currentPwInput.focus();
    return;
    }

    if (currentPw && newPw) {
    if (currentPw === newPw) {
        newPwInput.classList.add('input-error');
        newPwInput.classList.remove('input-success');
        setFeedback(newFeedBack, '현재 비밀번호와 다른 비밀번호를 입력해주세요.', 'error');
        newPwInput.focus();
        return;
    }
    if (!pwRegex.test(newPw)) {
        newPwInput.classList.add('input-error');
        newPwInput.classList.remove('input-success');
        setFeedback(newFeedBack, '영문, 숫자, 특수문자 조합 8자 이상이어야 합니다.', 'error');
        newPwInput.focus();
        return;
    } else {
        newPwInput.classList.remove('input-error');
        newPwInput.classList.add('input-success');
        setFeedback(newFeedBack, '', 'success');
        currentPwInput.classList.remove('input-error');
        currentPwInput.classList.add('input-success');
        setFeedback(currentFeedBack, '', 'success');
    }
    }
}

/* --- 서버 전송 --- */
const changes  = getChangedFields(form);
const formData = new FormData(form);

try {
    const res  = await fetch('/user/edit-profile', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
    // 현재 비밀번호 불일치는 해당 필드 인라인 피드백으로 표시
    if (data.field === 'currentPassword') {
        const currentPwInput  = document.getElementById('currentPassword');
        const currentFeedBack = document.getElementById('currentPwFeedBack');
        if (currentPwInput) {
        currentPwInput.classList.add('input-error');
        currentPwInput.classList.remove('input-success');
        currentPwInput.focus();
        }
        setFeedback(currentFeedBack, data.message || '현재 비밀번호가 틀립니다.', 'error');
    } else {
        openModal(data.message || '저장 중 오류가 발생했습니다.');
    }
    return;
    }

    if (changes.length === 0) {
    openModal('변경된 내용이 없습니다.');
    } else {
    openModal(`변경 완료!\n(${changes.join(', ')} 수정됨)`, true);
    }

} catch (err) {
    openModal('서버 오류가 발생했습니다.');
}
});


document.getElementById('addr-btn')?.addEventListener('click', async () => {
try {
    const data = await addrSearch();
    console.log(data); // sido, sigungu 있는지 확인
    document.getElementById('zipcode').value = data.zonecode;
    document.getElementById('road').value    = data.roadAddress
        .replace(data.sido, '')
        .replace(data.sigungu, '')
        .trim();                          // ✅ 이 줄만 수정
    document.getElementById('state').value   = data.sido;
    document.getElementById('city').value    = data.sigungu;
    document.querySelector("input[name='detail']").focus();
    // 주소 피드백 초기화
    const addrFeedBack = document.getElementById('addrFeedBack');
    if (addrFeedBack) {
    addrFeedBack.textContent = '';
    addrFeedBack.className   = 'feedback-text';
    }
    await kakaoMap.loadMapByADDR(data.roadAddress);
} catch (err) {
    console.error(err);
    const addrFeedBack = document.getElementById('addrFeedBack');
    if (addrFeedBack) {
    addrFeedBack.textContent = '주소 검색 중 오류가 발생했습니다.';
    addrFeedBack.className   = 'feedback-text error';
    }
}
});
