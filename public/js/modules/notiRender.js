function timesAgo(createdAt) {
    const now = new Date();
    const timesAgo = Math.floor((now - new Date(createdAt)) / 1000);

    const minute = Math.floor(timesAgo / 60);
    const hour = Math.floor(minute / 60);
    const day = Math.floor(hour / 60);

    if(timesAgo < 60) return `방금 전`;
    if(minute < 60) return `${minute}분 전`;
    if(hour < 24) return `${hour}시간 전`;
    if(day < 7) return `${day}일 전`;
    return new Date(createdAt).toLocaleDateString();
}

export function renderNoti(noti, notiList) {
    const notiTime = timesAgo(noti.createdAt);
    const notiDiv = document.createElement('div');
        
    notiDiv.className = 'noti-item';
    notiDiv.id = `noti-${noti._id}`;
    notiDiv.innerHTML = `
        <div class="noti-body">
            <div class="noti-title">
                <strong>${noti.title}</strong>
                ${noti.sender || ''}
            </div>
            <div class="noti-meta">${noti.content}</div>
            <div class="noti-time">${notiTime}</div>
        </div>
        <button class="btn btn-outline btn-sm action-btn">${noti.isRead ? '삭제' : '읽음'}</button>
    `;

    notiDiv.querySelector('.action-btn').addEventListener('click', async ()=>{
        try {
            const response = await fetch(`/noti/${noti._id}/${noti.isRead ? 'delete' : 'read'}`, {
                method: `${noti.isRead ? 'DELETE' : 'PATCH'}`,
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                notiDiv.remove();
            } else {
                throw new Error(`noti${noti.isRead ? 'Delete' : 'Read'}Fail`);
            }
        } catch (error) {
            
        }
            

        if (notiList.children.length === 0) {
            notiList.innerHTML = `
                <div style="border:1px solid var(--border);text-align:center;padding:48px 0;color:var(--text-3)">
                    ${noti.isRead ? '읽은' : '새로운'} 알림이 없습니다.
                </div>
            `;
        }
    });

    notiList.appendChild(notiDiv);
}

export function renderUnreadNoti(notis, notiList) {
    notiList.innerHTML = '';

    if (!notis || notis.length === 0) {
        notiList.innerHTML = `
            <div style="border:1px solid var(--border);text-align:center;padding:48px 0;color:var(--text-3)">
                새로운 알림이 없습니다.
            </div>
        `;
        return;
    }

    notis.forEach(noti => { renderNoti(noti, notiList) });
}

export function renderReadNoti(notis, notiList) {
    notiList.innerHTML = '';
    
    if (!notis || notis.length === 0) {
        notiList.innerHTML = `
            <div style="border:1px solid var(--border);text-align:center;padding:48px 0;color:var(--text-3)">
                읽은 알림이 없습니다.
            </div>
        `;
        return;
    }

    notis.forEach(noti => { renderNoti(noti, notiList) });
}

