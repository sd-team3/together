function confirmJoin() {
    document.getElementById('modal-join').classList.add('show');
}

function closeJoinModal() {
    document.getElementById('modal-join').classList.remove('show');
}

async function doJoin() {
    const crewId = document.getElementById('join-btn').dataset.id;
    
    try {
        const res = await fetch('/crew/' + crewId + '/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (res.ok) {
            closeJoinModal();
            document.getElementById('join-btn').disabled = true;
            document.getElementById('join-btn').textContent = '신청 완료';
        }
    } catch (error) {
        console.error(error);
    }
}