import { renderUnreadNoti, renderReadNoti, renderNoti } from '../modules/notiRender.js';

let socket = null;
const notiList = document.getElementById('noti-list');
const notiBtn = document.getElementById('noti-btn');

const notiAllRead = document.querySelector('#read-all');
const readNoti = document.querySelector('#read-noti');
const unreadNoti = document.querySelector('#unread-noti');

if(notiAllRead) {
    notiAllRead.addEventListener('click', async ()=>{
        try {
            const response = await fetch('/noti/read-all', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                notiList.innerHTML = `
                    <div style="border:1px solid var(--border);text-align:center;padding:48px 0;color:var(--text-3)">
                        새로운 알림이 없습니다.
                    </div>
                `;
            } else {
                throw new Error('readAllFail');
            }
        } catch (error) {
                
        }
    });
}
if(readNoti && unreadNoti) {
    readNoti.addEventListener('click', async ()=>{ 
        const response = await fetch('/noti/read');
        const notis = await response.json();

        renderReadNoti(notis, notiList);

        unreadNoti.style.display = 'inline-flex';
        readNoti.style.display = 'none';
    });
        
    unreadNoti.addEventListener('click', async ()=>{ 
        const response = await fetch('/noti/unread');
        const notis = await response.json();

        renderUnreadNoti(notis, notiList);

        readNoti.style.display = 'inline-flex';
        unreadNoti.style.display = 'none';
    });
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

export function initNotiSocket(user) {
    if (!user || !user._id) {
        return;
    }

    if (socket) return;

    socket = io('/noti', { auth: { userId: user._id } });

    socket.on('CREW_APPLICATION', (noti)=>{
        showToast(`알림이 도착했습니다. '${noti.title}'`);
    });
}
                  
                
