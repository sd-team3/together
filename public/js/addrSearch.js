export const addrSearch = () => {
    return new Promise((resolve) => {
        new daum.Postcode({
            oncomplete: function(data) {
                resolve({ roadAddress: data.roadAddress });
            }
        }).open();
    });
};