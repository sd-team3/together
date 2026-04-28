const mongoose = require('mongoose');

const connectDB = async() => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('DB 연결 완료');
    } catch (error) {
        console.log('DB 연결 실패 : ', error);
        process.exit(1);
    }
}

module.exports = connectDB;