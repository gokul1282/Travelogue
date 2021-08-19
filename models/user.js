const mongoose = require('mongoose')
const passportlocalmongoose = require('passport-local-mongoose')

const UserSchema = new mongoose.Schema({

    email: {
        type: String,
        required: true,
        unique: true

    }

});

UserSchema.plugin(passportlocalmongoose);

module.exports = mongoose.model('User', UserSchema);