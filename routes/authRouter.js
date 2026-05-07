const express = require('express');
const router = express.Router();
const passport = require('../config/passport');

router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })
);

router.get('/google/callback', 
    passport.authenticate('google', {
        failureRedirect: '/auth/login',
        successRedirect: '/'
    })
);

router.get('/naver', passport.authenticate('naver'));

router.get('/naver/callback',
    passport.authenticate('naver', {
        failureRedirect: '/auth/login',
        successRedirect: '/'
    })
);

module.exports = router;