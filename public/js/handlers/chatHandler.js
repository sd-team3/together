const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');

// EJS에서 전달받은 전역 데이터
const parsedUser = window.CHAT_DATA.user;
const roomId = window.CHAT_DATA.roomId;

let chatSocket = null;

// 날짜 포맷
function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 소켓 연결
async function connectSocket(roomId) {
  if (chatSocket) chatSocket.disconnect();

  chatSocket = io('/chat', {
    auth: { roomId, userId: parsedUser._id, userName: parsedUser.name }
  });
  chatSocket.on('connect', () => console.log('소켓연결'));
  chatSocket.on('connect_error', (error) => console.log('소켓 연결 오류', error));
  chatSocket.on('disconnect', (reason) => console.log('소켓 연결 끊김', reason));
  chatSocket.on('join', (data) => inOutMessage(data.chat));
  chatSocket.on('chat message', (data) => renderChatMessage(data));
  chatSocket.on('exit', (data) => inOutMessage(data.chat));
}

// 채팅방 클릭 시 데이터 불러오기
document.addEventListener('click', async function(e) {
  const chat = e.target.closest('.chat-room-item');
  if (!chat) return;

  const chatRoomId = chat.dataset.id;
  try {
    const data = await fetchChatRoomData(chatRoomId);
    if (data && data.success) {
      renderChatRoomUI(data.room, data.messages, data.currentUserId);
      window.currentRoomId = data.room._id;
      connectSocket(chatRoomId);
    }
  } catch (error) {
    console.error('채팅방 불러오기 실패');
  }
});

// 채팅방 데이터 API 호출
async function fetchChatRoomData(roomId) {
  const params = new URLSearchParams();
  if (roomId) params.append('roomId', roomId);
  try {
    const res = await fetch('/chatRoom/chatList/api?' + params.toString());
    if (!res.ok) throw new Error(`서버 응답오류 ( 상태 코드 : ${res.status})`);
    const data = await res.json();
    if (!data.success) throw new Error('데이터 요청 실패');
    return data;
  } catch (error) {
    console.error('API 통신 에러:', error);
    throw error;
  }
}

// 채팅방 UI 렌더링
function renderChatRoomUI(room, messages, currentUserId) {
  const sportEmojiMap = {
    soccer: '⚽', basketball: '🏀', baseball: '⚾',
    tennis: '🎾', badminton: '🏸', tabletennis: '🏓', bowling: '🎳'
  };

  const icon = document.getElementById('chatRoomIcon');
  if (icon) icon.textContent = sportEmojiMap[room.sport] || (room.crewType === 'instant' ? '⚡' : '🏃');

  const chatRoomName = document.getElementById('chatRoomName');
  if (chatRoomName) chatRoomName.innerText = room.name;

  // 뮤트 버튼 상태 초기화
  const muteBtn = document.getElementById('muteBtn');
  if (muteBtn) {
    muteBtn.dataset.muted = room.isMuted || false;
    muteBtn.textContent = room.isMuted ? '🔇' : '🔔';
  }

  chatMessages.innerHTML = '';
  chatInput.disabled = false;
  chatInput.placeholder = '메시지를 입력하세요...';
  document.getElementById('chatSendBtn').style.display = 'inline-block';

  if (!messages || messages.length === 0) {
    chatMessages.innerHTML = `<div class="chat-date-divider">메시지를 남기세요!</div>`;
    return;
  }

  chatMessages.insertAdjacentHTML('beforeend', `<div class="chat-date-divider">오늘</div>`);

  messages.forEach(msg => {
    const isMine = msg.sender && String(msg.sender._id) === String(currentUserId);
    let msgHtml = '';
    if (isMine) {
      msgHtml = `
        <div class="msg-row mine">
          <div class="msg-content">
            <div class="msg-bubble mine">${escapeHTML(msg.content)}</div>
            <div class="msg-time">${formatTime(msg.createdAt)}</div>
          </div>
        </div>`;
    } else {
      msgHtml = `
        <div class="msg-row">
          <div class="msg-content">
            <div class="msg-sender">${escapeHTML(msg.sender ? msg.sender.name : '알 수 없음')}</div>
            <div class="msg-bubble theirs">${escapeHTML(msg.content)}</div>
            <div class="msg-time">${formatTime(msg.createdAt)}</div>
          </div>
        </div>`;
    }
    chatMessages.insertAdjacentHTML('beforeend', msgHtml);
  });

  scrollToBottom();
}

