export async function fetchBoards(category, page, sort = 'latest') {
    const params = new URLSearchParams({ page, sort });
    const res = await fetch(`/community/list/api/${category}?${params.toString()}`);

    if (!res.ok) throw new Error('서버 오류');
    return await res.json();
}

export async function toggleBoardLike(boardId) {
    const res = await fetch(`/community/list/${boardId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) throw new Error('좋아요 오류');
    return await res.json();
}