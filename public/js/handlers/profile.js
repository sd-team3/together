const profileData = JSON.parse(document.getElementById("profile-data").textContent);
const { regularCrews, instantCrews } = profileData;

document.addEventListener("DOMContentLoaded", () => {


const sportIcon = {
        soccer: "⚽",
        baseball: "⚾",
        basketball: "🏀",
        bowling: "🎳",
        tennis: "🎾",
        badminton: "🏸",
        tabletennis: "🏓"
};

const today = new Date();
let monday = new Date(today);
if (today.getDay() === 0) monday.setDate(today.getDate() - 6);
else monday.setDate(today.getDate() - today.getDay() + 1);
monday.setHours(0, 0, 0, 0);

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    if (day === 0) d.setDate(d.getDate() - 6);
    else d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
}
// 주간 달력 주기 계산
function isCrewActiveThisWeek(crew, weekMonday) {
    if (crew.period === 'week') return true;
    const createdMonday = getMonday(new Date(crew.createdAt));
    if (crew.period === '2week') {
        const diffWeeks = Math.round((weekMonday - createdMonday) / (7 * 86400000));
        return ((diffWeeks % 2) + 2) % 2 === 0;
    }
    if (crew.period === 'month') {
        const weekOfMonth = (mondayDate) => Math.ceil(mondayDate.getDate() / 7);
        return weekOfMonth(weekMonday) === weekOfMonth(createdMonday);
    }
    return true;
}

// 정기 모임 주간 달력
function createRegularCalendar() {
    const calendar = document.getElementById("regular-calendar");
    const dayCodes = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const dayNames = ["월", "화", "수", "목", "금", "토", "일"];
    const activeCrews = regularCrews.filter(crew => isCrewActiveThisWeek(crew, monday));

    let html = "";
    for(let i = 0; i<7; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        const dayCode = dayCodes[i];

        const dayCrews = activeCrews
            .filter(crew => crew.day.includes(dayCode))
            .map(crew => ({ title: crew.title, sport: crew.sport }));

        html += `
        <div class="regular-day ${day.toDateString() === today.toDateString() ? 'regular-today' : ''}" data-day="${dayCode}">
            <div class="regular-day-header">
                <span class="regular-day-name">${dayNames[i]}</span>
                <span class="regular-day-date">
                    ${String(day.getMonth()+1).padStart(2,'0')}.
                    ${String(day.getDate()).padStart(2,'0')}
                </span>
            </div>
            <div class="regular-events">
                ${dayCrews.slice(0, 2).map(crew => `<div class="calendar-event">${sportIcon[crew.sport]} ${crew.title}</div>`).join('')}
                ${dayCrews.length > 2 ? `<div class="calendar-more">+${dayCrews.length - 2}개 더...</div>` : ''}
            </div>
        </div>
        `;
    }
    calendar.innerHTML = html;
}

let calendarYear = today.getFullYear();
let calendarMonth = today.getMonth();

// 실시간 모임 월간 달력
function createInstantCalendar() {
    const calendar = document.getElementById("instant-calendar");
    const calenderTitle = document.getElementById("year-month");
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const lastDate = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    let html = `
    <div class="calendar-weekday sunday">일</div>
    <div class="calendar-weekday">월</div>
    <div class="calendar-weekday">화</div>
    <div class="calendar-weekday">수</div>
    <div class="calendar-weekday">목</div>
    <div class="calendar-weekday">금</div>
    <div class="calendar-weekday saturday">토</div>
    `;

    for(let i=0; i<firstDay; i++) { html += `<div class="calendar-cell empty"></div>`; }
    for(let day=1; day<=lastDate; day++) {
        const isToday = calendarYear === today.getFullYear() && calendarMonth === today.getMonth() && day === today.getDate();
        const dayCrews = instantCrews.filter(crew => {
                const meetTime = new Date(crew.meetAt);
                return calendarYear === meetTime.getFullYear()
                && calendarMonth === meetTime.getMonth()
                && day === meetTime.getDate();
                }).map(crew => ({ title: crew.title, sport: crew.sport }));
        html += `
            <div class="calendar-cell ${isToday ? 'today' : ''}" data-year="${calendarYear}" data-month="${calendarMonth}" data-day="${day}">
                <div class="calendar-date">${day}</div>
                ${dayCrews.slice(0, 2).map(crew => `<div class="calendar-event"> ${sportIcon[crew.sport]} ${crew.title} </div>`).join('')}
                ${dayCrews.length > 2 ? `<div class="calendar-more">+${dayCrews.length - 2}개 더...</div>` : ''}
            </div>
        `;
    }
    calendar.innerHTML = html;
    calenderTitle.textContent = `${calendarYear}년 ${calendarMonth + 1}월`;
}
createRegularCalendar();
createInstantCalendar();

function setupList(cardId, filterId, paginationId, { hasDay }) {
    const card = document.getElementById(cardId);
    const filterBox = document.getElementById(filterId);
    const paginationEl = document.getElementById(paginationId);
    const tabs = filterBox.querySelectorAll('.filter-tab');
    const sportSelect = filterBox.querySelector('.filter-sport');
    const daySelect = hasDay ? filterBox.querySelector('.filter-day') : null;
    const allItems = Array.from(card.querySelectorAll('.crew-list-item'));
    const PAGE_SIZE = 4;
    let activeRole = 'all';
    let currentPage = 1;

    function getFiltered() {
        const sport = sportSelect.value;
        const day = daySelect ? daySelect.value : 'all';
        return allItems.filter(item => {
            const roleMatch = activeRole === 'all' || item.dataset.role === activeRole;
            const sportMatch = sport === 'all' || item.dataset.sport === sport;
            const dayMatch = !hasDay || day === 'all' || (item.dataset.day || '').split(' ').includes(day);
            return roleMatch && sportMatch && dayMatch;
        });
    }

    function render() {
        const filtered = getFiltered();
        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        if (currentPage > totalPages) currentPage = totalPages;

        allItems.forEach(item => item.classList.add('filter-hidden'));
        filtered
            .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
            .forEach(item => item.classList.remove('filter-hidden'));

        if (filtered.length <= PAGE_SIZE) {
            paginationEl.innerHTML = '';
            return;
        }
        let html = `<button type="button" class="page-arrow" data-dir="prev" ${currentPage === 1 ? 'disabled' : ''}>◀</button>`;
        for (let p = 1; p <= totalPages; p++) {
            html += `<button type="button" class="page-num ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
        }
        html += `<button type="button" class="page-arrow" data-dir="next" ${currentPage === totalPages ? 'disabled' : ''}>▶</button>`;
        paginationEl.innerHTML = html;
    }

    paginationEl.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.dataset.page) currentPage = Number(btn.dataset.page);
        else if (btn.dataset.dir === 'prev') currentPage--;
        else if (btn.dataset.dir === 'next') currentPage++;
        render();
    });

    tabs.forEach(tab => tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeRole = tab.dataset.role;
        currentPage = 1;
        render();
    }));
    sportSelect.addEventListener('change', () => { currentPage = 1; render(); });
    if (daySelect) daySelect.addEventListener('change', () => { currentPage = 1; render(); });

    render();
}

setupList('regular-card', 'regular-filter', 'regular-pagination', { hasDay: true });
setupList('instant-card', 'instant-filter', 'instant-pagination', { hasDay: false });

document.getElementById('regular-card').addEventListener('click', e => {
    const item = e.target.closest('.crew-list-item');
    if (!item) return;
    const crewId = item.dataset.crewId;
    if (crewId) window.location.href = `/regular/manage/${crewId}`;
});

// 월간 달력 ◀, ▶ 버튼
const prevMonthBtn = document.getElementById("prev-month-btn");
const nextMonthBtn = document.getElementById("next-month-btn");
prevMonthBtn.addEventListener('click', () => {
    calendarMonth--;
    if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear--;
    }
    createInstantCalendar();
});
nextMonthBtn.addEventListener('click', () => {
    calendarMonth++;
    if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear++;
    }
    createInstantCalendar();
});

// 달력 일정 상세정보 모달
function openCalendarModal(title, list) {
    document.getElementById("modal-title").textContent = title;
    const modalBody = document.getElementById("modal-body");

    if(list.length === 0) modalBody.innerHTML = `<div class="modal-item">일정이 없습니다.</div>`;
    else {
    modalBody.innerHTML = list.map(item => 
        `<div class="modal-item">
        <div class="modal-item-left">${sportIcon[item.sport]} ${item.title}</div>
        <div class="modal-item-time">${item.date}</div>
        </div>`
    ).join('');
    }
    document.getElementById("calendar-modal").classList.add("show");
}
const modalCalendar = document.getElementById("calendar-modal");
const modalClose = document.getElementById("modal-close-btn");
modalClose.addEventListener('click', () => { modalCalendar.classList.remove("show"); });
modalCalendar.addEventListener('click', e => { 
    if(e.target === modalCalendar) modalCalendar.classList.remove('show');
});

// 정기모임 달력 모달
function renderRegularModalItem(crew) {
    const img = crew.profileImage && crew.profileImage.includes('/')
        ? crew.profileImage
        : '/images/reg-crew/profile/default-profile-image.jpg';

    return `
    <div class="modal-crew-item">
        <img class="modal-crew-thumb" src="${img}" alt="${crew.title}">
        <div class="modal-crew-info">
            <div class="modal-crew-title-row">
                <span class="modal-crew-title">${sportIcon[crew.sport] || ''} ${crew.title}</span>
                <span class="modal-crew-period">${crew.periodLabel} ${crew.dayLabel}</span>
            </div>
            <p class="modal-crew-intro">${crew.intro && crew.intro.trim() ? crew.intro : `${crew.title} 크루입니다. 가입해보세요.`}</p>
            <div class="modal-crew-meta">
                <span>📌 ${crew.state} ${crew.city}</span>
                <span class="dot">·</span>
                <span>👤 ${crew.memberCount}/${crew.capacity}</span>
            </div>
        </div>
    </div>
    `;
}

// 실시간 모임 시간 표시용
function renderInstantModalItem(crew) {
    return `
    <div class="modal-crew-item">
        <div class="modal-crew-icon">${sportIcon[crew.sport] || '🏃'}</div>
        <div class="modal-crew-info">
            <div class="modal-crew-title-row">
                <span class="modal-crew-title">${crew.title}</span>
                <span class="modal-crew-period">${crew.timeLabel}</span>
            </div>
            <div class="modal-crew-host-row">
                <span class="crew-host-badge">👑 ${crew.host}${crew.crewRole === 'host' ? ' (나)' : ''}</span>
            </div>
            <p class="modal-crew-intro">${crew.intro && crew.intro.trim() ? crew.intro : `${crew.title} 모임입니다. 참여해보세요.`}</p>
            <div class="modal-crew-meta">
                <span>📌 ${crew.state} ${crew.city}</span>
                <span class="dot">·</span>
                <span>👤 ${crew.memberCount}/${crew.capacity}</span>
                <span class="dot">·</span>
                <span>⭐ ${(crew.avgReputation ?? 0).toFixed(1)}</span>
            </div>
        </div>
    </div>
    `;
}

function openCalendarModal(title, list, type = 'default') {
    document.getElementById("modal-title").textContent = title;
    const modalBody = document.getElementById("modal-body");

    if(list.length === 0) {
        modalBody.innerHTML = `<div class="modal-item">일정이 없습니다.</div>`;
    } else if (type === 'regular') {
        modalBody.innerHTML = list.map(renderRegularModalItem).join('');
    } else if (type === 'instant') {
        modalBody.innerHTML = list.map(renderInstantModalItem).join('');
    } else {
        modalBody.innerHTML = list.map(item =>
            `<div class="modal-item">
            <div class="modal-item-left">${sportIcon[item.sport]} ${item.title}</div>
            <div class="modal-item-time">${item.date}</div>
            </div>`
        ).join('');
    }
    document.getElementById("calendar-modal").classList.add("show");
}


const regularCalendar = document.getElementById("regular-calendar");
// 주간 달력 클릭 이벤트
const dayFullLabel = { mon:'월요일', tue:'화요일', wed:'수요일', thu:'목요일', fri:'금요일', sat:'토요일', sun:'일요일' };

regularCalendar.addEventListener('click', e => {
    const regularDay = e.target.closest(".regular-day");
    if(!regularDay) return;
    const dayCode = regularDay.dataset.day;

    const activeCrews = regularCrews.filter(crew => isCrewActiveThisWeek(crew, monday));
    const calendarCrews = activeCrews
        .filter(crew => crew.day.includes(dayCode))
        .map(crew => ({
            sport: crew.sport,
            title: crew.title,
            intro: crew.intro,
            profileImage: crew.profileImage,
            state: crew.address.state,
            city: crew.address.city,
            memberCount: crew.member.memberList.length,
            capacity: crew.member.capacity,
            periodLabel: crew.periodLabel,
            dayLabel: crew.dayLabel
        }));

    openCalendarModal(`${dayFullLabel[dayCode]} 정기 모임`, calendarCrews, 'regular');
});

const instantCalendar = document.getElementById("instant-calendar");
// 월간 달력 클릭 이벤트
instantCalendar.addEventListener('click', e => {
    const cell = e.target.closest(".calendar-cell");
    if(!cell || cell.classList.contains("empty")) return;
    const year = Number(cell.dataset.year);
    const month = Number(cell.dataset.month);
    const day = Number(cell.dataset.day);

    const calendarCrews = instantCrews.filter(crew => {
        const meetTime = new Date(crew.meetAt);
        return meetTime.getFullYear() === year
        && meetTime.getMonth() === month
        && meetTime.getDate() === day;
    }).map(crew => ({
        sport: crew.sport,
        title: crew.title,
        intro: crew.intro,
        state: crew.address.state,
        city: crew.address.city,
        memberCount: crew.memberCount,
        capacity: crew.member.capacity,
        host: crew.host.name,
        crewRole: crew.crewRole,
        avgReputation: crew.avgReputation,
        timeLabel: new Date(crew.meetAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    }));
    openCalendarModal(`${month + 1}월 ${day}일 실시간 모임`, calendarCrews, 'instant');
});

// 정기모임 실시간모임 전환
const regularTab = document.getElementById("regular-tab");
const instantTab = document.getElementById("instant-tab");
const regularSection = document.getElementById("regular-section");
const instantSection = document.getElementById("instant-section");

regularTab.addEventListener('click', () => {
    regularSection.style.display = "block";
    instantSection.style.display = "none";
    regularTab.classList.add("active");
    instantTab.classList.remove("active");
});
instantTab.addEventListener('click', () => {
    instantSection.style.display = "block";
    regularSection.style.display = "none";
    instantTab.classList.add("active");
    regularTab.classList.remove("active");
});

});