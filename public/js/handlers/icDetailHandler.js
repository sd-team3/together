document.addEventListener('DOMContentLoaded', () => {

    if (!IS_HOST && !IS_MEMBER) {
        // 미가입자 - 참가 신청만
        document.getElementById('btn-apply')?.addEventListener('click', async () => {
            try {
                const res = await fetch(`/instant/${CREW_ID}/apply`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    alert('참가 신청이 완료됐습니다!');
                    location.reload();
                } else {
                    alert(data.message || '신청에 실패했습니다');
                }
            } catch (e) { alert('서버 오류가 발생했습니다'); }
        });
        return;
    }

    // ── 멤버/호스트 공통 ──
    const members = MEMBERS_DATA;
    let currentFilter = 'all', searchVal = '', selectedId = null;
    const searchInput = document.getElementById('search-input');

    const avList = [
        {bg:'#fff3cd',color:'#b45309'},{bg:'#E1F5EE',color:'#085041'},
        {bg:'#EEF3FF',color:'#003DB3'},{bg:'#FFF4EC',color:'#CC4500'},
        {bg:'#E8FAF0',color:'#007A33'},{bg:'#FBEAF0',color:'#72243E'}
    ];
    function av(name) { return avList[(name?.charCodeAt(0)||0) % avList.length]; }
    function roleClass(r) { return r === 'host' ? 'role-leader' : 'role-member'; }
    function roleLabel(r) { return r === 'host' ? '모임장' : '멤버'; }
    function statusClass(s) { return s === 'confirmed' ? 'status-confirmed' : 'status-pending'; }
    function statusLabel(s) { return s === 'confirmed' ? '참가확정' : '노쇼'; }

    function filtered() {
        return members.filter(m => {
            const ok = currentFilter === 'all' ? true
                : currentFilter === 'host' ? m.role === 'host'
                : currentFilter === 'confirmed' ? m.status === 'confirmed'
                : currentFilter === 'noshow' ? m.status === 'noshow'
                : true;
            return ok && m.name.includes(searchVal);
        });
    }

    function render() {
        const list = filtered();
        const tbody = document.getElementById('member-tbody');
        const hadFocus = document.activeElement === searchInput;
        
        if (!list.length) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="7">조건에 맞는 참여자가 없어요</td></tr>';
        } else {
            tbody.innerHTML = list.map(m => {
                const a = av(m.name);
                return `<tr class="member-row${selectedId === m.id ? ' selected' : ''}" data-id="${m.id}">
                    <td><div class="member-cell">
                        <div class="member-av" style="background:${a.bg};color:${a.color}">${m.name.slice(0,2)}</div>
                        <div><div class="member-name">${m.name}</div><div class="member-phone">${m.tel}</div></div>
                    </div></td>
                    <td><span class="role-badge ${roleClass(m.role)}">${roleLabel(m.role)}</span></td>
                    <td><span class="status-pill ${statusClass(m.status)}">${statusLabel(m.status)}</span></td>
                    <td style="font-size:12.5px;color:var(--text-2)">${m.gender}</td>
                    <td style="font-size:12.5px;color:var(--text-2)">${m.age}세</td>
                    <td style="font-size:12px;color:var(--text-3);font-family:'DM Mono',monospace">${m.joinedAt}</td>
                    <td><div class="action-btns">
                        <button class="act-btn" data-action="detail" data-id="${m.id}" title="상세보기">👤</button>
                        ${IS_HOST && m.role !== 'host' ? `<button class="act-btn danger" data-action="kick" data-id="${m.id}" title="강퇴">✕</button>` : ''}
                    </div></td>
                </tr>`;
            }).join('');
        }
        
        if (hadFocus) searchInput.focus();
    }

    function openDetail(id) {
        const m = members.find(x => x.id === id);
        if (!m) return;
        selectedId = id;
        const a = av(m.name);
        const dpAv = document.getElementById('dp-av');
        dpAv.textContent = m.name.slice(0,2);
        dpAv.style.background = a.bg;
        dpAv.style.color = a.color;
        document.getElementById('dp-name').textContent = m.name;
        document.getElementById('dp-role-badge').innerHTML = `<span class="role-badge ${roleClass(m.role)}">${roleLabel(m.role)}</span>`;
        document.getElementById('dp-status-badge').innerHTML = `<span class="status-pill ${statusClass(m.status)}">${statusLabel(m.status)}</span>`;
        document.getElementById('dp-phone').textContent = m.tel;
        document.getElementById('dp-gender').textContent = m.gender;
        document.getElementById('dp-age').textContent = m.age + '세';

        const noshowBtn = document.getElementById('dp-noshow-btn');
        const kickBtn = document.getElementById('dp-kick-btn');
        if (noshowBtn && kickBtn) {
            if (m.role === 'host') {
                noshowBtn.style.display = 'none';
                kickBtn.style.display = 'none';
            } else {
                noshowBtn.style.display = '';
                kickBtn.style.display = '';
                noshowBtn.textContent = m.status === 'noshow' ? '노쇼 취소' : '노쇼 처리';
                const newNoshow = noshowBtn.cloneNode(true);
                noshowBtn.parentNode.replaceChild(newNoshow, noshowBtn);
                newNoshow.addEventListener('click', () => handleNoshow(id, m.status === 'noshow'));
                const newKick = kickBtn.cloneNode(true);
                kickBtn.parentNode.replaceChild(newKick, kickBtn);
                newKick.addEventListener('click', () => handleKick(id));
            }
        }
        document.getElementById('detail-panel').classList.add('show');
        render();
    }

    function closeDetail() {
        selectedId = null;
        document.getElementById('detail-panel').classList.remove('show');
        render();
    }

    async function handleNoshow(userId, isNoshow) {
        const url = isNoshow
            ? `/instant/${CREW_ID}/noshow/${userId}/cancel`
            : `/instant/${CREW_ID}/noshow/${userId}`;
        try {
            const res = await fetch(url, { method: 'POST' });
            const data = await res.json();
            if (data.success) location.reload();
            else alert(data.message || '처리에 실패했습니다');
        } catch (e) { alert('서버 오류가 발생했습니다'); }
    }

    async function handleKick(userId) {
        if (!confirm('정말 강퇴하시겠어요?')) return;
        try {
            const res = await fetch(`/instant/list/${crewId}/kick/${userId}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) location.reload();
            else alert(data.message || '강퇴에 실패했습니다');
        } catch (e) { alert('서버 오류가 발생했습니다'); }
    }

    async function handleApp(appId, action) {
        const card = document.querySelector(`[data-app-id="${appId}"]`);
        const appId = card?.dataset?.appId;
        try {
            const res = await fetch(`/instant/join/${appId}/${action}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                card.classList.add('done');
                card.querySelectorAll('.app-btn').forEach(b => b.textContent = action === 'accept' ? '수락 완료' : '거절 완료');
            } else alert(data.message || '처리에 실패했습니다');
        } catch (e) { alert('서버 오류가 발생했습니다'); }
    }

    // 이벤트 리스너
    document.getElementById('member-tbody').addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (btn) {
            e.stopPropagation();
            const id = btn.dataset.id;
            if (btn.dataset.action === 'detail') openDetail(id);
            if (btn.dataset.action === 'kick') handleKick(id);
            return;
        }
        const row = e.target.closest('.member-row');
        if (row) { selectedId === row.dataset.id ? closeDetail() : openDetail(row.dataset.id); }
    });

    document.getElementById('dp-close-btn').addEventListener('click', closeDetail);

    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('on'));
            btn.classList.add('on');
            currentFilter = btn.dataset.filter;
            closeDetail();
            render();
        });
    });

    searchInput.addEventListener('keyup', e => {
        searchVal = searchInput.value;
        render();
    });

    document.querySelectorAll('.crew-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.crew-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('sec-' + tab.dataset.tab).classList.add('active');
            closeDetail();
        });
    });

    document.querySelector('.app-list')?.addEventListener('click', e => {
        const btn = e.target.closest('.app-btn');
        if (!btn) return;
        const card = btn.closest('.app-card');
        const appId = card?.dataset?.appId;
        if (!appId) return;
        if (btn.classList.contains('accept')) handleApp(appId, 'accept');
        if (btn.classList.contains('reject')) handleApp(appId, 'reject');
    });

    document.querySelectorAll('.page-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.page-tab').forEach(t => {
                t.style.borderBottom = 'none';
                t.style.color = 'var(--text-3)';
            });
            tab.style.borderBottom = '2px solid var(--text)';
            tab.style.color = 'var(--text)';
            document.getElementById('sec-detail').style.display = tab.dataset.ptab === 'detail' ? '' : 'none';
            document.getElementById('sec-chat').style.display = tab.dataset.ptab === 'chat' ? '' : 'none';
        });
    });

    render();

    // 삭제 모달
    function closeModal() { document.getElementById('modal-delete').classList.remove('show'); }
    document.getElementById('delete-open-btn')?.addEventListener('click', () => {
        document.getElementById('modal-delete').classList.add('show');
    });
    document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);
    document.getElementById('modal-delete')?.addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
        try {
            const res = await fetch(`/instant/delete/${CREW_ID}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) location.href = '/instant/instant';
            else alert(data.message || '삭제에 실패했습니다');
        } catch (e) { alert('서버 오류가 발생했습니다'); }
        finally { closeModal(); }
    });

});