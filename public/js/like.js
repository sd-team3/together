async function toggleLike() {
  liked = !liked;
  likeCount += liked ? 1 : -1;

  const btn = document.getElementById('like-btn');
  const icon = btn.querySelector('.like-icon');
  const count = document.getElementById('like-count');
  const crewId = document.getElementById('like-btn').dataset.id;

  icon.textContent = liked ? '❤️' : '🤍';
  count.textContent = likeCount;
  btn.classList.toggle('liked', liked);

  try {
    await fetch('/crew/' + crewId + '/like', {
      method: 'POST',
      headers: {'Content-Type' : 'application/json'},
      body: JSON.stringify({liked})
    }); 
  } catch (error) {
    liked = !liked;
    likeCount += liked ? 1 : -1;
    icon.textContent = liked ? '❤️' : '🤍';
    count.textContent = likeCount;
    btn.classList.toggle('liked', liked);
    // 실패시 되돌림
  }
}

if (liked) {
  document.getElementById('like-btn').querySelector('.like-icon').textContent = '❤️';
  document.getElementById('like-btn').classList.add('liked');
}

