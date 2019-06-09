const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const moment = require("moment");

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors());

mongoose.connect(process.env.MLAB_URI, { useNewUrlParser: true });

// =============
// User Schema
// ============

var etUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  exercises: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise"
    }
  ]
});

var EtUser = mongoose.model("EtUser", etUserSchema);



// ================
// Exercise Schema
// ================

var exerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: Date
});

var Exercise = mongoose.model("Exercise", exerciseSchema);

// Seeds
/*
EtUser.create({
  username: "Marco",
}, function(err, exercise){
  if(err){
    console.log(err);
  } else {
    console.log("newly created exercise");
    console.log(exercise);
  }
});
*/


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//============
// My routes
//============

app.get('/hello', (req, res) => {
  res.sendFile(__dirname + '/views/hello.html')
});

// GET array of all users
app.get("/api/exercise/users", function(req, res) {
  EtUser.find({}, function(err, allUsers){
    if(err){
      console.log(err);
    } else {
      res.send(allUsers);
    }
  });
});

// POST Form
app.post("/api/exercise/new-user", function(req, res) {
  // Get new user info
  var name = req.body.username;
  var newUser = { username: name };
  
  // Save to database
  
  EtUser.create(newUser, function(err, newlyCreated) {
    if(err){
      console.log(err);
    } else {
      var name = newlyCreated.username;
      var id = newlyCreated._id;
      var newUser = { username:name, _id: id };
      res.json(newUser);
    }
  });
});

//=================
// Exercises Routes
//=================

app.post("/api/exercise/add", function(req, res) {
  var now = moment().format("YYYY-MM-DD");
  var newExercise = {
                  description: req.body.description,
                  duration: req.body.duration,
                  date: req.body.date
                };
  if(newExercise.date ===""){
    newExercise.date = now;
  }
  console.log(newExercise);

  EtUser.findById(req.body.userId, function(err, user){
    if(err){
      console.log(err);
      // Kinda obnoxious redirect
      res.redirect("/");
    } else {
      Exercise.create(newExercise, function(err, addedExercise){
        if(err){
          console.log(err);
        } else {
          user.exercises.push(addedExercise);
          user.save();
          
          var returnObject = {
            username: user.username,
            _id: user._id,
            description: addedExercise.description,
            duration: addedExercise.duration,
            date: addedExercise.date
          };
          res.send(returnObject);
        }
      });
    }
  });
});

//=================
// User Log Routes
//=================
app.get("/api/exercise/log", function(req, res){
  var id = req.query.userId;
  if(req.query.from){
    var from = new Date(req.query.from);
  }
  if(req.query.to){
    var to = new Date(req.query.to);
  }
  // Check if FROM variable and TO variable exist
  var toMatch = {}
  if(from && to){
    toMatch = {date: {$gte: from, $lte: to} };
  } else if(from){
    toMatch = {date: {$gte: from} };
  } else if(to){
    toMatch = {date: {$lte: to} };
  }

  if(req.query.limit){
    var limit = req.query.limit;
  }
  // Need to use .lean() to make the returned object editable.
  EtUser.find({
    _id: id
  })
    .populate({
      path: "exercises",
      match: toMatch,
      options: {
        limit: limit
      }
    })
    .lean()
    .exec(function(err, user){
    if(err){
      console.log(err);
    } else {
      user = user[0];
      let filterExercises = user.exercises;
      console.log("to filter", filterExercises)
      user.count = user.exercises.length;
      res.send(user);
    }
  });
});








// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})


