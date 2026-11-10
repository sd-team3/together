const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    _id: String,
    endpoint: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true }
    }
});

module.exports = mongoose.model('WebPushSubscription', schema);
