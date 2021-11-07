require("dotenv").config;

//Requiring mailchimp's module
//For this we need to install the npm module @mailchimp/mailchimp_marketing. To do that we write:
//npm install @mailchimp/mailchimp_marketing
const mailchimp = require("@mailchimp/mailchimp_marketing");
//Requiring express and body parser and initializing the constant "app"

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");

const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();

// connect to posts database
var mongoDB = "mongodb://localhost:27017/posts";
//
mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true});

// var mongoDBConnect = "mongodb+srv://" + process.env.MONGO_KEY + "@cluster0.t5imk.mongodb.net/posts";
//
// mongoose.connect(mongoDBConnect, {  useNewURLParser: true, useUnifiedTopology: true });

// create Schema and model for posts collection
const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Please add title name."]
  },
  content: String
});

const Post = mongoose.model(
  "Post", postSchema
);

// create Schema and model for readers collection
const readerSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
});

const Reader = mongoose.model(
  "Reader", readerSchema
);


//get current year
let today= new Date();
let currentYear = today.getFullYear();



// var blogArray = [];

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));


// setup mialchimp configuration
mailchimp.setConfig({
  //*****************************ENTER YOUR API KEY HERE******************************
  apiKey: process.env.MC_APIKEY,
  //*****************************ENTER YOUR API KEY PREFIX HERE i.e.THE SERVER******************************
  server: "us5"
});


app.get("/", function(req, res) {
  // res.render(__dirname + "/views/home.ejs");
  Post.find({}, function(err, foundPosts){
    if (err) {
      console.log(err);
    } else {
      res.render("home", {
        startingContent: homeStartingContent,
        blogs: foundPosts,
        currentYear: currentYear,
      });
    };
  });
});

app.get("/about", function(req, res) {
  res.render("about", {
    about: aboutContent,
    currentYear: currentYear,
  });
});

app.get("/contact", function(req, res) {
  res.render("contact", {
    contact: contactContent,
    currentYear: currentYear,
  });
});

app.get("/compose", function(req, res) {
  res.render("compose", {
    currentYear: currentYear,
  });

});

app.get("/posts/:postName", function(req, res){
  const requestedTitle = _.capitalize(req.params.postName);

  Post.find({title: requestedTitle}, function(err, foundPosts){
    if (err) {
      console.log(err);
    } else {
      console.log(foundPosts);
      res.render("post", {selectTitle:requestedTitle, selectContent: foundPosts[0].content, currentYear: currentYear,});
    }
  });
});

app.post("/compose", function(req, res) {
  const newTitle = _.capitalize(req.body.title);
  const newPost = new Post({
    title: newTitle,
    content: req.body.content
  });
  // blogArray.push(newPost);
  newPost.save();
  res.redirect("/");
});

// handling reader signup
app.post("/signup", function(req, res){
  //user singup information entered in the form of signup.html
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const email = req.body.email;
  console.log(firstName, lastName, email);

  const listId = process.env.MC_LISTID;

  // Creating an object with users data
  const subscribingUser = new Reader({
    firstName: firstName,
    lastName: lastName,
    email: email
  });

// save the subscribingUser to readers collection
subscribingUser.save(function(err,doc){
  if (err) {
    console.log(err);
  } else {
    console.log("the reader document inserted successfully")
  };
});


  //upload the data to the MailChimp server
  const run = async () => {
    const response = await mailchimp.lists.batchListMembers(listId, {
      members: [{
        email_address: subscribingUser.email,
        status: "subscribed",
        merge_fields: {
          FNAME: subscribingUser.firstName,
          LNAME: subscribingUser.lastName
        }
      }],
    });
    //console.log(response);
    //display success message to user
        res.render("success",{currentYear: currentYear})
        // res.sendFile(__dirname + "/success.html");
        console.log(`Successfully added contact as an audience member. The contact's id is ${response.new_members.id}`);
      };
      run().catch(e => res.render("failure",{currentYear: currentYear}));

    });


    let port = process.env.PORT;
    if (port == null || port == "") {
      port = 3000;
    };
    app.listen(port, function() {
      console.log("Server has started successfully");
    });