// 채팅 메시지 전송
function sendChatMsg() {
  const msg = chatInput.value.trim();
  if (!msg || !window.currentRoomId) return;
  chatSocket.emit('chat message', msg);
  chatInput.value = '';
}

// 소켓으로 받은 메시지 렌더링
function renderChatMessage(data) {
  const myId = String(data.userId) === String(parsedUser._id);
  const row = document.createElement('div');
  if (myId) {
    row.className = 'msg-row mine';
    row.innerHTML = `
      <div class="msg-content">
        <div class="msg-bubble mine">${escapeHTML(data.chat)}</div>
        <div class="msg-time">${formatTime(new Date())}</div>
      </div>`;
  } else {
    row.className = 'msg-row';
    row.innerHTML = `
      <div class="msg-content">
        <div class="msg-sender">${escapeHTML(data.userName || '알 수 없음')}</div>
        <div class="msg-bubble theirs">${escapeHTML(data.chat)}</div>
        <div class="msg-time">${formatTime(new Date())}</div>
      </div>`;
  }
  chatMessages.appendChild(row);
  scrollToBottom();

  const targetRoomId = data.roomId || window.currentRoomId;
  const roomItem = document.querySelector(`.chat-room-item[data-id="${targetRoomId}"]`);
  if (roomItem) {
    roomItem.dataset.lastAt = new Date().toISOString();
    const preview = roomItem.querySelector('.cr-preview span');
    if (preview) preview.textContent = data.chat;
    updateAllTimeAgo();
  }
}

// 알림 뮤트 토글
async function toggleMute() {
  const btn = document.getElementById('muteBtn');
  if (!window.currentRoomId) return;

  try {
    const res = await fetch(`/chatRoom/${window.currentRoomId}/mute`, { method: 'PATCH' });
    const data = await res.json();
    if (data.success) {
      btn.dataset.muted = data.isMuted;
      btn.textContent = data.isMuted ? '🔇' : '🔔';
    }
  } catch (error) {
    console.error('뮤트 처리 실패', error);
  }
}

// 입장/퇴장 메시지 렌더링
function inOutMessage(message) {
  const div = document.createElement('div');
  div.textContent = message;
  chatMessages.appendChild(div);
  scrollToBottom();
}

// 마지막 메시지 시간 계산
function timeAgo(dateStr) {
  if (!dateStr || dateStr === 'null') return '메시지 없음';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return Math.floor(diff / 60) + '분 전';
  if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
  return Math.floor(diff / 86400) + '일 전';
}

// 모든 채팅방 시간 업데이트
function updateAllTimeAgo() {
  document.querySelectorAll('.chat-room-item').forEach(item => {
    const lastAt = item.dataset.lastAt;
    const timeEl = item.querySelector('.cr-time-ago');
    if (timeEl) timeEl.textContent = timeAgo(lastAt);
  });
}

updateAllTimeAgo();
setInterval(updateAllTimeAgo, 60000);

// 스크롤 맨 아래로
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// XSS 방지
function escapeHTML(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

scrollToBottom();

// 초기 진입 시 roomId 있으면 소켓 연결
if (roomId && roomId !== '') {
  window.currentRoomId = roomId;
  connectSocket(roomId);
} else {
  document.getElementById('chatSendBtn').style.display = 'none';
}
