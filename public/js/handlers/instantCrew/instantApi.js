export async function apiGetCrew(crewId) {
    const res = await fetch(`/instant/api/${crewId}`);
    return res.json();
}

export async function apiApply(crewId) {
    const res = await fetch(`/instant/application/${crewId}`, { method: 'POST' });
    return res.json();
}

export async function apiJoinProcess(appId, action) {
    const res = await fetch(`/instant/join/${appId}/${action}`, { method: 'POST' });
    return res.json();
}

export async function apiNoshow(crewId, userId) {
    const res = await fetch(`/instant/list/${crewId}/noshow/${userId}`, { method: 'POST' });
    return res.json();
}

export async function apiKick(crewId, userId) {
    const res = await fetch(`/instant/list/${crewId}/kick/${userId}`, { method: 'POST' });
    return res.json();
}

export async function apiDeleteCrew(crewId) {
    const res = await fetch(`/instant/delete/${crewId}`, { method: 'POST' });
    return res.json();
}