export function renderBoards(boards) {
    const commPosts = document.getElementById('comm-posts');
    commPosts.innerHTML = '';

    if (!boards || boards.length === 0) {
        commPosts.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-3)">해당 카테고리에 게시글이 없습니다.</div>';
        return;
    }

    const categoryMap = { question: '질문', tip: '팁/정보', free: '자유', all: '전체' };

    boards.forEach(board => {
        const card = document.createElement('div');
        card.className = 'post-item';
        card.dataset.type = board.category;

        const categoryLabel = categoryMap[board.category] || board.category;
        const excerptHtml = board.content
            ? `<div class="post-excerpt">${board.content.substring(0, 60)}...</div>`
            : '';

        card.innerHTML = `
            <div class="post-sport-av">📝</div>
            <div>
                <div class="post-title">${board.title}</div>
                <div class="post-meta">
                    <span>${categoryLabel}</span>
                    <span>${board.author ? board.author.name : '익명'}</span>
                    <span>${getTimeAgo(board.createdAt)}</span>
                </div>
                ${excerptHtml}
                <div class="post-footer">
                    <div class="post-stat">❤️ ${board.reputation || 0}</div>
                    <div class="post-stat">💬 ${board.commentsCount || 0}</div>
                </div>
            </div>
        `;

        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            window.location.href = `/community/list/${board._id}`;
        });

        commPosts.appendChild(card);
    });
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

// 시간 포맷 유틸 (uiRender에서만 쓰니까 여기에)
function getTimeAgo(dateString) {
    const diff = new Date() - new Date(dateString);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 1) return `${days}일 전`;
    if (days === 1) return '어제';
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
}