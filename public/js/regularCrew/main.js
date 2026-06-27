import { selectedFilters, resetFiltersState } from './state.js';
import { fetchRegularCrewsData } from './api.js';
import { renderRegularCards, renderRegularPaging, renderSelectedChips } from './uiRender.js';

document.addEventListener('DOMContentLoaded', () => {
  const pagination = document.getElementById('regularPagination');

  // 화면 로드 다되면 실행하는 것
  if (pagination) {
    const initialCurrentPage = Number(pagination.dataset.currentPage) || 1;
    const initialTotalPages = Number(pagination.dataset.totalPages) || 1;
    renderRegularPaging(initialCurrentPage, initialTotalPages);
    renderProgressBars();
  }
});

// DOM 요소
const filterTabs = document.querySelectorAll('.filter-tab');
const filterOptionPanel = document.getElementById('filterOptionPanel');
const filterOptionTitle = document.getElementById('filterOptionTitle');
const filterOptionList = document.getElementById('filterOptionList');
const areaSelectBox = document.getElementById('areaSelectBox');
const optionGroups = document.querySelectorAll('.filter-option-group');
const optionBtns = document.querySelectorAll('.filter-option-btn');
const cityBtns = document.querySelectorAll('.city-btn');
const districtGroups = document.querySelectorAll('.district-group');
const districtBtns = document.querySelectorAll('.district-btn');
const resetFilterBtn = document.getElementById('resetFilterBtn');
const pagination = document.getElementById('regularPagination');
const btnRecruitingOnly = document.getElementById('btnRecruitingOnly');
const regFilterPanel = document.getElementById('reg-filter-panel');
const regularCardList = document.getElementById('regularCardList');
const districtGuide = document.querySelector('.district-guide');

if (btnRecruitingOnly) {
  btnRecruitingOnly.addEventListener('click', () => {
    // 버튼 색상 켜기/끄기
    btnRecruitingOnly.classList.toggle('active');
    // 상태 객체에 true/false 저장
    selectedFilters.isRecruiting = btnRecruitingOnly.classList.contains('active');
    loadRegularCrews(1);
  });
}

// 메인 데이터 로드 함수 
async function loadRegularCrews(page = 1) {
  try {
    const data = await fetchRegularCrewsData(page, selectedFilters);
    // 위에서 받아오고 컨트롤러에서 받아온 data의 크루 정보들 
    renderRegularCards(data.regularCrews);
    // 컨트롤러에서 받아온 페이징 정보
    renderRegularPaging(data.currentPage, data.totalPages); 
    renderProgressBars();
  } catch (error) {
    console.error('목록을 불러오는 데 실패했습니다.', error);
  }
}

// 탭 누르면 일어나는 변화들
  filterTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const filterType = tab.dataset.filter;
    
    filterTabs.forEach(btn => btn.classList.remove('active'));
    tab.classList.add('active');
    filterOptionPanel.style.display = 'block';
    
    if (filterType === 'area') {
      filterOptionList.classList.add('is-hidden');
      areaSelectBox.classList.add('active');
      filterOptionTitle.textContent = '지역 선택';
      return;
    }

    areaSelectBox.classList.remove('active');
    filterOptionList.classList.remove('is-hidden');

    optionGroups.forEach((group) => {
      group.classList.toggle('active', group.dataset.filterGroup === filterType);
    });

    const titleMap = { 'day': '요일 선택', 'sport': '운동 선택', 'ageRange': '연령 선택' };
    if (titleMap[filterType]) filterOptionTitle.textContent = titleMap[filterType];
  });
});

