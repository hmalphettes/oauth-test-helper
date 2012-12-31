var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

function AuthSetup(app, passport, options) {
  this.app = app;
  this.passport = passport;
  this.passportSet = false;

  this.accessToken;
  this.refreshToken;
  this.options = options || {};

  this.appId = options.appId || process.env.APP_ID;
  this.appSecret = options.appSecret || process.env.APP_SECRET;
  this.scope = options.scope ||
         [ 'https://www.googleapis.com/auth/userinfo.email',
           'https://www.googleapis.com/auth/userinfo.profile' ];

  var self = this;

  // don't use the prototype this time.
  // make a closure to be certain to pass self.
  self.ensureAuthenticated = function(req, res, next) {
    if (self.accessToken || req.isAuthenticated()) { return next(); }
    self.lazySetupPassport(req);
    req.session.beforeLoginURL = req.url;
    res.redirect('/auth/google');
  };
}

AuthSetup.prototype.lazySetupPassport = function(req) {
  var self = this;
  if (self.passportSet) {
    return;
  }
  self.passportSet = true;
  var protocol = req.connection.encrypted ? "https" : "http";

//not doing anything with this:
//it will try to serialize the users in the session.
  self.passport.serializeUser(function(user, done) {
    done(null, user);
  });
  self.passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });

  var callbackUrl = protocol + "://" + req.headers.host + "/auth/google/callback";
  self.passport.use(new GoogleStrategy({
      clientID: self.appId,
      clientSecret: self.appSecret,
      callbackURL: callbackUrl
    },
    function(accessToken, refreshToken, profile, done) {
      self.accessToken = accessToken;
      self.refreshToken = refreshToken;
      self.profile = profile;
      self.callbackUrl = callbackUrl;
      // asynchronous verification, for effect...
      process.nextTick(function () {
        return done(null, profile);
      });
    }
  ));

  self.app.get('/auth/google',
    self.passport.authenticate('google', { scope: self.scope,
      'approvalPrompt': 'force',
      'accessType': 'offline'
    }),
    function(req, res) {
      // The request will be redirected to Google for authentication, so
      // this function will not be called.
    }
  );

  self.app.get('/auth/google/callback', 
    self.passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect(req.session.beforeLoginURL || '/');
    }
  );
};

exports.AuthSetup = AuthSetup;
