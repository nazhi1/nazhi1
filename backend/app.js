require('dotenv').config()

const express = require('express');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded());

const session = require('express-session')

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))

// MySQL Connection
var mysql = require('mysql');

var connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'password',
  database: 'database',
});

connection.connect(function(err) {
  if (err) throw err;
  console.log('You are now connected with mysql database...')
})

// setup passport auth
const initializePassport = require('./passport-config')
const passport = require('passport')

initializePassport(passport,connection)

app.use(passport.initialize())
app.use(passport.session())

// This is just used for testing perposes ###### Remove
app.get('/r', (req, res) => {

  res.sendfile("register.html");
});

app.get('/l', (req, res) => {

  res.sendfile("login.html");
});

app.post('/api/login', passport.authenticate ('local', {successRedirect: '/',failureRedirect: '/login'}))

app.get('/customer', function (req, res) {
  connection.query('select * from users', function (err, results, fields) {
   if (err) throw err;
   res.end(JSON.stringify(results));
 });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

// Password managment
const bcrypt = require('bcrypt');
const { json } = require('express');

app.post('/register', async (req, res) => {

  try {
    const salt = await bcrypt.genSalt()
    const hashedPassword = await bcrypt.hash(req.body.password,salt)
    console.log(salt)
    console.log(hashedPassword)

    const email = req.body.email

    connection.query("INSERT INTO users (email,password) VALUES (?,?)",[email,hashedPassword], function (err, results, fields) {
      if (err) throw err;
    });

    res.status(201).send()
  }
  catch {
    console.log("error password not working")
    res.status(500).send()
  }
  
});

// login api request
app.post('/login', async (req, res) => {

  try {
    const salt = await bcrypt.genSalt()
    const hashedPassword = await bcrypt.hash(req.body.password,salt)

    // querys the database to find a the user 
    connection.query('select * from users WHERE email=?',[req.body.email], function (err, results, fields) {
      if (err) throw err;
      
      // gets first item in the
      var row = results[0];

      // If the server returns more then 1 result there is a Internal Server Error
      if(results.length == 1) {

        // Chacks if the password is the same one as the one on the database
        bcrypt.compare(
        req.body.password, row.password, function(err, result) {
          if (result == true) {
            console.log("Password accepted")
            res.status(202).send()
          } else {
            console.log("Wrong password")
            res.status(401).send()
          }
        });

      }
      else {
        // if the sql returns more then 1 user with the same email there is an error
        res.status(500).send()
      }

    });

  }
  catch {
    // returns an bad Request if the server fails
    res.status(400).send()
  }
  
});

function getUserByEmail(email, callback) {

  connection.query('select * from users WHERE email=?',[email], function (err, results, fields) {
    if (err) throw err;

    if(results.length == 0)
    { 
      callback(null)
    }
    else
    {
      callback({email: results[0].email,password: results[0].password})
    }

  })
  
}

app.get('/x', (req, res) => {
  getUserByEmail("admin",function(result){
    res.send(result)
  })
  
  
});