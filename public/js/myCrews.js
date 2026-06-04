async function loadCrews(role = 'all') {
    const res = await fetch('/regular/api/my-crews?role=' + role);
    const { crews } = await res.json();
    
    const grid = document.getElementById('crew-grid');
    
    if (crews.length === 0) {
    grid.classList.remove('regular-grid');
    grid.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🏃</div>
            <div class="empty-state-title">참여 중인 모임이 없어요</div>
            <div class="empty-state-sub">정기모임에 참가하거나 직접 만들어보세요!<br>같은 스포츠를 즐기는 사람들을 만날 수 있어요.</div>
            <button class="empty-state-btn" onclick="location.href='/regular/regular'">모임 둘러보기</button>
        </div>
    `;
    return;
}
grid.classList.add('regular-grid');

    grid.innerHTML = crews.map(crew => `
        <div class="reg-card" data-role="${crew.crewRole}">
            <div class="reg-card-head">
                <img src="${crew.profileImage}" class="reg-sport-icon" alt="크루 프사">
                <div>
                    <div class="reg-card-title">${crew.title}</div>
                    <div class="reg-card-sub">${crew.dayLabel} · ${crew.address.city}</div>
                </div>
                ${crew.crewRole === 'host'
                    ? `<span class="role-badge host">👑 모임장</span>`
                    : `<span class="role-badge member">🙋 크루원</span>`
                }
                <span class="like-font">👍 ${crew.reputation}</span>
            </div>
            <div class="reg-card-body">
                <div class="reg-meta-row">
                    <span>💰 ${crew.fee > 0 ? crew.fee.toLocaleString() + '원/회' : '무료'}</span>
                    <span>👥 ${crew.member.memberList.length}/${crew.member.capacity}명</span>
                    <span>📅 ${crew.periodLabel}</span>
                </div>
                <div class="reg-progress">
                    <div class="reg-progress-fill" style="width:${crew.pct}"></div>
                </div>
                <div class="reg-progress-label">
                    <span>${crew.member.memberList.length}/${crew.member.capacity}명</span>
                    <span>${crew.member.capacity - crew.member.memberList.length}자리 남음</span>
                </div>
                <div class="reg-card-actions">
                    ${crew.crewRole === 'host' ? `
                        <a href="/regular/manage/${crew._id}" class="action-btn primary">크루관리</a>
                        <button class="action-btn danger" style="flex:1" type="button" onclick="confirmDelete('${crew._id}')">해산</button>
                    ` : `
                        <a href="/regular/manage/${crew._id}" class="action-btn primary">크루보기</a>
                        <button class="action-btn danger" style="flex:1" type="button" onclick="confirmWithdraw('${crew._id}')">탈퇴</button>
                    `}
                </div>
            </div>
        </div>
    `).join('');
}

function switchTab(btn, role) {
    document.querySelectorAll('.my-crew-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    loadCrews(role);
}

loadCrews();