optionBtns.forEach((button) => {
  button.addEventListener('click', () => {
    const filterType = button.dataset.filterType;
    const value = button.dataset.value;

    // 다중 선택
    if (Array.isArray(selectedFilters[filterType])) {
      const filterArray = selectedFilters[filterType];
      const index = filterArray.indexOf(value);

      if (index > -1) {
        filterArray.splice(index, 1); // 있으면 뺌
        button.classList.remove('active');
      } else {
        filterArray.push(value); // 없으면 넣음
        button.classList.add('active');
      }
    } 
    // 단일 선택
    else {
      document.querySelectorAll(`[data-filter-type="${filterType}"]`)
              .forEach(btn => btn.classList.remove('active'));
      
      // 값 덮어쓰고 지금 누른 버튼만 불 켜기
      selectedFilters[filterType] = value;
      button.classList.add('active');
    }

    // 화면 갱신 호출
    renderSelectedChips(); 
    loadRegularCrews(1);   
  });
});
// 패널 취소버튼
if (regFilterPanel) {
  regFilterPanel.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip-remove-btn')) {
      const type = e.target.dataset.type;
      const val = e.target.dataset.value;

      const index = selectedFilters[type].indexOf(val);
      if (index > -1) {
        selectedFilters[type].splice(index, 1);
      }

      const targetBtn = document.querySelector(`.filter-option-btn[data-filter-type="${type}"][data-value="${val}"]`);
      if (targetBtn) {
        targetBtn.classList.remove('active');
      }

      renderSelectedChips();
      loadRegularCrews(1);
    }
  });
}

// (시/도) 선택
cityBtns.forEach((button) => {
  button.addEventListener('click', () => {
    const state = button.dataset.state;

    selectedFilters.state = state;
    selectedFilters.city = ''; 

    cityBtns.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    if (districtGuide) {
      districtGuide.style.display = 'none';
    }

    districtGroups.forEach((group) => {
      if (group.dataset.state === state) {
        group.style.display = 'flex';
        group.style.flexWrap = 'wrap';
        group.style.gap = '8px';
      } else {
        group.style.display = 'none';
      }
    });
    districtBtns.forEach(btn => btn.classList.remove('active'));

    loadRegularCrews(1);
  });
});

//(구/군) 선택
districtBtns.forEach((button) => {
  button.addEventListener('click', () => {
    selectedFilters.city = button.dataset.city;

    districtBtns.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    loadRegularCrews(1);
  });
});

// 초기화 버튼
if (resetFilterBtn) {
  resetFilterBtn.addEventListener('click', () => {
    resetFiltersState(); // 상태 초기화

    // UI 상태 초기화
    document.querySelectorAll('.active, .selected').forEach(element => {
      element.classList.remove('active', 'selected');
    });
    if (filterOptionPanel) {
      filterOptionPanel.style.display = 'none'; 
    }
    if (regFilterPanel) {
      regFilterPanel.style.display = 'none';
    }

    districtGroups.forEach(group => {
      group.style.display = 'none';
    });

    if (districtGuide) {
      districtGuide.style.display = 'block'; // 안내 멘트 다시 표시
    }
    
    // 모집중 버튼 누르면 UI 강제 끄기
    const btnRecruitingOnly = document.getElementById('btnRecruitingOnly');
    if (btnRecruitingOnly) {
      btnRecruitingOnly.classList.remove('active');
    }
    
    loadRegularCrews(1);
  });
}

// 페이지네이션 클릭
if (pagination) {
  pagination.addEventListener('click', (e) => {
    const btn = e.target.closest('.page-link');
    if (!btn) return;
    
    const targetPage = Number(btn.dataset.page);
    if (targetPage) loadRegularCrews(targetPage);
  });
}

document.addEventListener('click', function(e) {
  // 클릭된 요소부터 부모로 거슬러 올라가며 .reg-card 클래스를 가진 요소를 찾음
  const card = e.target.closest('.reg-card');
  if (!card) return; 

  const regularID = card.dataset.id;
  window.location.href = `/regular/list/${regularID}`;
});
function renderProgressBars() {
    document.querySelectorAll('.reg-progress').forEach(bar => {
        const member = parseInt(bar.dataset.member);
        const capacity = parseInt(bar.dataset.capacity);
        const pct = Math.round(member / capacity * 100);
        bar.querySelector('.reg-progress-fill').style.width = pct + '%';
    });
}