import { addrSearch } from '/js/modules/addrSearch.js';

document.addEventListener('DOMContentLoaded', () => { //DOMContentLoaded: 외부 js파일은 ejs가 랜더링 되기 전에 실행될 수 있으므로, DOM요소를 못 찾는 경우가 있음.

    function togglePw(id, btn) {
        const inp = document.getElementById(id);
        inp.type = inp.type === 'password' ? 'text' : 'password';
        btn.textContent = inp.type === 'password' ? '👁' : '🙈';
    }

    function setFeedback(el, msg, type) {
        el.textContent = msg;
        el.className = 'feedback-text ' + (type === 'success' ? 'success' : 'error');
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
            setFeedback(document.getElementById('addrFeedBack'), '', '');
            document.getElementById('addressDetail').focus();
            showToast('주소가 입력되었습니다. 상세 주소를 작성해주세요.');
        } catch (error) {
            showToast('주소 검색 중 오류가 발생했습니다.');
            console.log('에러 발생: ', error);
        }
    }

    const emailInput = document.getElementById('emailInput');
    const emailCheckBtn = document.getElementById('emailCheckBtn');
    const emailFeedBack = document.getElementById('emailFeedBack');
    let isChecked = false;
    let isDuplicate = false;

    async function handleSignup(e) {
        e.preventDefault();
        const isSocialLogin = !document.getElementById('pw');

        // 이름
        const nameInput = document.getElementById('name');
        const nameFeedBack = document.getElementById('nameFeedBack');
        const nameVal = nameInput.value.trim();
        const nameRegex = /^[가-힣]{2,5}$/;
        if (!nameRegex.test(nameVal)) {
            nameInput.classList.add('input-error');
            nameInput.classList.remove('input-success');
            setFeedback(nameFeedBack, '이름은 2~5자로 한글로 입력해주세요.', 'error');
            nameInput.focus();
            return;
        } else {
            nameInput.classList.remove('input-error');
            nameInput.classList.add('input-success');
            setFeedback(nameFeedBack, '', 'success');
        }

        // 나이
        const ageInput = document.getElementById('age');
        const ageFeedBack = document.getElementById('ageFeedBack');
        const ageVal = parseInt(ageInput.value);
        if (!ageInput.value) {
            ageInput.classList.add('input-error');
            ageInput.classList.remove('input-success');
            setFeedback(ageFeedBack, '나이를 입력해주세요', 'error');
            ageInput.focus();
            return;
        } else if (isNaN(ageVal) || ageVal < 14 || ageVal > 99) {
            ageInput.classList.add('input-error');
            ageInput.classList.remove('input-success');
            setFeedback(ageFeedBack, '올바른 나이를 입력해주세요', 'error');
            ageInput.focus();
            return;
        } else {
            ageInput.classList.remove('input-error');
            ageInput.classList.add('input-success');
            setFeedback(ageFeedBack, '', 'success');
        }

        // 전화번호
        const telInput = document.getElementById('tel');
        const telFeedBack = document.getElementById('telFeedBack');
        const telVal = telInput.value.replace(/\D/g, '');
        if (!telInput.value || telVal.length != 11) {
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

        // 성별
        const genderFeedBack = document.getElementById('genderFeedBack');
        const genderChecked = document.querySelector('input[name="gender"]:checked');
        if (!genderChecked) {
            setFeedback(genderFeedBack, '성별을 선택해주세요', 'error');
            return;
        } else {
            setFeedback(genderFeedBack, '', '');
        }

        // 이메일
        if (!emailInput.value.trim()) {
            emailInput.classList.add('input-error');
            emailInput.classList.remove('input-success');
            setFeedback(emailFeedBack, '이메일을 입력해주세요.', 'error');
            emailInput.focus();
            return;
        }
        if (!isSocialLogin) {
            if (!isDuplicate) {
                emailInput.classList.add('input-error');
                setFeedback(emailFeedBack, '이메일 중복확인을 해주세요.', 'error');
                return;
            }
            if (!isChecked) {
                emailInput.classList.add('input-error');
                setFeedback(emailFeedBack, '이미 사용 중인 이메일입니다. 다른 이메일을 입력해주세요.', 'error');
                return;
            }
        }

        // 비밀번호 (소셜 로그인이 아닐 때만)
        const pwInput = document.getElementById('pw');
        const pw2Input = document.getElementById('pw2');
        const pwFeedBack = document.getElementById('pwFeedBack');
        const pw2FeedBack = document.getElementById('pw2FeedBack');

        if (!isSocialLogin) {
            const pw = pwInput.value;
            const pw2 = pw2Input.value;
            const pwRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

            if (!pwRegex.test(pw)) {
                pwInput.classList.add('input-error');
                pwInput.classList.remove('input-success');
                setFeedback(pwFeedBack, '영문, 숫자, 특수문자 조합 8자 이상이어야 합니다.', 'error');
                pwInput.focus();
                return;
            } else {
                pwInput.classList.remove('input-error');
                pwInput.classList.add('input-success');
                setFeedback(pwFeedBack, '', 'success');
            }

            if (pw !== pw2) {
                pw2Input.classList.add('input-error');
                pw2Input.classList.remove('input-success');
                setFeedback(pw2FeedBack, '비밀번호가 일치하지 않습니다', 'error');
                pw2Input.focus();
                return;
            } else {
                pw2Input.classList.remove('input-error');
                pw2Input.classList.add('input-success');
                setFeedback(pw2FeedBack, '', 'success');
            }
        }

        // 주소
        const addrFeedBack = document.getElementById('addrFeedBack');
        const zipcodeVal = document.getElementById('zipcode').value;
        if (!zipcodeVal) {
            setFeedback(addrFeedBack, '주소 검색을 통해 주소를 입력해주세요.', 'error');
            return;
        } else {
            setFeedback(addrFeedBack, '', '');
        }

        // 약관
        if (!document.getElementById('agree1').checked || !document.getElementById('agree2').checked) {
            showToast('필수 약관에 동의해주세요.');
            return;
        }

        // 서버 전송
        const formData = new FormData(document.getElementById('signup'));
        try {
            const res = await fetch('/user/signup', {
                method: 'POST',
                body: formData,
                redirect: 'follow'
            });
            if (res.ok || res.redirected) {
                const name = document.getElementById('name').value;
                document.getElementById('success-name').textContent = name;
                document.getElementById('successOverlay').classList.add('show');
            } else {
                showToast('회원가입에 실패했습니다. 입력값을 확인해주세요.');
            }
        } catch (err) {
            showToast('서버 오류가 발생했습니다.');
        }
    }

    // 이메일 중복 확인
    if (emailCheckBtn) {
        emailCheckBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                emailInput.classList.add('input-error');
                emailInput.classList.remove('input-success');
                setFeedback(emailFeedBack, '유효한 이메일 주소를 입력해주세요.', 'error');
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
                    emailInput.classList.remove('input-success');
                    emailInput.classList.add('input-error');
                    setFeedback(emailFeedBack, '이미 가입된 이메일입니다.', 'error');
                    isChecked = false;
                }
            } catch (error) {
                emailInput.classList.add('input-error');
                setFeedback(emailFeedBack, '서버 오류가 발생했습니다.', 'error');
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

    // 실시간 유효성 검사 이벤트

    // 이름
    document.getElementById('name').addEventListener('input', function () {
        if (!this.value) {
            this.classList.remove('input-error', 'input-success');
            setFeedback(document.getElementById('nameFeedBack'), '', '');
            return;
        }
        const nameRegex = /^[가-힣]{2,5}$/;
        if (nameRegex.test(this.value.trim())) {
            this.classList.remove('input-error');
            this.classList.add('input-success');
            setFeedback(document.getElementById('nameFeedBack'), '', '');
        } else {
            this.classList.remove('input-success');
            this.classList.add('input-error');
            setFeedback(document.getElementById('nameFeedBack'), '이름은 2~5자로 한글로 입력해주세요.', 'error');
        }
    });

    // 나이
    document.getElementById('age').addEventListener('input', function () {
        if (!this.value) {
            this.classList.remove('input-error', 'input-success');
            setFeedback(document.getElementById('ageFeedBack'), '', '');
            return;
        }
        const val = parseInt(this.value);
        if (!isNaN(val) && val >= 14 && val <= 99) {
            this.classList.remove('input-error');
            this.classList.add('input-success');
            setFeedback(document.getElementById('ageFeedBack'), '', '');
        } else {
            this.classList.remove('input-success');
            this.classList.add('input-error');
            setFeedback(document.getElementById('ageFeedBack'), '나이를 올바르게 입력해주세요. (14~99세)', 'error');
        }
    });

    // 전화번호
    document.getElementById('tel').addEventListener('input', function () {
        if (!this.value.startsWith('010')) this.value = '010-';
        formatPhone(this);
        const telVal = this.value.replace(/\D/g, '');
        if (telVal.length === 11) {
            this.classList.remove('input-error');
            this.classList.add('input-success');
            setFeedback(document.getElementById('telFeedBack'), '', '');
        } else {
            this.classList.remove('input-success');
            this.classList.add('input-error');
            setFeedback(document.getElementById('telFeedBack'), '전화번호를 올바르게 입력해주세요', 'error');
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
            this.classList.remove('input-error', 'input-success');
            setFeedback(document.getElementById('pwFeedBack'), '', '');
        });
    }

    if (pw2Input) {
        pw2Input.addEventListener('input', function () {
            const pw = pwInput ? pwInput.value : '';
            if (!this.value) {
                this.classList.remove('input-error', 'input-success');
                setFeedback(document.getElementById('pw2FeedBack'), '', '');
                return;
            }
            if (this.value === pw) {
                this.classList.remove('input-error');
                this.classList.add('input-success');
                setFeedback(document.getElementById('pw2FeedBack'), '비밀번호가 일치합니다', 'success');
            } else {
                this.classList.remove('input-success');
                this.classList.add('input-error');
                setFeedback(document.getElementById('pw2FeedBack'), '비밀번호가 일치하지 않습니다', 'error');
            }
        });
    }

    // 기타
    document.getElementById('agreeAll').addEventListener('change', function () { toggleAll(this); });
    document.getElementById('addrSearchBtn').addEventListener('click', searchAddress);
    document.getElementById('signup').addEventListener('submit', handleSignup);

    document.querySelectorAll('.input-eye').forEach(btn => {
        btn.addEventListener('click', function () {
            const input = this.closest('.input-icon-wrap').querySelector('input');
            togglePw(input.id, this);
        });
    });

}); // DOMContentLoaded 끝