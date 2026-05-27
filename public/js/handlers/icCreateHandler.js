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

  // ── 주소 → 좌표 변환 + 지도 표시 ──
  document.getElementById('btn-find-addr').addEventListener('click', async () => {
    const state = document.getElementById('stateSelect').value.trim();
    const city  = document.getElementById('citySelect').value.trim();

    if (!state || !city) {
      alert('시/도와 구/동을 먼저 입력해주세요.');
      return;
    }

    const address = state + ' ' + city;

    try {
      const { lat, lng } = await kakaoMap.ADDRtoLatLng(address);

      // hidden input에 좌표 저장
      document.getElementById('lat-input').value = lat;
      document.getElementById('lng-input').value = lng;

      // 지도 표시
      const mapEl = document.getElementById('map');
      mapEl.style.display = 'block';
      await kakaoMap.loadMapByADDR(address);

      // 결과 텍스트
      const resultEl = document.getElementById('addr-result');
      resultEl.style.display = 'block';
      resultEl.textContent = `✅ 위치 확인 완료: ${address} (${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)})`;

    } catch (err) {
      alert('주소를 찾을 수 없습니다. 다시 확인해주세요.');
      console.error(err);
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