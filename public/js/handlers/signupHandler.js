import { addrSearch } from '/js/modules/addrSearch.js';
 
document.addEventListener('DOMContentLoaded', () => {
 
    function togglePw(id, btn) {
        const inp = document.getElementById(id);
        inp.type = inp.type === 'password' ? 'text' : 'password';
        btn.textContent = inp.type === 'password' ? '👁' : '🙈';
    }
 
    function setFeedback(el, msg, type) {
        if (!el) return;
        el.textContent = msg;
        el.className = 'feedback-text ' + (type === 'success' ? 'success' : type === 'error' ? 'error' : '');
    }
 
    function setError(inputEl, feedbackEl, msg) {
        if (inputEl) {
            inputEl.classList.add('input-error');
            inputEl.classList.remove('input-success');
        }
        setFeedback(feedbackEl, msg, 'error');
    }
 
    function clearError(inputEl, feedbackEl) {
        if (inputEl) {
            inputEl.classList.remove('input-error');
        }
        setFeedback(feedbackEl, '', '');
    }
 
    function formatPhone(inp) {
        let v = inp.value.replace(/\D/g, '');
        if (!v.startsWith('010')) v = '010' + v.replace(/^010/, '');
        if (v.length >= 11) v = v.slice(0, 11);
        if (v.length >= 8) v = v.slice(0, 3) + '-' + v.slice(3, 7) + '-' + v.slice(7);
        else if (v.length >= 4) v = v.slice(0, 3) + '-' + v.slice(3);
        inp.value = v;
    }
 
    function checkPwStrength(pw) {
        const bars = [
            document.getElementById('bar1'),
            document.getElementById('bar2'),
            document.getElementById('bar3'),
            document.getElementById('bar4')
        ];
        const label = document.getElementById('pw-label');
        if (!bars[0] || !label) return;
        bars.forEach(b => { b.className = 'pw-bar'; });
        if (!pw) { label.textContent = '비밀번호를 입력하세요'; return; }
 
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
        const hasNum = /[0-9]/.test(pw);
        const hasUpper = /[A-Z]/.test(pw);
        const strength =
            pw.length >= 12 && hasSpecial && (hasNum || hasUpper) ? 4 :
            pw.length >= 10 && (hasSpecial || hasNum) ? 3 :
            pw.length >= 8 ? 2 : 1;
 
        const colors = ['weak', 'weak', 'medium', 'strong', 'strong'];
        for (let i = 0; i < strength; i++) bars[i].classList.add(colors[strength]);
        label.textContent = strength >= 4 ? '매우 강함' : strength === 3 ? '강함' : strength === 2 ? '보통' : '약함';
    }
 
    function toggleAll(cb) {
        document.querySelectorAll('.agree-check').forEach(c => c.checked = cb.checked);
    }
 
    function showToast(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2000);
    }
 
    async function searchAddress() {
        try {
            const data = await addrSearch();
            document.getElementById('zipcode').value = data.zonecode;
            document.getElementById('address').value = data.roadAddress;
            document.getElementById('state').value = data.sido;
            document.getElementById('city').value = data.sigungu;
            document.getElementById('road').value = data.roadname;
            // 주소 입력되면 에러 즉시 제거
            clearError(null, document.getElementById('addrFeedBack'));
            document.getElementById('addressDetail').focus();
            showToast('주소가 입력되었습니다. 상세 주소를 작성해주세요.');
        } catch (error) {
            showToast('주소 검색 중 오류가 발생했습니다.');
            console.log('에러 발생: ', error);
        }
    }
 
    const isSocialLogin = !document.getElementById('pw');
    const emailInput = document.getElementById('emailInput');
    const emailCheckBtn = document.getElementById('emailCheckBtn');
    const emailFeedBack = document.getElementById('emailFeedBack');
    let isChecked = false;
    let isDuplicate = false;
 
    //  제출 시 전체 validation - 에러 모두 표시
    function validateAll() {
        let hasError = false;
 
        // 이름
        const nameInput = document.getElementById('name');
        const nameRegex = /^[가-힣]{2,5}$/;
        if (!nameRegex.test(nameInput.value.trim())) {
            setError(nameInput, document.getElementById('nameFeedBack'), '이름은 2~5자 한글로 입력해주세요');
            hasError = true;
        }
 
        // 나이
        const ageInput = document.getElementById('age');
        const ageVal = parseInt(ageInput.value);
        if (!ageInput.value || isNaN(ageVal) || ageVal < 14 || ageVal > 99) {
            setError(ageInput, document.getElementById('ageFeedBack'), '나이를 올바르게 입력해주세요 (14~99세)');
            hasError = true;
        }
 
        // 전화번호
        const telInput = document.getElementById('tel');
        const telVal = telInput.value.replace(/\D/g, '');
        if (telVal.length !== 11) {
            setError(telInput, document.getElementById('telFeedBack'), '전화번호를 올바르게 입력해주세요');
            hasError = true;
        }
 
        // 성별
        const genderChecked = document.querySelector('input[name="gender"]:checked');
        if (!genderChecked) {
            setFeedback(document.getElementById('genderFeedBack'), '성별을 선택해주세요', 'error');
            hasError = true;
        }
 
        // 이메일
        if (!emailInput.value.trim()) {
            setError(emailInput, emailFeedBack, '이메일을 입력해주세요');
            hasError = true;
        } else if (!isSocialLogin) {
            if (!isDuplicate) {
                setError(emailInput, emailFeedBack, '이메일 중복확인을 해주세요');
                hasError = true;
            } else if (!isChecked) {
                setError(emailInput, emailFeedBack, '이미 사용 중인 이메일입니다. 다른 이메일을 입력해주세요');
                hasError = true;
            }
        }
 
        // 비밀번호 (소셜 아닐 때만)
        if (!isSocialLogin) {
            const pwInput = document.getElementById('pw');
            const pw2Input = document.getElementById('pw2');
            const pwRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
 
            if (!pwRegex.test(pwInput.value)) {
                setError(pwInput, document.getElementById('pwFeedBack'), '영문, 숫자, 특수문자 조합 8자 이상이어야 합니다');
                hasError = true;
            }
 
            if (pwInput.value !== pw2Input.value) {
                setError(pw2Input, document.getElementById('pw2FeedBack'), '비밀번호가 일치하지 않습니다');
                hasError = true;
            }
        }
 
        // 주소
        if (!document.getElementById('zipcode').value) {
            setFeedback(document.getElementById('addrFeedBack'), '주소 검색을 통해 주소를 입력해주세요', 'error');
            hasError = true;
        }
 
        // 약관
        if (!hasError) {
            if (!document.getElementById('agree1').checked || !document.getElementById('agree2').checked) {
                showToast('필수 약관에 동의해주세요.');
                hasError = true;
            }
        }
 
        return !hasError;
    }
 
    async function handleSignup(e) {
        e.preventDefault();
        if (!validateAll()) return;
        const formData = new FormData(document.getElementById('signup'));

    try {
        const res = await fetch('/user/signup', {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: formData
        });

        const data = await res.json();

        if (data.success) {
            document.getElementById('success-name').textContent = data.name;
            document.getElementById('successOverlay').style.display = 'flex';
        } else {
            showToast(data.message || '회원가입에 실패했습니다.');
        }
    } catch (err) {
        console.error(err);
    }
}
 
    // 실시간 에러 제거 - 조건 맞으면 에러만 지움
 
    // 이름
    document.getElementById('name').addEventListener('input', function () {
        const nameRegex = /^[가-힣]{2,5}$/;
        if (nameRegex.test(this.value.trim())) {
            clearError(this, document.getElementById('nameFeedBack'));
        } else if (this.classList.contains('input-error')) {
            setFeedback(document.getElementById('nameFeedBack'), '이름은 2~5자 한글로 입력해주세요', 'error');
        }
    });
 
    // 나이
    document.getElementById('age').addEventListener('input', function () {
        const val = parseInt(this.value);
        if (!isNaN(val) && val >= 14 && val <= 99) {
            clearError(this, document.getElementById('ageFeedBack'));
        }
    });
 
    // 전화번호
    document.getElementById('tel').addEventListener('input', function () {
        if (!this.value.startsWith('010')) this.value = '010-';
        formatPhone(this);
        const telVal = this.value.replace(/\D/g, '');
        if (telVal.length === 11) {
            clearError(this, document.getElementById('telFeedBack'));
        }
    });
 
    // 성별
    document.querySelectorAll('input[name="gender"]').forEach(radio => {
        radio.addEventListener('change', function () {
            setFeedback(document.getElementById('genderFeedBack'), '', '');
        });
    });
 
    // 비밀번호
    const pwInput = document.getElementById('pw');
    const pw2Input = document.getElementById('pw2');
 
    if (pwInput) {
        pwInput.addEventListener('input', function () {
            checkPwStrength(this.value);
            const pwRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (pwRegex.test(this.value)) {
                clearError(this, document.getElementById('pwFeedBack'));
            }
            // 비번 확인도 같이 체크
            if (pw2Input && pw2Input.value) {
                if (this.value === pw2Input.value) {
                    clearError(pw2Input, document.getElementById('pw2FeedBack'));
                }
            }
        });
    }
 
    if (pw2Input) {
        pw2Input.addEventListener('input', function () {
            const pw = pwInput ? pwInput.value : '';
            if (this.value === pw) {
                clearError(this, document.getElementById('pw2FeedBack'));
            } else if (this.classList.contains('input-error')) {
                setFeedback(document.getElementById('pw2FeedBack'), '비밀번호가 일치하지 않습니다', 'error');
            }
        });
    }
 
    // 이메일 중복 확인
    if (emailCheckBtn) {
        emailCheckBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                setError(emailInput, emailFeedBack, '유효한 이메일 주소를 입력해주세요');
                return;
            }
            try {
                const res = await fetch(`/user/check-email?email=${encodeURIComponent(email)}`);
                const data = await res.json();
                isDuplicate = true;
                if (data.available) {
                    emailInput.classList.remove('input-error');
                    emailInput.classList.add('input-success');
                    setFeedback(emailFeedBack, '사용 가능한 이메일입니다.', 'success');
                    isChecked = true;
                    emailInput.readOnly = true;
                    emailCheckBtn.disabled = true;
                } else {
                    setError(emailInput, emailFeedBack, '이미 가입된 이메일입니다');
                    isChecked = false;
                }
            } catch (error) {
                setError(emailInput, emailFeedBack, '서버 오류가 발생했습니다');
            }
        });
    }
 
    if (emailInput) {
        emailInput.addEventListener('input', () => {
            isChecked = false;
            isDuplicate = false;
            emailInput.classList.remove('input-error', 'input-success');
            emailInput.readOnly = false;
            if (emailCheckBtn) emailCheckBtn.disabled = false;
            setFeedback(emailFeedBack, '', '');
        });
    }
    // 프로필 이미지 미리보기
    const avatarFile = document.getElementById('avatar-file');
    const avatarImg = document.getElementById('avatar-img');

    avatarFile.addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert('5MB 이하의 이미지 파일만 가능합니다.');
            this.value = '';
            return;
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            alert('이미지 파일(jpg, jpeg, png, webp)만 업로드 가능합니다.');
            this.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            avatarImg.src = e.target.result;
            document.getElementById('removeImage').value = 'false';
        };
        reader.readAsDataURL(file);
    });
 
    // 기타
    document.getElementById('agreeAll').addEventListener('change', function () { toggleAll(this); });
    document.getElementById('addrSearchBtn').addEventListener('click', searchAddress);
    document.getElementById('signup').addEventListener('submit', handleSignup);
    document.querySelector('.avatar-remove-btn').addEventListener('click', function () {
        avatarImg.src = '/images/user-profile/default-profile-image.jpg';
        avatarFile.value = '';
        document.getElementById('removeImage').value = 'true';
    });
 
    document.querySelectorAll('.input-eye').forEach(btn => {
        btn.addEventListener('click', function () {
            const input = this.closest('.input-icon-wrap').querySelector('input');
            togglePw(input.id, this);
        });
    });
 
});