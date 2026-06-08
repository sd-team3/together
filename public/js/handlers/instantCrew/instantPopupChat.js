const _mpChatRooms = [
    { id: 'room1', name: '전체 채팅방', lastMsg: '모임 장소 확인해주세요', time: '오후 3:12', count: 3 },
    { id: 'room2', name: '번개 공지방', lastMsg: '내일 비 예보 확인!', time: '오전 10:05', count: 0 },
];

export function renderChatTab(body, crew, isHost, topTabs) {
    const chatListHTML = _mpChatRooms.length === 0
        ? `<div style="padding:60px 20px;text-align:center;color:#aaa;">
            <div style="font-size:40px;margin-bottom:12px;">💬</div>
            <div style="font-size:15px;font-weight:600;color:#555;margin-bottom:6px;">채팅방이 없어요</div>
            <div style="font-size:13px;">채팅방을 만들어 멤버들과 소통해보세요!</div>
           </div>`
        : _mpChatRooms.map(r => `
            <div onclick="mpOpenChatRoom('${r.id}')"
              style="display:flex;align-items:center;gap:14px;padding:14px 16px;
                border:1px solid #f0f0f0;border-radius:12px;margin-bottom:10px;cursor:pointer;">
                <div style="width:40px;height:40px;border-radius:50%;background:#EEF3FF;color:#003DB3;
                    font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">💬</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:14px;font-weight:600;">${r.name}</div>
                    <div style="font-size:12px;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.lastMsg}</div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                    <div style="font-size:11px;color:#aaa;">${r.time}</div>
                    ${r.count > 0 ? `<div style="margin-top:4px;background:#222;color:#fff;font-size:11px;font-weight:700;border-radius:99px;padding:1px 7px;display:inline-block;">${r.count}</div>` : ''}
                </div>
            </div>`).join('');

    body.innerHTML = `
        <div class="popup-title" style="margin-bottom:16px;">${crew.title}</div>
        ${topTabs}
        <div id="mp-chat-list">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                <div style="font-size:14px;font-weight:700;">채팅방 목록</div>
                ${isHost ? `<button onclick="mpCreateChatRoom()"
                    style="padding:6px 14px;border-radius:8px;background:#222;color:#fff;
                        border:none;font-size:12px;font-weight:600;cursor:pointer;">+ 채팅방 만들기</button>` : ''}
            </div>
            ${chatListHTML}
        </div>
        <div id="mp-chat-room" style="display:none;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                <button onclick="mpCloseChatRoom()"
                    style="background:none;border:none;cursor:pointer;font-size:14px;color:#aaa;">← 목록</button>
                <div id="mp-chat-room-title" style="font-size:15px;font-weight:700;"></div>
            </div>
            <div id="mp-chat-messages"
                style="height:300px;overflow-y:auto;border:1px solid #f0f0f0;border-radius:10px;
                    padding:16px;display:flex;flex-direction:column;gap:10px;background:#fafafa;margin-bottom:12px;">
                <div style="text-align:center;color:#aaa;font-size:13px;margin:auto;">
                    아직 메시지가 없어요. 첫 메시지를 보내보세요!
                </div>
            </div>
            <div style="display:flex;gap:8px;">
                <input id="mp-chat-input" type="text" placeholder="메시지를 입력하세요..."
                    style="flex:1;padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;"
                    onkeydown="if(event.key==='Enter') mpSendMessage()" />
                <button onclick="mpSendMessage()"
                    style="padding:10px 18px;border-radius:8px;background:#222;color:#fff;
                        border:none;font-size:13px;font-weight:600;cursor:pointer;">전송</button>
            </div>
        </div>`;
}

window.mpOpenChatRoom = (roomId) => {
    const room = _mpChatRooms.find(r => r.id === roomId);
    if (!room) return;
    document.getElementById('mp-chat-room-title').textContent = room.name;
    document.getElementById('mp-chat-list').style.display = 'none';
    document.getElementById('mp-chat-room').style.display = '';
};

window.mpCloseChatRoom = () => {
    document.getElementById('mp-chat-room').style.display = 'none';
    document.getElementById('mp-chat-list').style.display = '';
};

window.mpSendMessage = () => {
    const input = document.getElementById('mp-chat-input');
    const text = input.value.trim();
    if (!text) return;
    const box = document.getElementById('mp-chat-messages');
    const msg = document.createElement('div');
    msg.style.cssText = 'align-self:flex-end;background:#222;color:#fff;padding:8px 12px;border-radius:12px 12px 2px 12px;font-size:13px;max-width:70%';
    msg.textContent = text;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
    input.value = '';
};

window.mpCreateChatRoom = () => {
    alert('채팅방 만들기 기능은 준비 중이에요!');
};