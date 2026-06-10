import { apiJoinProcess, apiDeleteCrew } from './instantApi.js';

export let _mpCrewId       = null;
export let _mpCrewData     = null;
export let _mpIsHost       = false;
export let _mpTopTab       = 'crew';
export let _mpActiveTab    = 'member';
export let _mpActiveFilter = 'all';
export let _mpSearch       = '';

export function setPopupState(state) {
    if (state.crewId       !== undefined) _mpCrewId       = state.crewId;
    if (state.crewData     !== undefined) _mpCrewData     = state.crewData;
    if (state.isHost       !== undefined) _mpIsHost       = state.isHost;
    if (state.topTab       !== undefined) _mpTopTab       = state.topTab;
    if (state.activeTab    !== undefined) _mpActiveTab    = state.activeTab;
    if (state.activeFilter !== undefined) _mpActiveFilter = state.activeFilter;
    if (state.search       !== undefined) _mpSearch       = state.search;
}

function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)    return '방금 전';
    if (diff < 3600)  return Math.floor(diff / 60) + '분 전';
    if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
    return Math.floor(diff / 86400) + '일 전';
}

function buildRow(m, crewId, isHost) {
    const u = m.user || {};
    const uid = u._id ? u._id.toString() : '';
    console.log('u:', u, 'u._id:', u._id, 'uid:', uid);
    const isOwner = m.role === 'host';
    const pageData = JSON.parse(document.getElementById('page-data').textContent);
    const currentUserId = pageData.currentUserId;
    const isMe = currentUserId && u._id && u._id.toString() === currentUserId;
    const joinedAt = m.joinedAt
        ? new Date(m.joinedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' })
        : '-';
    const statusBadge = m.status === 'confirmed'
        ? '<span style="padding:2px 8px;border-radius:12px;background:#dcfce7;color:#15803d;font-size:12px;">참가확정</span>'
        : m.status === 'noshow'
            ? '<span style="padding:2px 8px;border-radius:12px;background:#fee2e2;color:#dc2626;font-size:12px;">노쇼</span>'
            : '<span style="padding:2px 8px;border-radius:12px;background:#fef9c3;color:#ca8a04;font-size:12px;">대기중</span>';

    return `
        <tr style="border-bottom:1px solid #f0f0f0;">
            <td style="padding:10px 12px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="width:28px;height:28px;border-radius:50%;
                        background:${isOwner ? '#3b82f6' : '#e5e7eb'};
                        color:${isOwner ? '#fff' : '#555'};
                        display:flex;align-items:center;justify-content:center;
                        font-size:12px;font-weight:600;flex-shrink:0;">
                        ${(u.name || '?').charAt(0)}
                    </div>
                    <div>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span style="font-size:13px;font-weight:600;">${u.name || '멤버'}</span>
                            
                        </div>
                        <div style="font-size:11px;color:#aaa;">${u.tel || ''}</div>
                    </div>
                </div>
            </td>
            <td style="padding:10px 8px;">
                <span style="padding:2px 8px;border-radius:12px;font-size:12px;
                    background:${isOwner ? '#dbeafe' : '#f3f4f6'};
                    color:${isOwner ? '#1d4ed8' : '#555'};">
                    ${isOwner ? '모임장' : '일반'}
                </span>
            </td>
            <td style="padding:10px 8px;">${statusBadge}</td>
            <td style="padding:10px 8px;font-size:12px;color:#555;">
                ${u.gender === 'male' ? '남성' : u.gender === 'female' ? '여성' : '-'}
            </td>
            <td style="padding:10px 8px;font-size:12px;color:#555;">${u.age ? u.age + '세' : '-'}</td>
            <td style="padding:10px 8px;font-size:12px;color:#aaa;">${joinedAt}</td>
            <td style="padding:10px 8px;">
                ${isHost && !isOwner ? `
                    <button onclick="mpManageMember('${crewId}','${u._id}','${u.name || '멤버'}')"
                        style="width:28px;height:28px;border-radius:50%;border:1px solid #e5e7eb;
                            background:#fff;color:#555;font-size:14px;cursor:pointer;
                            display:flex;align-items:center;justify-content:center;">
                        👤
                    </button>` : ''}
            </td>
        </tr>`;
}

export function renderMemberPopupBody() {
    const body        = document.getElementById('mp-body');
    const crew        = _mpCrewData;
    const crewId      = _mpCrewId;
    const isHost      = _mpIsHost;
    const memberList  = crew.member.memberList;
    const pendingList = crew.pendingApps || [];
    const confirmed   = memberList.filter(m => m.status === 'confirmed');

    const isFull   = memberList.length >= crew.member.capacity;
    const isAlmost = !isFull && (memberList.length / crew.member.capacity) >= 0.8;
    const statusPill = isFull
        ? '<span class="pill pill-closed">마감</span>'
        : isAlmost
            ? '<span class="pill pill-warn">마감임박</span>'
            : '<span class="pill pill-open">참가가능</span>';

    const topTabs = `
    <div style="display:flex;align-items:center;border-bottom:2px solid #f0f0f0;margin-bottom:20px;">
        <button onclick="mpSetTopTab('crew')"
            style="padding:10px 18px;font-size:14px;font-weight:600;border:none;background:none;cursor:pointer;
                border-bottom:2px solid #222;color:#222;margin-bottom:-2px;">
            📋 모임
        </button>
        <div style="flex:1;"></div>
        <a href="/chatRoom/chatPage"
            style="display:flex;align-items:center;gap:4px;padding:6px 12px;border-radius:8px;
                background:#f4f4f5;color:#555;font-size:13px;font-weight:600;
                text-decoration:none;margin-bottom:4px;">
            💬 채팅방
            <span style="font-size:15px;">→</span>
        </a>
    </div>`;

    const stats = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px;">
            ${[
                ['전체 참여자', memberList.length,  '#222'],
                ['참가 확정',   confirmed.length,   '#22c55e'],
                ['모집 현황',   `${memberList.length} / ${crew.member.capacity}`, '#3b82f6'],
                ['신청 대기',   pendingList.length, '#f97316']
            ].map(([label, val, color]) => `
                <div style="background:#f8f8f8;border-radius:10px;padding:12px 8px;text-align:center;">
                    <div style="font-size:11px;color:#aaa;margin-bottom:4px;">${label}</div>
                    <div style="font-size:20px;font-weight:700;color:${color};">${val}</div>
                </div>`).join('')}
        </div>`;

    const tabs = `
        <div style="display:flex;gap:0;border-bottom:2px solid #f0f0f0;margin-bottom:16px;">
            ${[['member', '참여자 목록'], ['pending', '신청 대기']].map(([key, label]) => `
                <button onclick="mpSetTab('${key}')"
                    style="padding:10px 18px;font-size:13px;font-weight:600;border:none;background:none;cursor:pointer;
                        border-bottom:2px solid ${_mpActiveTab === key ? '#222' : 'transparent'};
                        color:${_mpActiveTab === key ? '#222' : '#aaa'};margin-bottom:-2px;">
                    ${label} ${key === 'member' ? memberList.length : pendingList.length}
                </button>`).join('')}
        </div>`;

    if (_mpActiveTab === 'pending') {
        const cards = pendingList.length === 0
            ? `<div style="padding:40px;text-align:center;color:#aaa;font-size:13px;">신청 대기 중인 멤버가 없어요</div>`
            : pendingList.map(app => {
                const u = app.userId || {};
                return `
                    <div style="background:#fff;border:1px solid #f0f0f0;border-radius:12px;padding:16px;margin-bottom:12px;">
                        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="width:40px;height:40px;border-radius:50%;background:var(--primary,#3b82f6);
                                    color:#fff;font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                    ${(u.name || '?').charAt(0)}
                                </div>
                                <div>
                                    <div style="font-size:14px;font-weight:700;">${u.name || '멤버'}</div>
                                    <div style="font-size:12px;color:#aaa;">${u.tel || ''}</div>
                                </div>
                            </div>
                            <div style="font-size:12px;color:#aaa;">${timeAgo(app.createdAt)}</div>
                        </div>
                        <div style="display:flex;gap:16px;font-size:12px;color:#555;margin-bottom:12px;">
                            ${u.gender ? `<span>${u.gender === 'male' ? '남성' : '여성'}</span>` : ''}
                            ${u.age ? `<span>${u.age}세</span>` : ''}
                            ${u.honor !== undefined ? `<span>⭐ 매너점수 ${u.honor}</span>` : ''}
                        </div>
                        ${isHost ? `
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
                                <button onclick="mpJoinProcess('${app._id}','accept','${crewId}')"
                                    style="padding:10px;border-radius:8px;border:1px solid #bbf7d0;
                                        background:#f0fdf4;color:#16a34a;font-size:13px;font-weight:600;cursor:pointer;">
                                    ✓ 수락
                                </button>
                                <button onclick="mpJoinProcess('${app._id}','reject','${crewId}')"
                                    style="padding:10px;border-radius:8px;border:1px solid #fecaca;
                                        background:#fff5f5;color:#ef4444;font-size:13px;font-weight:600;cursor:pointer;">
                                    ✕ 거절
                                </button>
                            </div>` : ''}
                    </div>`;
            }).join('');

        body.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <div class="popup-sport">${crew.sportKr || ''}</div>
                ${statusPill}
            </div>
            <div class="popup-title" style="margin-bottom:4px;">${crew.title}</div>
            <div style="font-size:13px;color:#aaa;margin-bottom:16px;">
                📍 ${crew.address?.state} ${crew.address?.city}
                &nbsp;·&nbsp; ⏰ ${crew.meetAt ? new Date(crew.meetAt).toLocaleString('ko-KR') : '미정'}
            </div>
            ${topTabs}${stats}${tabs}${cards}`;
        return;
    }

    const filterBar = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
            <div style="display:flex;gap:6px;flex:1;flex-wrap:wrap;">
                ${[['all', '전체'], ['host', '모임장'], ['confirmed', '참가확정'], ['noshow', '노쇼']].map(([key, label]) => `
                    <button onclick="mpSetFilter('${key}')"
                        style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;
                            border:1px solid ${_mpActiveFilter === key ? '#222' : '#e5e7eb'};
                            background:${_mpActiveFilter === key ? '#222' : '#fff'};
                            color:${_mpActiveFilter === key ? '#fff' : '#555'};">
                        ${label}
                    </button>`).join('')}
            </div>
            <div style="position:relative;">
                <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#aaa;font-size:13px;">🔍</span>
                <input id="mp-search" type="text" placeholder="이름 검색" value="${_mpSearch}"
                    oninput="mpSetSearch(this.value)"
                    style="padding:6px 12px 6px 30px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;width:130px;outline:none;">
            </div>
        </div>`;

    const filtered = memberList.filter(m => {
        const name = (m.user?.name || '').toLowerCase();
        const matchSearch = !_mpSearch || name.includes(_mpSearch.toLowerCase());
        const matchFilter =
            _mpActiveFilter === 'all'       ? true :
            _mpActiveFilter === 'host'      ? m.role === 'host' :
            _mpActiveFilter === 'confirmed' ? m.status === 'confirmed' :
            _mpActiveFilter === 'noshow'    ? m.status === 'noshow' : true;
        return matchSearch && matchFilter;
    });

    const rows = filtered.length === 0
        ? `<tr><td colspan="7" style="padding:30px;text-align:center;color:#aaa;font-size:13px;">해당하는 멤버가 없어요</td></tr>`
        : filtered.map(m => buildRow(m, crewId, isHost)).join('');

    body.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <div class="popup-sport">${crew.sportKr || ''}</div>
            ${statusPill}
        </div>
        <div class="popup-title" style="margin-bottom:4px;">${crew.title}</div>
        <div style="font-size:13px;color:#aaa;margin-bottom:16px;">
            📍 ${crew.address?.state} ${crew.address?.city}
            &nbsp;·&nbsp; ⏰ ${crew.meetAt ? new Date(crew.meetAt).toLocaleString('ko-KR') : '미정'}
        </div>
        ${topTabs}${stats}${tabs}${filterBar}
        <div style="overflow-x:auto;border-radius:10px;border:1px solid #f0f0f0;">
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#f8f8f8;border-bottom:1px solid #eee;">
                        ${['멤버', '역할', '상태', '성별', '나이', '가입일', '관리'].map(h =>
                            `<th style="padding:8px 12px;font-size:11px;color:#aaa;font-weight:600;text-align:left;">${h}</th>`
                        ).join('')}
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        ${isHost ? `
            <div style="margin-top:16px;">
                <button onclick="deleteCrew('${crewId}')"
                    style="padding:10px 20px;border-radius:8px;border:1px solid #fca5a5;
                        background:#fff5f5;color:#ef4444;font-size:13px;font-weight:600;cursor:pointer;">
                    🗑 모임 삭제
                </button>
            </div>` : ''}`;
}

