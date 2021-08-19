const express = require('express')
const path = require('path');
const mongoose = require('mongoose');
const Campground = require('../models/campground')
const Review = require('../models/review');
const catchAsync = require('../utility/catchAsync');
const ExpressError = require('../utility/ExpressError');
const { reviewSchema } = require('../schemas');
const ejsMate = require('ejs-mate')
const router = express.Router({ mergeParams: true });

const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {

        next();
    }
}


router.post('/', validateReview, catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id)
    const rev = new Review(req.body.review)
    campground.review.push(rev)

    await rev.save()
    await campground.save()

    res.redirect(`/campgrounds/${campground._id}`);


}))

module.exports = router;