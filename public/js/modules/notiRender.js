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

function checkEmpty(notiList, isRead) {
    if (notiList.children.length === 0) {
        notiList.innerHTML = `
            <div class="empty-noti-msg" style="border:1px solid var(--border);text-align:center;padding:48px 0;color:var(--text-3)">
                ${isRead ? '읽은' : '새로운'} 알림이 없습니다.
            </div>
        `;
    }         
}

export function renderNoti(noti, notiList) {
    if (!noti || !notiList) {
        return;
    }

    const emptyMsg = notiList.querySelector('.empty-noti-msg');
    if (emptyMsg) {
        emptyMsg.remove();
    }

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
        e.stopPropagation();
        try {
            const response = await fetch(`/noti/${noti._id}/${noti.isRead ? 'delete' : 'read'}`, {
                method: `${noti.isRead ? 'DELETE' : 'PATCH'}`,
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                notiDiv.remove();
                checkEmpty(notiList, noti.isRead);
            } else {
                throw new Error(`noti${noti.isRead ? 'Delete' : 'Read'}Fail`);
            }
        } catch (error) {
            
        }
    });

    notiDiv.addEventListener('click', async () => {
        if (noti.event === 'ACTIVITY_ATTEND') {
            if (!navigator.geolocation) {
                alert("이 브라우저에서는 GPS 출석 체크를 지원하지 않습니다.");
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    try {
                        const res = await fetch(noti.route, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ lat, lng })
                        });
                        
                        const data = await res.json();
                        
                        if (res.ok) {
                            alert(`✅ 출석 성공!`);
                            location.reload(); 
                        } else {
                            alert(`❌ 출석 실패: ${data.message || '오류가 발생했습니다.'}`);
                        }
                    } catch (error) {
                        console.error('GPS 출석 통신 에러:', error);
                        alert("서버 통신 중 오류가 발생했습니다.");
                    }
                },
                (error) => {
                    alert("위치 정보 제공에 동의해야 출석이 가능합니다.");
                },
                { enableHighAccuracy: true }
            );
            return;
        }

        if (noti.route) {
            window.location.href = noti.route;
        }
    });

    notiList.appendChild(notiDiv);
}

export function renderUnreadNoti(notis, notiList) {
    notiList.innerHTML = '';
    notis.forEach(noti => { renderNoti(noti, notiList) });
    checkEmpty(notiList, false);
}

export function renderReadNoti(notis, notiList) {
    notiList.innerHTML = '';
    notis.forEach(noti => { renderNoti(noti, notiList) });
    checkEmpty(notiList, true);
}

export function renderChatNoti(data, notiList) {
    if (!notiList) return;
    const notiItem = document.createElement('div');
    notiItem.innerHTML = `
        <div style="padding:10px;border:1px solid var(--border);border-radius:8px;cursor:pointer"
             onclick="location.href='/chatRoom/chatPage?roomId=${data.roomId}'">
            <div style="font-weight:600;margin-bottom:4px">${data.roomName}</div>
            <div style="color:var(--text-3);font-size:13px">${data.senderName}: ${data.content}</div>
        </div>
    `;
    notiList.prepend(notiItem);
}
