function confirmDelete(crewId) {
    document.getElementById('delete-form').action = '/regular/delete/' + crewId;
    document.getElementById('modal-delete').classList.add('show');
}

function confirmWithdraw(crewId) {
    document.getElementById('delete-form').action = '/regular/withdraw/' + crewId;
    document.getElementById('modal-delete').classList.add('show');
}

function deleteModal() {
    document.getElementById('modal-delete').classList.remove('show');
}