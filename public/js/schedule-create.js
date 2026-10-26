import './schedule-location.js';

const { crewId } = JSON.parse(document.getElementById('schedule-config').textContent);
const modal = document.getElementById('addScheduleForm');
const overlay = document.getElementById('scheduleOverlay');
const value = (id) => document.getElementById(id).value;
let type = 'group';
let opener;

const status = document.createElement('p');
status.setAttribute('role', 'status');
modal.append(status);

window.toggleAddForm = () => {
    const open = !modal.classList.contains('show');
    modal.classList.toggle('show', open);
    overlay.classList.toggle('show', open);
    if (open) {
        opener = document.activeElement;
        modal.focus();
    } else {
        opener?.focus();
    }
};

window.selectActivityType = (next) => {
    type = next;
    document.getElementById('chip-group').className =
        'type-chip' + (type === 'group' ? ' sel-battle' : '');
    document.getElementById('chip-solo').className =
        'type-chip' + (type === 'solo' ? ' sel-internal' : '');
    document.getElementById('field-group').style.display = type === 'group' ? '' : 'none';
    document.getElementById('field-solo').style.display = type === 'solo' ? '' : 'none';
};
const state = document.getElementById('stateSelect');
const city = document.getElementById('citySelect');
const areas = JSON.parse(state.dataset.areas);

state.addEventListener('change', () => {
    city.replaceChildren(new Option('시/군/구 선택', ''));
    (areas[state.value] || []).forEach((name) => city.add(new Option(name, name)));
});
[state, city, document.getElementById('detail-addr')].forEach((input) =>
    input.addEventListener('change', () => {
        document.getElementById('lat-input').value = '';
        document.getElementById('lng-input').value = '';
    })
);
modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') window.toggleAddForm();
    if (event.key === 'Tab') {
        const items = [...modal.querySelectorAll('button,input,select,textarea')].filter(
            (el) => el.offsetParent !== null && !el.disabled
        );
        const first = items[0];
        const last = items[items.length - 1];
        if (
            event.shiftKey &&
            (document.activeElement === first || document.activeElement === modal)
        ) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
});
window.addSchedule = async () => {
    const submit = modal.querySelector('[onclick="addSchedule()"]');
    if (submit.disabled) return;
    status.textContent = '';
    const date = value('new-date');
    const start =
        date +
        'T' +
        value('new-start-h').padStart(2, '0') +
        ':' +
        value('new-start-m').padStart(2, '0') +
        ':00+09:00';
    const end =
        date +
        'T' +
        value('new-end-h').padStart(2, '0') +
        ':' +
        value('new-end-m').padStart(2, '0') +
        ':00+09:00';
    const count = Number(value(type === 'group' ? 'new-team-count' : 'new-count'));
    if (!date || !Number.isFinite(Date.parse(start)) || Date.parse(end) <= Date.parse(start)) {
        status.textContent = '날짜와 시작·종료 시간을 확인해주세요.';
        return;
    }
    if (!Number.isInteger(count) || count < 1 || count > 50) {
        status.textContent = '인원을 1~50 사이로 입력해주세요.';
        return;
    }
    if (!state.value || !city.value) {
        status.textContent = '활동 지역을 선택해주세요.';
        return;
    }
    if (!value('lat-input') || !value('lng-input')) {
        status.textContent = '위치 확인 버튼으로 장소를 확인해주세요.';
        return;
    }
    const payload = {
        crewModel: 'regular',
        content: value('new-content').trim() || '정기 활동',
        startTime: start,
        endTime: end,
        gameType: type === 'group' ? 'team' : 'solo',
        capacity: type === 'group' ? count * 2 : count,
        location: {
            state: state.value,
            city: city.value,
            detail: value('detail-addr').trim() || '상세 주소 없음',
            lat: Number(value('lat-input')),
            lng: Number(value('lng-input'))
        }
    };
    submit.disabled = true;
    try {
        const response = await fetch('/regular/act/create/' + encodeURIComponent(crewId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || '일정 등록에 실패했습니다.');
        const url = new URL(location.href);
        url.searchParams.set('month', date.slice(0, 7));
        location.assign(url.href);
    } catch (error) {
        status.textContent = error.message;
        submit.disabled = false;
    }
};
