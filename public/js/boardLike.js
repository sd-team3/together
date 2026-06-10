// public/js/boardLike.js
async function toggleLike(userId) {
    liked = !liked;
    likeCount += liked ? 1 : -1;

    const btn = document.getElementById('like-btn');
    const icon = btn.querySelector('.like-icon');
    const count = document.getElementById('like-count');
    const boardId = btn.dataset.id;

    icon.textContent = liked ? '❤️' : '🤍';
    count.textContent = likeCount;
    btn.classList.toggle('liked', liked);

    try {
        await fetch('/community/list/' + boardId + '/like', {  // ✅ 게시판 URL
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ liked })
        });
    } catch (error) {
        // 실패 시 되돌림
        liked = !liked;
        likeCount += liked ? 1 : -1;
        icon.textContent = liked ? '❤️' : '🤍';
        count.textContent = likeCount;
        btn.classList.toggle('liked', liked);
    }
}

if (liked) {
    document.getElementById('like-btn').querySelector('.like-icon').textContent = '❤️';
    document.getElementById('like-btn').classList.add('liked');
}