const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Review = require('./review')

const opts = { toJSON: { virtuals: true } };

const CampgroundSchema = new Schema({

    title: String,
    images: [
        {
            url: String,
            filename: String
        }
    ],
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },

    price: Number,
    description: String,
    location: String,
    author:
    {
        type: Schema.Types.ObjectId,
        ref: 'User'

    },

    review: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'

        }
    ]

}, opts);


CampgroundSchema.virtual('properties.popUpText').get(function () {
    return `
    <strong><a href="/campgrounds/${this._id}">${this.title}</a><strong>
    <p>${this.description.substring(0, 20)}...</p>`
});

CampgroundSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await Review.deleteMany({

            _id: {
                $in: doc.review
            }
        })
    }

})

const Campground = mongoose.model('Campground', CampgroundSchema);
module.exports = Campground;
