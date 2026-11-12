import { renderUnreadNoti, renderReadNoti, renderChatNoti } from '../modules/notiRender.js';
import { initFriendSocket } from './friendHandler.js';

const notiList = document.getElementById('noti-list');
const notiBtn = document.getElementById('noti-btn');
const badge = document.getElementById('noti-badge');
const notiAllRead = document.querySelector('.read-all');
const readNoti = document.querySelector('.read-noti');
const unreadNoti = document.querySelector('.unread-noti');
let socket = null;
let activeView = 'unread';
let unreadRequest = 0;
let readRequest = 0;
let unreadIds = new Set();
let chatNotices = [];

function updateBadge() {
    if (!badge) return;
    const count = unreadIds.size + chatNotices.length;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = count === 0;
    notiBtn.setAttribute('aria-label', count ? `알림, 읽지 않은 알림 ${count}개` : '알림');
}

async function fetchNotices(state) {
    const response = await fetch(`/noti/${state}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('알림을 불러오지 못했습니다.');
    return response.json();
}

async function refreshUnread() {
    const request = ++unreadRequest;
    try {
        const notices = await fetchNotices('unread');
        if (request !== unreadRequest) return;
        unreadIds = new Set(notices.map(noti => String(noti._id)));
        updateBadge();
        if (activeView === 'unread') {
            renderUnreadNoti(notices, notiList, refreshUnread);
            chatNotices.forEach(data => renderChatNoti(data, notiList));
        }
    } catch (error) {
        console.error(error);
    }
}

async function showNotices(state) {
    activeView = state;
    readNoti.style.display = state === 'unread' ? 'inline-flex' : 'none';
    unreadNoti.style.display = state === 'read' ? 'inline-flex' : 'none';
    if (state === 'unread') return refreshUnread();

    const request = ++readRequest;
    try {
        const notices = await fetchNotices('read');
        if (activeView === 'read' && request === readRequest) renderReadNoti(notices, notiList);
    } catch (error) {
        console.error(error);
    }
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

export function getNotiSocket() {
    return socket;
}

export function initNotiSocket(user) {
    if (!user?._id || !notiList || socket) return;

    readNoti.addEventListener('click', () => showNotices('read'));
    unreadNoti.addEventListener('click', () => showNotices('unread'));
    notiBtn.addEventListener('click', () => showNotices(activeView));
    window.addEventListener('focus', refreshUnread);
    notiAllRead.addEventListener('click', async () => {
        const existingChats = new Set(chatNotices);
        notiAllRead.disabled = true;
        try {
            const response = await fetch('/noti/read-all', { method: 'PATCH' });
            if (!response.ok) throw new Error('알림을 읽음 처리하지 못했습니다.');
            chatNotices = chatNotices.filter(data => !existingChats.has(data));
            await refreshUnread();
            if (activeView === 'read') await showNotices('read');
        } catch (error) {
            console.error(error);
        } finally {
            notiAllRead.disabled = false;
        }
    });
    refreshUnread();

    socket = io('/noti', { auth: { userId: user._id } });
    initFriendSocket(socket);
    socket.on('connect', refreshUnread);

    const messages = {
        CREW_APPLICATION: title => `알림이 도착했습니다. '${title}'`,
        NEW_MEMBER: title => `알림이 도착했습니다. '${title}'`,
        APPLICATION_ACCEPTED: title => `알림이 도착했습니다. '${title}'`,
        APPLICATION_REJECTED: title => `알림이 도착했습니다. '${title}'`,
        ACTIVITY_ATTEND: title => `활동시간입니다, 출석하세요. '${title}'`,
        ACTIVITY_MANNER_REVIEW: title => `경기가 종료됐습니다. '${title}'`,
        ACTIVITY_REMINDER: title => title
    };
    for (const [event, message] of Object.entries(messages)) {
        socket.on(event, noti => {
            if (!noti) return;
            if (noti._id && !noti.isRead) unreadIds.add(String(noti._id));
            updateBadge();
            showToast(message(noti.title));
            refreshUnread();
        });
    }

    socket.on('chat noti', data => {
        if (String(window.currentRoomId) === String(data.roomId)) return;
        chatNotices.push(data);
        updateBadge();
        if (activeView === 'unread') renderChatNoti(data, notiList);
        showToast(`[${data.roomName}] ${data.senderName}: ${data.content}`);
    });
}
