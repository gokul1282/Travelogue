//////////////////////        All basic , boring but necessary stuff .....        /////////////////////////


if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}


const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const Campground = require('./models/campground')
const ExpressError = require('./utility/ExpressError');
const methodOverride = require('method-override');
const catchAsync = require('./utility/catchAsync');
const Joi = require('joi');
const morgan = require('morgan');
const ejsMate = require('ejs-mate')
const Review = require('./models/review');
const { campgroundSchema, reviewSchema } = require('./schemas');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport')
const LocalStrategy = require('passport-local')
const User = require('./models/user')
const multer = require('multer')
const { storage } = require('./cloudinary/index')
const upload = multer({ storage })
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken })


const MongoDBStore = require("connect-mongo")(session)
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp';

//const campgrounds = require('./Routes/camps')


//////////////           DB NAME - yelp-camp             ////////////////////
/////////////          COLLECTION NAME: campgrounds     ////////////////////


mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});


const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.requestedPage = req.originalUrl
        req.flash('error', 'You need to Login first !!')
        res.redirect('/login')
    }
    else {
        next();

    }

}

const app = express();
//app.use('/campgrounds', campgrounds);
const secret = process.env.SECRET || 'confidential'
const store = new MongoDBStore({
    url: dbUrl,
    secret,
    touchAfter: 24 * 60 * 60
});

store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e)
})


const SessionConfig = {
    store,
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7

    }
}


app.use(session(SessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




app.use((req, res, next) => {
    // console.log(req.session);

    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');

    next();

})


app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))



app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))


/*const validateCampground = (req, res, next) => {
    campgroundSchema = Joi.object({
        campground: Joi.object({
            title: Joi.string().required(),
            price: Joi.number().required(),
            image: Joi.string().required(),
            description: Joi.string().required(),
            location: Joi.string().required(),
        }).required()

    });
if()
}*/



const validateCampground = (req, res, next) => {
    const { error } = campgroundSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }

}




app.get('/', (req, res) => {
    res.render('home')

});


app.get('/campgrounds', catchAsync(async (req, res) => {

    const campgrounds = await Campground.find({})
    res.render('campgrounds/index', { campgrounds })            // DON'T PUT /campgrounds/index.The slash before campgrounds should not be used.

}))

/* app.get('/fakeuser', async (req, res) => {
    const user = new User({ email: 'abc@gamil.com', username: 'abc' })
    const newUser = await User.register(user, 'yeahboi');
    res.send(newUser);

})*/

app.get('/register', (req, res) => {
    res.render('auth/register')

})

app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ username, email })
        const registeredUser = await User.register(user, password)
        req.login(registeredUser, err => {
            if (err) {
                next(err)
            }
            else {
                req.flash('success', 'Welcome to the world of campgrounds')
                res.redirect('/campgrounds')
            }
        })

    }
    catch (e) {
        req.flash('error', e.message)
        res.redirect('/register')
    }

})

app.get('/login', (req, res) => {
    res.render('auth/login')

})

app.post('/login', passport.authenticate('local', { faliureFlash: true, failureRedirect: '/login' }), (req, res) => {

    req.flash('success', 'Welcome back !!')
    const redirectUrl = req.session.requestedPage || '/campgrounds'
    res.redirect(redirectUrl);
})

app.get('/campgrounds/new', isLoggedIn, (req, res) => {

    res.render('campgrounds/new')
})

// app.post('/campgrounds', upload.array('image'), (req, res) => {
//     console.log(req.body, req.files)
//     res.send('success!!')
// })

app.post('/campgrounds', upload.array('image'), /*validateCampground*/ catchAsync(async (req, res, next) => {

    const geoData = await geocoder.forwardGeocode({
        query: req.body.campground.location,
        limit: 1

    }).send()




    const campground = new Campground(req.body.campground);
    campground.geometry = geoData.body.features[0].geometry
    campground.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
    campground.author = req.user._id;
    console.log(campground);
    await campground.save();
    req.flash('success', 'Successfully made a new campground!');   // message that has to be flashed 
    res.redirect(`/campgrounds/${campground._id}`)

}))

app.get('/logout', (req, res) => {
    req.logout()
    req.flash('success', 'You have successfully logged out !!')
    res.redirect('/campgrounds')

})

app.get('/campgrounds/:id', catchAsync(async (req, res) => {

    const campground = (await Campground.findById(req.params.id)
        .populate({
            path: 'review',
            populate: {
                path: 'author'
            }
        }).populate('author'));


    console.log(campground);
    if (!campground) {
        req.flash('error', 'Cannot find the campground !');
        return res.redirect('/campgrounds')
    }
    res.render('campgrounds/show', { campground })


}))



app.get('/campgrounds/:id/edit', isLoggedIn, catchAsync(async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findById(id)
    if (!campground) {
        req.flash('error', 'Cannot find the campground !');
        return res.redirect('/campgrounds')
    }
    res.render('campgrounds/edit', { campground })

}))


app.put('/campgrounds/:id', isLoggedIn, upload.array('image'), catchAsync(async (req, res) => {
    const { id } = req.params
    console.log()
    const campground = await Campground.findById(id);


    if (!(req.user._id).equals(campground.author)) {
        req.flash('error', 'You dont have the permission to edit the campground !!')
        res.redirect(`/campgrounds/${id}`)
    }
    else {
        const camp = await Campground.findByIdAndUpdate(id, { ...req.body.campground })
        const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));  // making the images as array (imgs)
        campground.images.push(...imgs);  //spreads the images and piushes them one by one....

        await campground.save();                                   /// new can also be set to true .....(as per wish)

        if (req.body.deleteImages) {
            await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
        }

        req.flash('success', 'Successfully edited the campground!');
        res.redirect(`/campgrounds/${camp._id}`);
    }

}))


app.delete('/campgrounds/:id', isLoggedIn, catchAsync(async (req, res) => {

    const { id } = req.params
    const campground = await Campground.findById(id);


    if (!(req.user._id).equals(campground.author)) {
        req.flash('error', 'You dont have the permission to edit the campground !!')
        res.redirect(`/campgrounds/${id}`)
    }
    else {

        await Campground.findByIdAndDelete(id);
        req.flash('success', 'Successfully deleted the campground!');
        res.redirect('/campgrounds');
    }


}))




/*Campground.findById('60f4035618682844f34c810b').populate('review')
    .then(campground => console.log(campground))*/


const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {

        next();
    }
}


app.post('/campgrounds/:id', isLoggedIn, validateReview, catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id)
    const rev = new Review(req.body.review)
    rev.author = req.user._id
    campground.review.push(rev)

    await rev.save()
    await campground.save()
    req.flash('success', 'Your review has been successfully added!');

    res.redirect(`/campgrounds/${campground._id}`);


}))

app.delete('/campgrounds/:id/:reviewId', isLoggedIn, catchAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    const rev = await Review.findById(reviewId);

    if (!(req.user._id).equals(rev.author)) {
        req.flash('error', 'You dont have the permission to delete the review !!')
        res.redirect(`/campgrounds/${id}`)
    }
    else {
        await Campground.findByIdAndUpdate(id, { $pull: { review: reviewId } });
        await Review.findByIdAndDelete(reviewId);
        req.flash('success', 'Your review has been successfully deleted!');
        res.redirect(`/campgrounds/${id}`);
    }

}))




app.use('*', (req, res, next) => {
    next(new ExpressError('page not found', 404));

})


app.use((err, req, res, next) => {

    const { status = 500, message = 'Something went wrong' } = err;
    res.status(status).send(message);
    next(err);
})



app.listen(3000, () => {
    console.log("listening on port 3000");
});

