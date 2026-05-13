const notiBtn = document.getElementById('noti-btn');
const notiPopup = document.getElementById('noti-popup');

if(document.getElementById('login').innerText === 'true') {
    document.getElementById('mypage-btn').addEventListener('click', ()=>{ goPage('/user/mypage') });
    document.getElementById('logout-btn').addEventListener('click', ()=>{ goPage('/user/logout') });
} else {
    document.getElementById('login-btn').addEventListener('click', ()=>{ goPage('/user/login') });
    document.getElementById('signup-btn').addEventListener('click', ()=>{ goPage('/user/signup') });
}
let isNotiOpen = false;

notiBtn.addEventListener('click', ()=>{
    isNotiOpen = !isNotiOpen;
    notiPopup.style.display = isNotiOpen ? 'block' : 'none';
});

const goPage = (url)=>{ location.href = url };
              
            