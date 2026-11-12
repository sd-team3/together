export function renderBoards(boards) {
    const body = document.getElementById('comm-posts');
    body.replaceChildren();
    if (!boards?.length) {
        body.innerHTML = '<tr><td colspan="6" class="community-empty">아직 게시글이 없습니다. 첫 이야기를 남겨보세요.</td></tr>';
        return;
    }
    const labels = { question: '질문', tip: '팁/정보', free: '자유' };
    for (const board of boards) {
        const row = document.createElement('tr');
        const cell = (text, className) => {
            const td = document.createElement('td');
            td.className = className;
            td.textContent = text;
            row.append(td);
            return td;
        };
        cell(labels[board.category] || '자유', 'community-category category-' + board.category);
        const title = cell('', 'community-title-cell');
        const link = document.createElement('a');
        link.className = 'community-post-link';
        link.href = '/community/list/' + encodeURIComponent(board._id);
        link.textContent = board.title;
        title.append(link);
        if (board.commentsCount > 0) {
            const comments = document.createElement('span');
            comments.className = 'community-comment-count';
            comments.textContent = board.commentsCount;
            comments.setAttribute('aria-label', '댓글 ' + board.commentsCount + '개');
            title.append(comments);
        }
        if (board.file) {
            const attachment = document.createElement('span');
            attachment.textContent = '▧';
            attachment.title = '이미지 첨부';
            attachment.className = 'community-attachment';
            title.append(attachment);
        }
        cell(board.author?.name || '탈퇴한 회원', 'community-author');
        const date = new Date(board.createdAt);
        const today = new Date();
        const sameDay = date.toDateString() === today.toDateString();
        const dateCell = cell(sameDay ? date.toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit', hour12:false}) : date.toLocaleDateString('ko-KR', {year:'2-digit', month:'2-digit', day:'2-digit'}), 'community-date');
        dateCell.title = date.toLocaleString('ko-KR');
        cell(board.views || 0, 'community-views');
        cell(board.reputation || 0, 'community-reputation');
        body.append(row);
    }
}

export function renderCommPaging(currentPage, totalPages) {
    const pagination = document.getElementById('commPagination');
    if (!pagination) return;

    let html = '';

    if (currentPage > 1) {
        html += `<li class="page-item"><button type="button" class="page-link" data-page="${currentPage - 1}">이전</button></li>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                    <button type="button" class="page-link" data-page="${i}">${i}</button>
                 </li>`;
    }

    if (currentPage < totalPages) {
        html += `<li class="page-item"><button type="button" class="page-link" data-page="${currentPage + 1}">다음</button></li>`;
    }

    pagination.innerHTML = html;
}
