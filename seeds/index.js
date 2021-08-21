const mongoose = require('mongoose');
const Campground = require('../models/campground');
const cities = require('./cities');
const { places, descriptors } = require('./seedHelpers')
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp';

mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});


//////////  for testing purpose   //////////

/*const camp = new Campground({                                           
    title: 'BSP',
    location: 'CG'

});*/

/////////////////////////////////////////////


const sample = array => array[Math.floor(Math.random() * array.length)];


///////////////////      BE CAREFUL THERE IS A DELETE STATEMENT ALSO IN THE FUNCTION....     //////////////////////////////////////
//////////////////       THIS DELETES THE EXISTING DATABASE AND CREATES A NEW DATABASE EVERYTIME IT RUNS    //////////////////////

const seedDB = async () => {
    await Campground.deleteMany({});
    for (let i = 0; i < 200; i++) {
        const random1000 = Math.floor(Math.random() * 1000);
        const price = Math.floor(Math.random() * 20) + 10;
        const camp = new Campground({
            author: '610e9eb2ac1890516ee89537',
            location: `${cities[random1000].city} , ${cities[random1000].state}`,
            title: `${sample(descriptors)} ${sample(places)}`,

            description: 'Beautiful, Amazing, Mesmerizing, Picturesque location',

            price: `${price}`,
            geometry: {
                type: "Point",
                coordinates: [
                    cities[random1000].longitude,
                    cities[random1000].latitude,
                ]
            },
            images: [{
                url: 'https://res.cloudinary.com/dydql4gpl/image/upload/v1628681988/YelpCamp/cgrork1c2q09aa1q6oyq.jpg',
                filename: 'YelpCamp/cgrork1c2q09aa1q6oyq'
            },
            {
                url: 'https://res.cloudinary.com/dydql4gpl/image/upload/v1628681988/YelpCamp/niiybrow5je1lj156bnd.jpg',
                filename: 'YelpCamp/niiybrow5je1lj156bnd'
            }
            ]

        })
        await camp.save();
    }

}


seedDB().then(() => {
    mongoose.connection.close();
})