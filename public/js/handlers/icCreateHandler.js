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

    listEl.innerHTML = `
      <div style="padding:10px 14px;font-size:11.5px;font-weight:700;color:var(--text-3);
                  border-bottom:1px solid var(--border);background:var(--bg);">
        아래 장소 중 선택해주세요
      </div>
      ${results.map((r, i) => `
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
          const selectedAddr = results[i].address_name;
          
          // 선택한 장소가 시/구 범위 밖이면 경고
          if (!selectedAddr.includes(state) || !selectedAddr.includes(city)) {
              if (!confirm(`⚠️ 선택한 장소(${results[i].place_name})가\n설정한 지역(${state} ${city})과 다릅니다.\n그래도 선택하시겠어요?`)) return;
          }
          
          applyLocation(results[i].y, results[i].x, results[i].place_name);
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

  // ── 제출 전 lat/lng 검증 ──
  document.getElementById('create-form').addEventListener('submit', (e) => {
    if (!document.getElementById('lat-input').value) {
      e.preventDefault();
      alert('위치 확인 버튼을 눌러 장소를 지정해주세요.');
    }
  });

});