window.mpSetTopTab = (tab) => { _mpTopTab = tab; renderMemberPopupBody(); };
window.mpSetTab    = (tab) => { _mpActiveTab = tab; _mpActiveFilter = 'all'; renderMemberPopupBody(); };
window.mpSetFilter = (f)   => { _mpActiveFilter = f; renderMemberPopupBody(); };
window.mpSetSearch = (val) => {
    _mpSearch = val;
    const memberList = _mpCrewData.member.memberList;
    const filtered = memberList.filter(m => {
        const name = (m.user?.name || '').toLowerCase();
        const matchSearch = !_mpSearch || name.includes(_mpSearch.toLowerCase());
        const matchFilter =
            _mpActiveFilter === 'all'       ? true :
            _mpActiveFilter === 'host'      ? m.role === 'host' :
            _mpActiveFilter === 'confirmed' ? m.status === 'confirmed' :
            _mpActiveFilter === 'noshow'    ? m.status === 'noshow' : true;
        return matchSearch && matchFilter;
    });
    const tbody = document.querySelector('#member-popup tbody');
    if (!tbody) return;
    tbody.innerHTML = filtered.length === 0
        ? `<tr><td colspan="7" style="padding:30px;text-align:center;color:#aaa;font-size:13px;">해당하는 멤버가 없어요</td></tr>`
        : filtered.map(m => buildRow(m, _mpCrewId, _mpIsHost)).join('');
};
window.mpJoinProcess = async (appId, action, crewId) => {
    const { apiJoinProcess } = await import('./instantApi.js');
    try {
        const result = await apiJoinProcess(appId, action);
        if (result.success) window.showMemberPopup(crewId);
        else alert(result.message || '처리 실패');
    } catch (e) { alert('서버 오류'); }
};
window.deleteCrew = async (crewId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { apiDeleteCrew } = await import('./instantApi.js');
    try {
        const result = await apiDeleteCrew(crewId);
        if (result.success) { document.getElementById('member-popup').classList.remove('show'); location.reload(); }
        else alert(result.message || '삭제 실패');
    } catch (e) { alert('서버 오류'); }
};