const messageService = require('../services/chatService');
const userService = require('../services/userService');
const notiService = require('../services/notiService');
const { notiSocket } = require('./notiSocket');
const { chatSocket } = require('./chatSocket');

let _io = null;

const initSocket = (io) => {
    _io = io;
    console.log('웹소켓 서버 초기화 완료');

    const chat = io.of('/chat');
    const noti = io.of('/noti');
    
    chatSocket(chat);

    notiSocket(noti);
};


module.exports = { initSocket };