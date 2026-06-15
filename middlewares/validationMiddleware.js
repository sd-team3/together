const { body, validationResult } = require('express-validator');

// # 회원가입 유효성 검사 규칙
const signupValidationRules = [
    body('email')
        .notEmpty().withMessage('이메일은 필수 입력 항목입니다')
        .isEmail().withMessage('유효한 이메일 주소를 입력해주세요'),
    body('password')
        .notEmpty().withMessage('비밀번호는 필수 입력 항목입니다')
        .matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage('비밀번호는 영문, 숫자, 특수문자 조합 8자 이상이어야 합니다'),
    body('name')
        .notEmpty().withMessage('이름은 필수입니다')
        .matches(/^[가-힣]{2,5}$/)
        .withMessage('이름은 2~5자 한글로 입력하세요'),
    body('password2')
        .notEmpty().withMessage('비밀번호 확인을 입력해주세요')
        .custom((value, {req})=>{
            if(value !== req.body.password){
                throw new Error('비밀번호가 일치하지 않습니다');
            }
            return true;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
        }),
    body('age')
        .notEmpty().withMessage('나이는 필수입니다')
        .isInt({ min: 1, max: 120 })
        .withMessage('올바른 나이를 입력하세요'),

    body('tel')
    .notEmpty().withMessage('전화번호는 필수입니다')
    .matches(/^01[016789]-?\d{3,4}-?\d{4}$/)
    .withMessage('올바른 전화번호를 입력하세요'),
];

//비번변경 유효성 검사 규칙
const editProfileValidationRules = [
    body('name')
        .optional({ checkFalsy: true })
        .matches(/^[가-힣]{2,5}$/)
        .withMessage('이름은 2~5자 한글로 입력하세요'),

    body('newPassword')
        .optional({ checkFalsy: true }) //빈 문자열 거르기
        .matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/)
        .withMessage('비밀번호는 영문, 숫자, 특수문자 조합 8자 이상이어야 합니다'),

    body('currentPassword')
        .optional({ checkFalsy: true }) //빈 문자열 거르기
        .custom((value, { req }) => {
            if (req.body.newPassword && !value) {
                throw new Error('현재 비밀번호를 입력해야 합니다');
            }
            return true;
        })
];


//유효성 검사
const validate = (viewName) => {
    return (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const validationErrors = {};

            errors.array().forEach(err => {
                if (!validationErrors[err.path]) {
                    validationErrors[err.path] = err.msg;
                }
            });

            return res.render(viewName, {
                errors: validationErrors
            });
        }

        next();
    };
};

module.exports = { editProfileValidationRules, signupValidationRules, validate };