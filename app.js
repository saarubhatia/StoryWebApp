var express=require("express");
var bodyParser=require("body-parser");
var mongoose=require("mongoose");
var passport=require("passport");
var LocalStrategy=require("passport-local");
var methodOverride=require("method-override");
var middleware=require("./middleware");
var flash=require("connect-flash");

var Story=require("./models/story");
var User=require("./models/user");


var url= process.env.URL;// || "mongodb://localhost/storyDB";
mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true});

//APP CONFIG
var app=express();

app.set("view engine","ejs");

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname+"/public"));
app.use(methodOverride("_method"));
app.use(flash());

app.use(require("express-session")({
    secret:"Highly Confidential 5XGVLGBHB65555",
    resave: false,
    saveUninitialized: false
}));

//PASSPORT Config
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//MIDDLEWARE
app.use(function(req,res,next){
    res.locals.currentUser=req.user;
    res.locals.error=req.flash("error");
    res.locals.success=req.flash("success");
    res.locals.info=req.flash("info");
    next();
})

app.locals.moment=require('moment');

//=========================================================================
//-------- ROUTES ----------
//=========================================================================

app.get("/",function(req,res){
    res.render("landing");
})

// 1. STORY ROUTES
//INDEX
app.get("/stories",function(req,res){
    Story.find(function (err, stories) {
        if (err) {
            console.log(err);
        }
        else {
            res.render("stories/index", { stories: stories, page: 'home'});
        }
    });
})

//NEW
app.get("/stories/new",middleware.isLoggedIn,function(req,res){
    res.render("stories/new");
})

//CREATE
app.post("/stories", middleware.isLoggedIn, function(req,res){
    var title=req.body.title;
    var image=req.body.image;
    var storyBody=req.body.storyBody;
    var author={
        id:req.user._id,
        username:req.user.username
    }
    var newStory = {title:title, image:image, storyBody:storyBody, author:author};
    Story.create(newStory, function (err, newlyCreated) {
        if (err) {
            console.log(err);
            req.flash('error', err.message);
            res.redirect('back');
        } else {
            console.log(newlyCreated);
            req.flash("info","You added a new story: "+ newlyCreated.title);
            res.redirect("/stories");
        }
    });
});

//SHOW
app.get("/stories/:id",middleware.isLoggedIn,function(req,res){
    Story.findById(req.params.id).exec(function(err,foundStory){
        if(err || !foundStory){
            req.flash("error","Story not found");
            res.redirect("back");
        } else {
            var found = foundStory.reads.find(foundUser => foundUser._id==req.user.id);
            if(!found){
                foundStory.reads.push(req.user);
                foundStory.save();
            }
            res.render("stories/show",{specificStory:foundStory});
        }
    });
})

//EDIT
app.get("/stories/:id/edit", middleware.checkStoryOwnership, function(req,res){
    Story.findById(req.params.id, function(err, foundStory){
        res.render("stories/edit",{story:foundStory});
    })
})

//UPDATE
app.put("/stories/:id", middleware.checkStoryOwnership, function(req,res){
    Story.findByIdAndUpdate(req.params.id, req.body.story, function (err, updatedStory) {
        if (err) {
            req.flash("error", err.message);
            res.redirect("back");
        }
        else {
            req.flash("info", "You edited " + updatedStory.title);
            res.redirect("/stories/" + req.params.id);
        }
    })
})

//DESTROY or DELETE route
app.delete("/stories/:id", middleware.checkStoryOwnership, function(req,res){
    Story.findByIdAndRemove(req.params.id, function(err, story){
        if(err){
            req.flash("error", err.message);
            return res.redirect("back");
        }
        req.flash("info","You deleted "+story.title);
        res.redirect("/stories");
    })
})

//AUTHENTICATION ROUTES
// 1. Sign Up Routes
app.get("/register",function(req,res){
    res.render("register",{page:'register'});
})
//sign up logic
app.post("/register",function(req,res){
    var newUser=new User({
            username:req.body.username,
            email:req.body.email,
            firstName:req.body.firstName,
            lastName:req.body.lastName,
            gender:req.body.gender,
            avatar:req.body.avatar
        });
    if(req.body.adminCode === 'secretcode123'){
        newUser.isAdmin=true;
    }
    User.register(newUser,req.body.password,function(err,user){
        if (err) {
            if(err.code=11000){
                err.message='A user with the given email is already registered';
            }
            req.flash("error", err.message);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                req.flash("success", "Successfully signed up!\nWelcome to Story Web App, " + user.firstName + "!");
                res.redirect("/stories");
            })
        }
    })
})

//2. Login Routes
app.get("/login",function(req,res){
    res.render("login",{page:'login'});
})
//login logic
app.post("/login",passport.authenticate("local",{
    failureRedirect: "/login",
    failureFlash: true
}),function(req,res){
    req.flash("success","Welcome back, "+req.user.firstName+"!");
    res.redirect("/stories");
})

//3. Logout Routes
app.get("/logout", function(req,res){
    req.logout();
    req.flash("success","You have been successfully logged out!");
    res.redirect("/stories");
})

//4. User Profile
app.get("/users/:id",middleware.isLoggedIn,function(req,res){
    User.findById(req.params.id,function(err,foundUser){
        if(err){
            req.flash("error","Something went wrong!");
            res.redirect("/stories");
        }
        Story.find().where('author.id').equals(foundUser._id).exec(function(err,story){
            if(err){
                console.log(err);
                res.redirect("/");
            }
            res.render("users/show",{user:foundUser,story:story});
        })
    })
})

//SERVER LISTEN
app.listen(process.env.PORT || 3000,function(){
    console.log("The Server has started");
})