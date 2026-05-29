// 필터 상태를 담고 있는 객체
export const selectedFilters = { 
  day: [],
  sport: [],
  ageRange: [],
  state: '',
  city: '',
  isAutoAccept: '',
  isRecruiting : false
};

// 필터 상태 초기화 함수
export function resetFiltersState() {
  selectedFilters.day = [];
  selectedFilters.sport = [];
  selectedFilters.ageRange = [];
  selectedFilters.state = '';
  selectedFilters.city = '';
  selectedFilters.isRecruiting = false;
}