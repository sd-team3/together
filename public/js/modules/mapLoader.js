window.MAP = null;

async function loadKakaoMapAPI() {
    return new Promise(async (resolve, reject)=>{
        if (typeof kakao !== 'undefined') {
            return resolve(kakao);
        }

        try {
            const response = await fetch('/kakao-map-js-key');
            const KAKAO_JS_KEY = await response.json().key;
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
    getXY() {
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

    getXY(address) {
        const geocoder = new kakao.maps.services.Geocoder();
        return new Promise((resolve, reject) => {
            geocoder.addressSearch(address, (result, status) => {
                if (status === kakao.maps.services.Status.OK) {
                    resolve({
                        x: result[0].x,
                        y: result[0].y
                    });
                } else {
                    reject(new Error("GET XY ERROR"));
                }
            });
        });
    },

    async loadMapByLocation() {
        try {
            const { lat, lng } = await this.getXY();
            const mapElement = document.getElementById('map');
            kakao.maps.load(() => {
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
            });
        } catch (error) {
            console.log(error.message);
            //일단 콘솔에 띄우긴 하는데 나중에 에러처리
        }
    },

    async loadMapByAddress(address) {
        try {
            const lat = 37.5600;
            const lng = 126.8000;
            const mapElement = document.getElementById('map');
            kakao.maps.load(() => {
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
            });
        } catch (error) {
            console.log(error.message);
            //일단 콘솔에 띄우긴 하는데 나중에 에러처리
        }
    },

    async loadMarker(crews) {
        const markers = null;
        try {
            kakao.maps.load(() => {
                markers = crews.map(crew => {
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
            });
        } catch (error) {
            
        }
        return markers;
    }
}

export default kakaoMap;
