export const openAddressSearch = () => {
    return new Promise((resolve) => {
        new daum.Postcode({
            oncomplete: function(data) {
                resolve({ roadAddress: data.roadAddress });
            }
        }).open();
    });
};