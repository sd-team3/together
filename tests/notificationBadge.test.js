const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function browserElement() {
    return {
        listeners: {},
        style: {},
        addEventListener(event, listener) { this.listeners[event] = listener; },
        setAttribute(key, value) { this[key] = value; },
        appendChild() {}
    };
}

test('badge counts saved and live notifications, then updates on read and read all', async () => {
    const source = fs.readFileSync(require.resolve('../public/js/handlers/notiHandler.js'), 'utf8');
    const elements = new Map();
    const elementFor = key => {
        if (!elements.has(key)) elements.set(key, browserElement());
        return elements.get(key);
    };
    const socket = {};
    let stored = [{ _id: 'first' }];
    let visibleView;
    let onRead;
    const context = {
        console,
        document: { getElementById: elementFor, querySelector: elementFor, createElement: browserElement },
        window: browserElement(),
        io: () => ({ on: (event, listener) => { socket[event] = listener; } }),
        initFriendSocket() {},
        renderUnreadNoti(notices, list, onChange) {
            visibleView = 'unread';
            onRead = onChange;
        },
        renderReadNoti() { visibleView = 'read'; },
        renderChatNoti() {},
        setTimeout() {},
        fetch: async url => {
            if (url === '/noti/read-all') stored = [];
            return { ok: true, json: async () => url === '/noti/unread' ? [...stored] : [] };
        }
    };
    vm.createContext(context);
    vm.runInContext(source.replace(/^import .*;$/gm, '').replace(/export /g, ''), context);
    const tick = () => new Promise(resolve => setImmediate(resolve));
    const badge = elementFor('noti-badge');
    context.initNotiSocket({ _id: 'user' });
    await tick();
    assert.equal(badge.textContent, '1');
    assert.equal(badge.hidden, false);

    const next = { _id: 'second', title: '가입 신청' };
    stored.push(next);
    socket.CREW_APPLICATION(next);
    socket.CREW_APPLICATION(next);
    assert.equal(badge.textContent, '2');
    await tick();
    assert.equal(badge.textContent, '2');
    stored.shift();
    await onRead();
    assert.equal(badge.textContent, '1');

    await elementFor('.read-noti').listeners.click();
    const reminder = { _id: 'third', title: '곧 모임이 시작돼요' };
    stored.push(reminder);
    socket.ACTIVITY_REMINDER(reminder);
    socket['chat noti']({ roomId: 'room', roomName: '모임', content: '안녕하세요' });
    await tick();
    assert.equal(badge.textContent, '3');
    assert.equal(visibleView, 'read');
    assert.equal(elementFor('noti-btn')['aria-label'], '알림, 읽지 않은 알림 3개');

    await elementFor('.read-all').listeners.click();
    assert.equal(badge.hidden, true);
    assert.equal(badge.textContent, '0');
    assert.equal(visibleView, 'read');
});
