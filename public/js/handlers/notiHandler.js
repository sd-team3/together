let socket = null;

const notiList = document.getElementById('noti-list');

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
    return new Date(date).toLocaleDateString();
}

function initNotiSocket(user) {
    if (!user || !user._id) {
        return;
    }

    socket = io('/noti', { auth: { userId: user._id } });

    socket.on('UNREAD_NOTIFICATION', (notis) => {
        

        notis.forEach(noti => {
            const notiTime = timesAgo(noti.createdAt);
            const notiHTML = `
                <div class="noti-item" id="noti-${noti._id}">
                    <div class="noti-body">
                        <div class="noti-title"><strong>${noti.title}</strong></div>
                        <div class="noti-meta">${noti.content} · 오늘 20:00</div>
                        <div class="noti-time">${notiTime}</div>
                    </div>
                </div>
            `;

            notiList.innerHTML += notiHTML;
        });
    });
}
                  
                
