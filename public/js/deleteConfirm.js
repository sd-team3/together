function confirmDelete(crewId) {
    document.getElementById('delete-form').action = '/crew/delete/' + crewId;
    document.getElementById('modal-delete').classList.add('show');
}

function confirmWithdraw(crewId) {
    document.getElementById('delete-form').action = '/crew/withdraw/' + crewId;
    document.getElementById('modal-delete').classList.add('show');
}

function deleteModal() {
    document.getElementById('modal-delete').classList.remove('show');
}

// 해산이나 탈퇴 누를 때, 팝업창으로 확인하는 스크립트임.
// 사용시 ejs 상단에 <script src="/js/deleteConfirm.js"></script> 추가 + 본문 아래에 모달용 div 제작