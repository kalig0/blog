require("dotenv").config;

//Requiring mailchimp's module
const mailchimp = require("@mailchimp/mailchimp_marketing");

//Requiring express and body parser and initializing the constant "app"
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");

const homeStartingContent = "Everyone only lives once, so taking life to its fullest is very meaningful.  Yesterday is a beautiful memory, while tomorrow lives in our imagination so grasp and enjoy what you can today.  Whether you are working hard to advance your career, studying diligently to meet a deadline, or practicing intensely to improve, remember to take a little time everyday to take a walk, to listen to music, to thank your friends, and to express your love and gratitude to your family.  This blog is dedicated to appreciating the little things in life.";
const aboutContent = "Hello and welcome to my personal blog!  I created it to help me write down my random thoughts.  This blog is a demonstration of my programming skills currently and will be my thought repository in the future.";
const contactContent = "Please email me at talldanielyu@gmail.com if you have any questions, suggestions, requestions, etc.  All your words are appreciated.";

const app = express();

// connect to posts database
// var mongoDB = "mongodb://localhost:27017/posts";
// mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true});

var mongoDBConnect = "mongodb+srv://" + process.env.MONGO_KEY + "@cluster0.t5imk.mongodb.net/posts";
mongoose.connect(mongoDBConnect, {
  useNewURLParser: true,
  useUnifiedTopology: true
});

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
let today = new Date();
let currentYear = today.getFullYear();


app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));


// setup mialchimp configuration
mailchimp.setConfig({
  apiKey: process.env.MC_APIKEY,
  server: "us5"
});


app.get("/", function(req, res) {
  Post.find({}, function(err, foundPosts) {
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

app.get("/posts/:postName", function(req, res) {
  const requestedTitle = _.capitalize(req.params.postName);

  Post.find({
    title: requestedTitle
  }, function(err, foundPosts) {
    if (err) {
      console.log(err);
    } else {
      console.log(foundPosts);
      res.render("post", {
        selectTitle: requestedTitle,
        selectContent: foundPosts[0].content,
        currentYear: currentYear,
      });
    }
  });
});

app.post("/compose", function(req, res) {
  const newTitle = _.capitalize(req.body.title);
  const newPost = new Post({
    title: newTitle,
    content: req.body.content
  });
  newPost.save();
  res.redirect("/");
});

// handling reader signup
app.post("/signup", function(req, res) {
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const email = req.body.email;
  console.log(firstName, lastName, email);

  const listId = process.env.MC_LISTID;
console.log("List ID is", listId);

  // Creating an object with users data
  const subscribingUser = new Reader({
    firstName: firstName,
    lastName: lastName,
    email: email
  });

  // save the subscribingUser to readers collection
  subscribingUser.save(function(err, doc) {
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

    //display success message to user
    res.render("success", {
      currentYear: currentYear
    });
    console.log("Successfully added contact as an audience member. The contact's id is ${response.new_members.id}");
  };
  run().catch(e => res.render("failure", {
    currentYear: currentYear
  }));

});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
};
app.listen(port, function() {
  console.log("Server has started successfully");
});
