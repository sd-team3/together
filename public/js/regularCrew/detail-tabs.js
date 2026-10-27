const tabs = [...document.querySelectorAll('[data-crew-tab]')];

function selectTab(name, focus = false) {
    const selected = tabs.find(tab => tab.dataset.crewTab === name) || tabs[0];
    tabs.forEach(tab => {
        const active = tab === selected;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        document.getElementById(tab.getAttribute('aria-controls')).classList.toggle('active', active);
    });
    if (focus) selected.focus();
}

tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
        selectTab(tab.dataset.crewTab);
        history.replaceState(null, '', '#' + tab.dataset.crewTab);
    });
    tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        selectTab(tabs[next].dataset.crewTab, true);
        history.replaceState(null, '', '#' + tabs[next].dataset.crewTab);
    });
});
selectTab(location.hash.slice(1));
window.addEventListener('hashchange', () => selectTab(location.hash.slice(1)));

document.querySelectorAll('[data-crew-confirm]').forEach(form => {
    form.addEventListener('submit', event => {
        if (!confirm(form.dataset.crewConfirm)) event.preventDefault();
    });
});

async function postAction(button, url, messageId) {
    const message = document.getElementById(messageId);
    button.disabled = true;
    message.textContent = '처리 중입니다…';
    try {
        const response = await fetch(url, { method: 'POST', headers: { Accept: 'application/json' } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || '요청을 처리하지 못했습니다.');
        location.reload();
    } catch (error) {
        message.textContent = error.message;
        button.disabled = false;
    }
}

document.getElementById('panel-schedule').addEventListener('click', event => {
    const button = event.target.closest('[data-activity-id]');
    if (!button || button.disabled) return;
    postAction(button, `/regular/act/entry/${encodeURIComponent(button.dataset.activityId)}`, 'schedule-entry-message');
});

document.getElementById('panel-members').addEventListener('click', event => {
    const button = event.target.closest('[data-application-id], [data-kick-user]');
    if (!button || button.disabled) return;
    if (button.dataset.kickUser) {
        // 기존 관리 화면의 강퇴 버튼은 서버 처리 없이 안내만 제공했습니다.
        document.getElementById('member-action-message').textContent = '강퇴 기능은 아직 준비 중입니다.';
        return;
    }
    postAction(button, `/regular/join/${encodeURIComponent(button.dataset.applicationId)}/${button.dataset.applicationAction}`, 'member-action-message');
});
