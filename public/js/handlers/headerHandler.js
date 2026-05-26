const notiBtn = document.getElementById('noti-btn');
const notiPopup = document.getElementById('noti-popup');
const goPage = (url)=>{ location.href = url };

if(document.getElementById('login').innerText === 'true') {
    document.getElementById('mypage-btn').addEventListener('click', ()=>{ goPage('/user/mypage') });
    document.getElementById('logout-btn').addEventListener('click', ()=>{ goPage('/user/logout') });
} else {
    document.getElementById('login-btn').addEventListener('click', ()=>{ goPage('/user/login') });
    document.getElementById('signup-btn').addEventListener('click', ()=>{ goPage('/user/signup') });
}

notiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = notiPopup.style.display === 'block';
    notiPopup.style.display = isOpen ? 'none' : 'block';
});

              
            