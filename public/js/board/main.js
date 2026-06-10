import { boardState } from './state.js';
import { fetchBoards } from './api.js';
import { renderBoards, renderCommPaging } from './uiRender.js';

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.comm-tab');
    const pagination = document.getElementById('commPagination');

    // 카테고리 탭 클릭
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');

            boardState.category = e.target.dataset.category;
            boardState.page = 1;
            loadBoards();
        });
    });

    // 인기/최신 정렬 버튼
    const periodBtns = document.querySelectorAll('.comm-period-btn');
    periodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            periodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            boardState.sort = btn.dataset.sort === 'popular' ? 'popular' : 'latest';
            boardState.page = 1;
            loadBoards();
        });
    });

    // 페이지네이션 클릭
    if (pagination) {
        pagination.addEventListener('click', (e) => {
            const btn = e.target.closest('.page-link');
            if (!btn) return;

            const targetPage = Number(btn.dataset.page);
            if (targetPage) {
                boardState.page = targetPage;
                loadBoards();
            }
        });
    }

    // 게시글 불러오기
    async function loadBoards() {
        const commPosts = document.getElementById('comm-posts');
        try {
            commPosts.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-3)">불러오는 중...</div>';

            const data = await fetchBoards(boardState.category, boardState.page, boardState.sort);
            renderBoards(data.boards);
            renderCommPaging(data.currentPage, data.totalPages);

        } catch (error) {
            console.error('게시글 로딩 오류:', error);
            commPosts.innerHTML = '<div style="text-align:center;padding:40px;color:red">게시글을 불러오지 못했습니다.</div>';
        }
    }

    // 초기 로드
    loadBoards();
});