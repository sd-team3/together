const { regCrew, instantCrew } = window.profileData;

document.addEventListener("DOMContentLoaded", () => {
// 정기 모임, 실시간 모임 전체화면, 접기 버튼
const regularSeeAllBtn = document.getElementById('regular-all-btn');
const regularSee4Btn = document.getElementById('regular-four-btn');
const instantSeeAllBtn = document.getElementById('instant-all-btn');
const instantSee4Btn = document.getElementById('instant-four-btn');

if(regularSeeAllBtn) regularSeeAllBtn.addEventListener('click', () => seeBtn(true, "regular"));
if(regularSee4Btn) regularSee4Btn.addEventListener('click', () =>  seeBtn(false, "regular"));
if(instantSeeAllBtn) instantSeeAllBtn.addEventListener('click', () => seeBtn(true, "instant"));
if(instantSee4Btn) instantSee4Btn.addEventListener('click', () =>  seeBtn(false, "instant"));

function seeBtn(bool, crew) {
if(crew === 'regular') {
    regularSeeAllBtn.style.display = bool ? 'none' : 'inline-block';
    regularSee4Btn.style.display = !bool ? 'none' : 'inline-block';
} else if(crew === 'instant') {
    instantSeeAllBtn.style.display = bool ? 'none' : 'inline-block';
    instantSee4Btn.style.display = !bool ? 'none' : 'inline-block';
} else return;

let mainCard = null;
if(crew === 'regular') mainCard = document.querySelector('#regular-card');
else if(crew === 'instant') mainCard = document.querySelector('#instant-card');
else return;

const scheduleItem = mainCard.querySelectorAll('.schedule-item');
const scheduleHidden = mainCard.querySelectorAll('.schedule-item-hidden');

scheduleHidden.forEach(item => item.classList.toggle('show', bool));
scheduleItem.forEach(item => item.classList.remove('schedule-item-last'));

const lastSchedule = scheduleItem[scheduleItem.length - 1]
if(lastSchedule && bool) lastSchedule.classList.add('schedule-item-last');
else if(scheduleItem[3]) scheduleItem[3].classList.add('schedule-item-last');
}
const sportIcon = {
        soccer: "⚽",
        baseball: "⚾",
        basketball: "🏀",
        bowling: "🎳",
        tennis: "🎾",
        badminton: "🏸",
        tabletennis: "🏓"
};
// 정기 모임 주간 달력
const today = new Date();
function createRegularCalendar() {
    const calendar = document.getElementById("regular-calendar");
    const monday = new Date(today);

    if(today.getDay() === 0) monday.setDate(today.getDate() - 6);
    else monday.setDate(today.getDate() - today.getDay() + 1);

    const dayNames = ["월", "화", "수", "목", "금", "토", "일"];

    let html = "";

    for(let i = 0; i<7; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);

        const daySchedules = regCrew.flatMap(crew => {
            return crew.schedule
            .filter(sched => new Date(sched.date).toDateString() === day.toDateString())
            .map(sched => ({ title : sched.title, sport : crew.sport }))
        });
        
        html += 
        `
        <div class="regular-day ${day.toDateString() === today.toDateString() ? 'regular-today' : ''}" data-date="${day.toISOString()}">
            <div class="regular-day-header">
                <span class="regular-day-name">${dayNames[i]}</span>
                <span class="regular-day-date">
                    ${String(day.getMonth()+1).padStart(2,'0')}.
                    ${String(day.getDate()).padStart(2,'0')}
                </span>
            </div>

            <div class="regular-events">
                ${(daySchedules
                    .slice(0, 2)
                    .map(sched => `<div class="calendar-event">${sportIcon[sched.sport]} ${sched.title}</div>`)
                    .join('')
                    )}
                ${daySchedules.length > 2 ? `<div class="calendar-more">+${daySchedules.length - 2}개 더...</div>` : ''}
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

    let html =
    `
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
        const isToday = 
            calendarYear === today.getFullYear() && calendarMonth === today.getMonth() && day === today.getDate();
        const dayCrews = instantCrew.filter(crew => {
                const meetDate = new Date(crew.meetAt);
                return calendarYear === meetDate.getFullYear() && calendarMonth === meetDate.getMonth() && day === meetDate.getDate()
                }).map(crew => ({ title : crew.title, sport : crew.sport }));
        html += `
            <div class="calendar-cell ${isToday ? 'today' : ''}" data-year="${calendarYear}" data-month="${calendarMonth}" data-day="${day}">
                <div class="calendar-date">${day}</div>
                ${dayCrews.slice(0, 2)
                .map(sched => `<div class="calendar-event"> ${sportIcon[sched.sport]} ${sched.title} </div>`)
                .join('')}
                ${dayCrews.length > 2 ? `<div class="calendar-more">+${dayCrews.length - 2}개 더...</div>` : ''}
            </div>
        `;
    }
    calendar.innerHTML = html;
    calenderTitle.textContent = `${calendarYear}년 ${calendarMonth + 1}월`;
}
createRegularCalendar();
createInstantCalendar();

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
        <div class="modal-item-time">${item.date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
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
})


const regularCalendar = document.getElementById("regular-calendar");
// 주간 달력 클릭 이벤트
regularCalendar.addEventListener('click', e => {
    const regularDay = e.target.closest(".regular-day");
    if(!regularDay) return;
    const clickedDate = new Date(regularDay.dataset.date);

    const schedules = regCrew.flatMap(crew => 
        crew.schedule.filter(sched => {
        const d = new Date(sched.date);
        return d.getFullYear() === clickedDate.getFullYear() && d.getMonth() === clickedDate.getMonth() && d.getDate() === clickedDate.getDate();
        }).map(sched => ({sport : crew.sport, title : sched.title, date : new Date(sched.date)}))
    );

    openCalendarModal(`${clickedDate.getMonth() + 1}월 ${clickedDate.getDate()}일 정기 모임`, schedules);
});

const instantCalendar = document.getElementById("instant-calendar");
// 월간 달력 클릭 이벤트
instantCalendar.addEventListener('click', e => {
    const cell = e.target.closest(".calendar-cell");
    if(!cell || cell.classList.contains("empty")) return;
    const year = Number(cell.dataset.year);
    const month = Number(cell.dataset.month);
    const day = Number(cell.dataset.day);
    
    const crews = instantCrew.filter(crew => {
        const d = new Date(crew.meetAt);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    }).map(crew => ({sport : crew.sport, title : crew.title, date : new Date(crew.meetAt)}));

    openCalendarModal(`${month + 1}월 ${day}일 실시간 모임`, crews);
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