const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const imageExtensions = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
};

const makeImageFileName = (req, file, cb) => {
    cb(null, `${randomUUID()}.${imageExtensions[file.mimetype]}`);
};

// 파일명 처리
const makeFileName = (req, file, cb) => {
    const ext = path.extname(file.originalname); //확장자 추출(ex: .png , .jpg, .pdf)
    cb(null, Date.now() + ext); //에러 없음(null), 업로드한 시간.확장자로 파일명 생성
};

// 프로필 이미지 저장 경로 설정
// destination : 파일 저장 경로
// filename: 저장될 파일 명
const profileStorage = multer.diskStorage(
    {
        destination: (req, file, cb) => {
            cb(null, 'public/images/user-profile');
        },
        filename: makeFileName
    }
);

// 게시판 이미지 저장 경로 설정
const boardStorage = multer.diskStorage(
    {
        destination: (req, file, cb) => {
            cb(null, 'public/images/board');
        },
        filename: makeFileName
    }
);
// 정기모임 이미지 저장 경로 설정
const regularProfileStorage = multer.diskStorage(
    {
        destination: (req, file, cb) => {
            cb(null, path.join(__dirname, '../public/images/reg-crew/profile'));
        },
        filename: makeImageFileName
    }
);

//이미지 필터
const imageFilter = (req, file, cb) =>{
    if(Object.hasOwn(imageExtensions, file.mimetype)){//허용된 파일 형식
        cb(null, true);
    }else{
        const err = new Error('jpeg, png, webp, jpg 형식의 이미지 파일만 업로드 가능합니다.')
        err.status = 400;
        cb(err);
    }
};

// 프로필 사진 미들웨어
const uploadProfile = multer({
    storage : profileStorage,
    // 저장 경로(public > images > profile > 업로드한 시간(밀리초)_원본파일.확장자) 
    limits : {fileSize : 5 * 1024 * 1024},
    // 파일 용량(5MB로 제한)
    fileFilter: imageFilter
    // 형식 제한(이미지만 처리)
});

// 게시판 사진 미들웨어
const uploadBoard = multer({
    storage : boardStorage,
    limits : {fileSize : 20 * 1024 * 1024},
    fileFilter : imageFilter
});

// 정기모임 사진
const uploadRegularProfile = multer({
    storage : regularProfileStorage,
    limits : {fileSize : 20 * 1024 * 1024},
    fileFilter : imageFilter
});

const uploadCrewIntro = multer({
    storage: multer.diskStorage({
        destination(req, file, cb) {
            const directory = path.join(__dirname, '../public/images/reg-crew/intro');
            fs.mkdir(directory, { recursive: true }, error => cb(error, directory));
        },
        filename: makeImageFileName
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: imageFilter
});
module.exports = {uploadProfile, uploadBoard, uploadRegularProfile, uploadCrewIntro};
