const User = require('../models/User');
const mongoose = require('mongoose');

async function createUser({email, password, name, age, tel, address}) {
    const newUser = new User({
        email,
        password,
        name,
        age,
        tel,
        address
    });
    await newUser.save();
}

module.exports = {createUser};