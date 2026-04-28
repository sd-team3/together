window.MAP = null;

const mapLoader = {
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

    async loadMapByAddress() {
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

export default mapLoader;
