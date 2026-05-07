window.MAP = null;
const MAP_ID = 'map';

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
        return new Promise((resolve, reject) => {
            geocoder.addressSearch(address, (result, status) => {
                if (status === kakao.maps.services.Status.OK) {
                    resolve({
                        lat: result[0].y,
                        lng: result[0].x
                    });
                } else {
                    reject(new Error("GET XY ERROR"));
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
                        level: 3
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
                        level: 3
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

    async loadMarker(crews) {
        try {
            const markers = crews.map(crew => {
                const position = new kakao.maps.LatLng(crew.lat, crew.lng);
                const marker = new kakao.maps.Marker({
                    map: window.MAP,
                    position: position,
                    title: crew.title
                });

                const infoWindow = new kakao.maps.InfoWindow({
                    content: `<div>${crew.title} 크루</div>`
                });

                kakao.maps.event.addListener(marker, 'click', ()=>{
                    infoWindow.open(window.MAP, marker);
                });

                return marker;
            });

            return markers;
        } catch (error) {
            return error.message;
        }
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