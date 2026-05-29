// 데이터를 받아오는 함수
export async function fetchRegularCrewsData(page = 1, filters = {}) {
  const params = new URLSearchParams();
  
  params.append('page', page);

  // 받아온 값 있으면 보내기 (day, sport, ageRange는 배열로 받기)
  if (filters.day && filters.day.length > 0) {
    filters.day.forEach(value => params.append('day', value));
  }
  if (filters.sport && filters.sport.length > 0) {
    filters.sport.forEach(value => params.append('sport', value));
  }
  if (filters.ageRange && filters.ageRange.length > 0) {
    filters.ageRange.forEach(value => params.append('ageRange', value));
  }
  if (filters.state) params.append('state', filters.state);
  if (filters.city) params.append('city', filters.city);
  if (filters.isAutoAccept) params.append('isAutoAccept', filters.isAutoAccept);
  if (filters.isRecruiting) params.append('isRecruiting', filters.isRecruiting);

  try {
    const res = await fetch('/regular/api?' + params.toString());
    
    if (!res.ok) {
      throw new Error(`서버 응답 오류 (상태 코드: ${res.status})`);
    }

    const data = await res.json();

    if (!data.success) {
      throw new Error('데이터 요청 실패');
    }

    return data; 

  } catch (error) {
    console.error('API 통신 에러:', error);
    throw error; 
  }
}