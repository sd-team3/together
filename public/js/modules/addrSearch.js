export async function addrSearch(){
    const daumAPI = await loadDaumAddrAPI();

    return new Promise((resolve) => {
        new daumAPI.Postcode({
            oncomplete: function(data) {
                resolve(data);
            }
        }).open();
    });
};

function loadDaumAddrAPI() {
    return new Promise((resolve, reject) => {
        if (typeof daum !== 'undefined') {
            return resolve(window.daum);
        }
        const script = document.createElement('script');

        script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
        
        script.onload = () => resolve(window.daum);
        script.onerror = () => reject(new Error("DAUM_API_ERR"));
        
        document.head.appendChild(script);
    });
}
