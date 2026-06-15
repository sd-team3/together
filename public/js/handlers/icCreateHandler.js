import kakaoMap from '/js/modules/mapLoader.js';

document.addEventListener('DOMContentLoaded', () => {

  // ── 종목 chip ──
  document.querySelectorAll('[data-chip]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-chip]').forEach(c => c.classList.remove('on'));
      chip.classList.add('on');
      document.getElementById('sport-input').value = chip.dataset.value;
    });
  });

  const stateSelect = document.getElementById('stateSelect');
  const citySelect  = document.getElementById('citySelect');
  const AREAS = JSON.parse(stateSelect.dataset.areas);

  stateSelect.addEventListener('change', () => {
    const cities = AREAS[stateSelect.value] || [];
    citySelect.innerHTML =
      `<option value="">시/군/구 선택</option>` +
      cities.map(city => `<option value="${city}">${city}</option>`).join('');
  });


  // ── 자동/수동 수락 ──
  document.querySelectorAll('[data-accept]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-accept]').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      document.getElementById('accept-input').value = btn.dataset.value;
    });
  });
  function updateTime() {
    const ampm = document.getElementById('time-ampm').value;
    let hour = parseInt(document.getElementById('time-hour').value);
    const min = document.getElementById('time-min').value;

    if (ampm === 'AM' && hour === 12) hour = 0;
    if (ampm === 'PM' && hour !== 12) hour += 12;

    document.getElementById('meetAt_time').value = `${String(hour).padStart(2,'0')}:${min}`;
  }

  ['time-ampm', 'time-hour', 'time-min'].forEach(id => {
      document.getElementById(id).addEventListener('change', updateTime);
  });
  updateTime(); // 초기값 세팅


   // ── 좌표 적용 공통 함수 ──
  function applyLocation(lat, lng, name) {
    document.getElementById('lat-input').value = lat;
    document.getElementById('lng-input').value = lng;
    document.getElementById('detail-addr').value = name;

    const mapEl = document.getElementById('map');
    mapEl.style.display = 'block';
    kakaoMap.loadMapByLatLng(lat, lng);

    const resultEl = document.getElementById('addr-result');
    resultEl.style.display = 'block';
    resultEl.textContent = `✅ 위치 확인 완료: ${name} (${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)})`;

    hidePlaceList();
  }

  // ── 장소 목록 표시 ──
  function showPlaceList(results, state, city) {
    // 선택한 시/도, 시/군/구에 해당하는 결과만 필터링
    const filtered = results.filter(r =>
        r.address_name.includes(state) && r.address_name.includes(city)
    );

    let listEl = document.getElementById('place-list');
    if (!listEl) {
        listEl = document.createElement('div');
        listEl.id = 'place-list';
        listEl.style.cssText = `
            margin-top: 8px;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            background: var(--surface);
            overflow: hidden;
        `;
        document.getElementById('btn-find-addr').insertAdjacentElement('afterend', listEl);
    }

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div style="padding:16px 14px;font-size:13px;color:var(--text-3);text-align:center;">
                ${state} ${city} 내 검색 결과가 없어요
            </div>`;
        return;
    }

    listEl.innerHTML = `
        <div style="padding:10px 14px;font-size:11.5px;font-weight:700;color:var(--text-3);
                    border-bottom:1px solid var(--border);background:var(--bg);">
            아래 장소 중 선택해주세요
        </div>
        ${filtered.map((r, i) => `
            <div class="place-item" data-idx="${i}"
                style="padding:11px 14px;cursor:pointer;border-bottom:1px solid var(--border);
                       font-size:13px;transition:background .15s;"
                onmouseover="this.style.background='var(--bg)'"
                onmouseout="this.style.background=''"
            >
                <div style="font-weight:600;color:var(--text)">${r.place_name}</div>
                <div style="font-size:11.5px;color:var(--text-3);margin-top:2px">${r.address_name}</div>
            </div>
        `).join('')}
    `;

    listEl.querySelectorAll('.place-item').forEach((el, i) => {
        el.addEventListener('click', () => {
            applyLocation(filtered[i].y, filtered[i].x, filtered[i].place_name);
        });
    });
  }

  // ── 장소 목록 숨기기 ──
  function hidePlaceList() {
    document.getElementById('place-list')?.remove();
  }
  // ── 주소 → 좌표 변환 + 지도 표시 ──
  document.getElementById('btn-find-addr').addEventListener('click', async () => {
    const state = document.getElementById('stateSelect').value.trim();
    const city  = document.getElementById('citySelect').value.trim();
    const detail  = document.getElementById('detail-addr').value.trim();

    if (!state || !city) {
      alert('시/도와 구/동을 먼저 입력해주세요.');
      return;
    }

    const address = detail ? `${state} ${city} ${detail}` : `${state} ${city}`;

    try {
      const { lat, lng, name } = await kakaoMap.ADDRtoLatLng(address);
      applyLocation(lat, lng, name);
    } catch (err) {
      if(err.type === 'MULTIPLE') {
        showPlaceList(err.results, state, city); //검색 결과 목록 표시
      }else {
        alert('주소를 찾을 수 없습니다. 상세 장소명을 다시 확인해주세요');
      }
      
    }
  });
  // 날짜 캘린더 피커
  flatpickr('#meetAt_date', {
      locale: 'ko',
      dateFormat: 'Y-m-d',
      minDate: 'today', //오늘 날짜 기준 이전 날짜 선택 X
      disableMobile: true
  });

  // ── 제출 전 lat/lng 검증 ──
  document.getElementById('create-form').addEventListener('submit', (e) => {
    if (!document.getElementById('lat-input').value) {
      e.preventDefault();
      alert('위치 확인 버튼을 눌러 장소를 지정해주세요.');
    }
  });

});