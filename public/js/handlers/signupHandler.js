import { addrSearch } from "../modules/addrSearch.js";

const addrSearchBtn = document.getElementById('addrSearchBtn');
const addrResult = document.getElementById('addrResult');
const submitBtn = document.getElementById('submitBtn');

addrSearchBtn.addEventListener('click', async ()=>{
    addrResult.textContent = await addrSearch().roadAddress;
});
