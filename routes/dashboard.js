const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { ensureAuthenticated } = require("../config/auth");

const dashRouter = express.Router();

dashRouter.use(bodyParser.urlencoded({ extended: false }));
dashRouter.use(bodyParser.json());

const Users = require("../models/userSchema");

const api_key = process.env.API_KEY;

// GET root
dashRouter.get("/", ensureAuthenticated, (req, res, next) => {
  Users.findOne({ _id: req.user._id }, (err, user) => {
    const result = user.submittedMovies;
    if (result && result.length) {
      if (user != null) {
        res.render("dashboard", { result: result, user: req.user.username });
      } else {
        err = new Error("Movie " + req.user._id + " not found");
        next(err);
      }
    } else {
      err = new Error("Movie " + req.user._id + " not found");
      res.render("dashboard", { result: result });
    }
  });
});

// POST delete
dashRouter.post("/delete/:id", ensureAuthenticated, (req, res, next) => {
  Users.findOne({ _id: req.user._id }, (err, user) => {
    const result = user.submittedMovies;
    if (result && result.length) {
      if (user != null) {
        for (let i = 0; i < result.length; i++) {
          if (result[i]._id == req.params.id) {
            result.id(req.params.id).remove();
          }
        }
        user.save().then(() => {
          res.redirect("/dashboard");
        });
      }
    }
  }).catch((err) => next(err));
});

// GET edit
dashRouter.get("/edit/:id", ensureAuthenticated, (req, res, next) => {
  Users.findById(req.user._id, (err, user) => {
    if (err) new Error(err);
    const result = user.submittedMovies;
    console.log(result.id(req.params.id));
    if (result && result.length) {
      if (user != null) {
        for (let i = 0; i < result.length; i++) {
          if (result[i]._id == req.params.id) {
            res.render("edit", {
              result: result.id(req.params.id),
              user: req.user.username,
            });
          }
        }
      }
    }
  }).catch((err) => {
    next(err);
    res.render("dashboard");
  });
});

// POST edit
dashRouter.post("/edit", ensureAuthenticated, (req, res, next) => {
  Users.findByIdAndUpdate(
    req.user._id,
    { $set: { submittedMovies: req.body } },
    { new: true },
    (err, doc) => {
      if (err) console.log(err);
      res.redirect("/dashboard");
    }
  ).catch((err) => {
    if (err) {
      if (err.name == "ValidationError") {
        for (field in err.errors) {
          console.log(err.errors[field].message);
          req.flash("error", err.errors[field].message);
        }
      }
    }
    console.log("Error: ", err);
  });
});

// GET /REVIEWS
dashRouter.get("/reviews", ensureAuthenticated, (req, res, next) => {
  Users.findById(req.user._id, (err, user) => {
    if (err) new Error(err);
    const result = user.submittedMovies;
    console.log("results: ", result);
    if (result && result.length) {
      if (user != null) {
        res.render("searchbar", { result: result, user: req.user.username });
      }
    }
  }).catch((err) => console.log(err));
});


// GET /REVIEWS/TITLE
dashRouter.get("/reviews/:title&:date", ensureAuthenticated, (req, res, next) => {
  
  const title = req.params.title;
  const date = req.params.title;
  const uri = `http://api.themoviedb.org/3/search/movie?api_key=${api_key}&query=${title}&year=${date}`;
  const encoded = encodeURI(uri);
  
  // REQUESTING MOVIEDB
  const movieData = axios.get(encoded)
  .then((res) => {
      return res.data;
    })
  .catch((err) => {
      console.log("Error: ", err);
      return err;
    });

  movieData.then((data) => {
    if (data.results[0] === undefined) {
      req.flash("error", "This item cannot be reviewed");
      res.redirect("/homepage");
    } else {
      Users.findOne({ _id: req.user._id }, (err, user) => {
        if (err) new Error(err);
        const result = user.submittedMovies;
        if (user != null) {
          result.forEach((movie) => {
            console.log("##############################");
            console.log(movie.title);
            console.log(req.params.title);
            console.log(data);
            console.log("##############################");
            
            if (movie.title === req.params.title && req.params.title === data.results[0].original_title) {
              console.log("Result is successful");
              res.render("reviews", {
                result: result,
                user: req.user.username,
                movie: req.params.title,
                overview: data.results[0].overview,
                poster: data.results[0].poster_path
              });
            }
          });
        }
      }).catch((err) => console.log(err));
    }
  }).catch((err) => console.log(err));

});

module.exports = dashRouter;
