window.MAP = null;
const MAP_ID = 'map';
let KakaoMarkers = [];

async function loadKakaoMapAPI() {
    return new Promise(async (resolve, reject)=>{
        if (typeof kakao !== 'undefined') {
            return resolve(window.kakao);
        }

        try {
            const response = await fetch('/kakao-map-js-key');
            const KAKAO_JS_KEY = (await response.json()).key;
            const script = document.createElement('script');

            script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false`;
            
            script.onload = () => { kakao.maps.load(() => resolve(kakao.maps)) };
            script.onerror = () => reject(new Error("KAKAO_API_ERR"));

            document.head.appendChild(script);
        } catch (err) {
            reject(new Error("API 키를 가져오는 데 실패했습니다."));
        }
    });
}

const kakaoMap = {
    GPStoLatLng() {
        return new Promise((resolve, reject)=>{
            if (!navigator.geolocation) {
                return reject(new Error('해당 브라우저는 GPS 기능이 불가능한 상태입니다.'));
            }

            navigator.geolocation.getCurrentPosition(
                position=>{
                    resolve({
                        lat : position.coords.latitude,
                        lng : position.coords.longitude
                    });
                }, 
                error=>{
                    reject(new Error(`위치 계산 오류 : ${error.message}`));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    },

    async ADDRtoLatLng(address) {
        await loadKakaoMapAPI();

        const geocoder = new kakao.maps.services.Geocoder();
        const places = new kakao.maps.services.Places();
        return new Promise((resolve, reject) => {
            geocoder.addressSearch(address, (result, status) => {
                if (status === kakao.maps.services.Status.OK) {
                    resolve({
                        lat: result[0].y,
                        lng: result[0].x,
                        name: address
                    });
                } else {
                    //상세 주소에 장소명 검색
                    places.keywordSearch(address, (result, status) => {
                        if(status === kakao.maps.services.Status.OK) {
                            //장소가 1개면 바로 반환
                            if(result.length === 1) {
                                resolve({ lat: result[0].y, lng: result[0].x, name: result[0].place_name });
                            }else {
                                reject({ type: 'MULTIPLE', results: result.slice(0,5) }); // 장소가 여러 개 일때 5개만 reject로 올려서 선택
                            }
                        }else {
                            reject(new Error("GET XY ERROR"));
                        }
                    })
                }
            });
        });
    },

    async loadMapByGPS() {
        try {
            await loadKakaoMapAPI();

            const { lat, lng } = await this.GPStoLatLng();
            const mapElement = document.getElementById(MAP_ID);
            const position = new kakao.maps.LatLng(lat, lng);

            if(!window.MAP) {
                window.MAP = new kakao.maps.Map(
                    mapElement, 
                    {
                        center: position,
                        level: 5,  // 기본 1km
                        minLevel: 3, // 최대 확대 500m
                        maxLevel: 8 // 최대 축소 1km
                    }
                );
            } else {
                window.MAP.setCenter(position);
            }
        } catch (error) {
            console.log(error.message);
            //일단 콘솔에 띄우긴 하는데 나중에 에러처리
        }
    },

    async loadMapByADDR(address) {
        try {
            await loadKakaoMapAPI();

            const { lat, lng } = await this.ADDRtoLatLng(address);
            const mapElement = document.getElementById(MAP_ID);
            const position = new kakao.maps.LatLng(lat, lng);

            if(!window.MAP) {
                window.MAP = new kakao.maps.Map(
                    mapElement, 
                    {
                        center: position,
                        level: 5,
                        minLevel: 3,
                        maxLevel: 8
                    }
                );
            } else {
                    window.MAP.setCenter(position);
            }
            if(window.CURRENT_MARKER) {
                window.CURRENT_MARKER.setMap(null);
            }
            window.CURRENT_MARKER = new kakao.maps.Marker({
                map: window.MAP,
                position: position
            });
        } catch (error) {
            console.log(error.message);
            //일단 콘솔에 띄우긴 하는데 나중에 에러처리
        }
    },
    loadMapByLatLng(lat, lng) {
        const position = new kakao.maps.LatLng(lat, lng);

        if (!window.MAP) {
            window.MAP = new kakao.maps.Map(document.getElementById(MAP_ID), {
                center: position,
                level: 5,
                minLevel: 3,
                maxLevel: 8
            });
        } else {
            window.MAP.setCenter(position);
        }
        if (window.CURRENT_MARKER) {
            window.CURRENT_MARKER.setMap(null);
        }
        window.CURRENT_MARKER = new kakao.maps.Marker({
            map: window.MAP,
            position: position,
        });
    },

    async loadMarker(crews) {
        try {
            KakaoMarkers.forEach(m => m.setMap(null));
            KakaoMarkers = [];
    
            const sportColor = {
                soccer:      '#22c55e',
                baseball:    '#ef4444',
                basketball:  '#f97316',
                badminton:   '#06b6d4',
                bowling:     '#a855f7',
                tennis:      '#eab308',
                tabletennis: '#10b981',
            };
    
            KakaoMarkers = crews.map(crew => {
                const position = new kakao.maps.LatLng(crew.lat, crew.lng);
                const color    = sportColor[crew.sport] || '#6366f1';
                const isFull   = crew.current >= crew.capacity;
                const isAlmost = !isFull && (crew.current / crew.capacity) >= 0.8;
    
                const ringClass = isAlmost ? 'pulse-ring fast' : 'pulse-ring';
                const wrapClass = isFull   ? 'pulse-wrap closed' : 'pulse-wrap';
    
                // 1. 문자열 대신 DOM 객체를 직접 생성 (안전한 이벤트 바인딩을 위해)
                const contentEl = document.createElement('div');
                contentEl.className = wrapClass;
                contentEl.setAttribute('data-crew-id', crew.id);
                
                contentEl.innerHTML = `
                    <div class="${ringClass}" style="background:${color}"></div>
                    <div class="pulse-dot"   style="background:${color}"></div>
                `;
 
                // 2. 엘리먼트 생성 즉시 클릭 이벤트 할당 (setTimeout 300ms 제거 가능)
                if (crew.onClick) {
                    contentEl.addEventListener('click', (e) => {
                        // 카카오맵 자체 클릭 이벤트와 충돌 방지
                        e.stopPropagation(); 
                        crew.onClick(e);
                    });
                }
    
                const overlay = new kakao.maps.CustomOverlay({
                    map:      window.MAP,
                    position: position,
                    content:  contentEl, // DOM 객체 전달
                    zIndex:   3,
                });
    
                overlay._crewData = crew;
                return overlay;
            });
            return KakaoMarkers;
        } catch (error) {
            return error.message;
        }
    },
    getMarkers() {
        return KakaoMarkers;
    }
}

export default kakaoMap;

/*

GPStoLatLng() : GPS 기반 현 위치를 lat(y), lng(x)로 반환
ADDRtoLatLng(address) : 주소 기반 현 위치를 lat(y), lng(x)로 반환
loadMapByGPS() : 현 위치를 기반으로 'map' id를 가진 HTML 개체에 지도를 띄움
loadMapByADDR(address) : 주소 기반으로 'map' id를 가진 HTML 개체에 지도를 띄움
loadMarker(crews) : 크루 배열을 매개변수로 받아서 해당 크루들의 위치와 정보를 map에 게시


*/