const toggle = document.getElementById('web-push-toggle');
const status = document.getElementById('web-push-status');
const endpoint = '/noti/web-push';

async function saveSubscription(method, subscription) {
    const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Together-Push': '1' },
        body: JSON.stringify(subscription || {})
    });
    if (!response.ok) throw new Error('알림 설정을 저장하지 못했어요.');
}

async function init() {
    if (!window.isSecureContext) {
        status.textContent = 'HTTPS 주소에서 휴대폰 알림을 켤 수 있어요.';
        return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        status.textContent = '알림을 지원하는 브라우저에서 열어주세요. 아이폰은 홈 화면에 추가한 뒤 열어주세요.';
        return;
    }

    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('알림 설정을 확인하지 못했어요.');
    const config = await response.json();
    if (!config.publicKey && !config.enabled) {
        status.textContent = '서버에 휴대폰 알림 설정이 필요해요.';
        return;
    }

    const publicKey = config.publicKey && Uint8Array.from(
        atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/')),
        char => char.charCodeAt(0)
    );
    await navigator.serviceWorker.register('/web-push-worker.js');
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    let enabled = config.enabled && Boolean(subscription) && Notification.permission === 'granted';

    function render() {
        toggle.disabled = !enabled && !publicKey;
        toggle.textContent = enabled ? '휴대폰 알림 끄기' : '휴대폰 알림 켜기';
        status.textContent = enabled ? '이 기기의 휴대폰 알림이 켜져 있어요.' : '이 기기의 휴대폰 알림이 꺼져 있어요.';
    }

    toggle.addEventListener('click', async () => {
        toggle.disabled = true;
        try {
            if (enabled) {
                await saveSubscription('DELETE');
                enabled = false;
                if (subscription && await subscription.unsubscribe()) subscription = null;
            } else {
                if (await Notification.requestPermission() !== 'granted') {
                    throw new Error('브라우저 또는 휴대폰 설정에서 알림을 허용해주세요.');
                }
                subscription = await registration.pushManager.getSubscription();
                subscription ||= await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: publicKey
                });
                await saveSubscription('PUT', subscription);
                enabled = true;
            }
            render();
        } catch (error) {
            render();
            status.textContent = error.name === 'Error' ? error.message : '알림 설정을 바꾸지 못했어요. 다시 시도해주세요.';
        }
    });
    render();
}

init().catch(() => {
    status.textContent = '휴대폰 알림을 준비하지 못했어요. 새로고침 후 다시 시도해주세요.';
});
