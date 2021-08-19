
const express = require('express');
const app = express();
const path = require('path');
const morgan = require('morgan');
const AppError = require('./appError');


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));




app.use(morgan('tiny'));

app.use((req, res, next) => {
    console.log('First Middleware');
    next();

})

///////////////   TO PROTECT SPECIFIC ROUTES     /////////

const Protector = (req, res, next) => {

    const { password } = req.query;
    if (password === 'pagehacked') {
        next();
    }
    else {
        //res.send("Please Enter a valid password to see this page :(")
        // throw new AppError("password is must :(", 401);

    }

}


app.get('/', Protector, (req, res) => {
    res.send('home')

});

app.get('/dogs', (req, res) => {
    res.send('bhow bhow')

});

app.get('/err', (req, res, next) => {

    boy.find();

    /// built in error handler executes
})

/*app.use((err, req, res, next) => {
    res.status(404);       ///sets status to 404 even if the error has different status code
    console.log(err);
    next(err);              //calls the default error handler 
})*/

app.use((err, req, res, next) => {
    const { status = 404, message = 'Something went wrong' } = err;
    res.status(status).send(err)

})

app.listen(3000, () => {
    console.log("listening on port 3000");
});