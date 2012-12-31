/**
 * Quickly setup a small web-server for the sole purpose of
 * getting a google oauth2 refresh token and access token.
 */
var express = require('express')
  , passport = require('passport')
  , app = express()
  , AuthSetup = require('./auth_setup.js').AuthSetup
  , request = require('superagent')
  , async = require('async');
var utils = require('./utils')
  , oauth2Helper = require('./auth_setup');
var spawn = require('child_process').spawn;


/**
 * @param options Expecting:
 *        options.appId || process.env.APP_ID
 *        options.appSecret || process.env.APP_SECRET
 *        options.port || 3000
 *        options.host || localhost
 *        options.scope || process.env.AUTH_SCOPES || [ 'https://www.googleapis.com/auth/userinfo.profile' ]
 *        
 */
function OAuth2TestHelper(options) {
  this.app = undefined;
  this.authSetup = undefined;
  this.server = undefined;
  this.callback = undefined;
  this.options = options || {};
  if (!options.scope) {
    options.scope = process.env.AUTH_SCOPES;
  }
  if (!options.scope) {
    options.scope = [ 'https://www.googleapis.com/auth/userinfo.profile' ];
  }
  if (typeof options.scope === 'string') {
    options.scope = options.scope.replace(/ /g, ",").split(',');
  }
  return this;
}

OAuth2TestHelper.prototype.configureApp = function() {
  var self = this;

  self.authSetup = new AuthSetup(app, passport, self.options);
  self.app = app;

  self.app.configure(function() {
    // self.app.use(express.logger());
    self.app.use(express.cookieParser());
    self.app.use(express.bodyParser());
    self.app.use(express.methodOverride());
    self.app.use(express.session({ secret: 'lol cats' }));
    // Initialize Passport!
    self.app.use(passport.initialize());
    //self.app.use(passport.session()); // no need for persistent login sessions (recommended).
    self.app.use(app.router);
  });
  var authSetup = self.authSetup;
  self.app.get('/access_token/new', authSetup.ensureAuthenticated, function(req, res) {
    var result = { message: 'All Done And Ready For Integration Tests; Closing the server in 2000 ms.',
                   accessToken: authSetup.accessToken,
                   refreshToken: authSetup.refreshToken,
                   profile: authSetup.profile };
    res.send(result);
    setTimeout(function() { 
      self.server.close();
    }, 2000);
    self.callback(authSetup.error, result);
  });
  return self;
};

/**
 * @param callback Passes the error and result back:
 *          result.accessToken, result.refreshToken, result.email back.
 */
OAuth2TestHelper.prototype.startApp = function(callback) {
  this.callback = callback;
  var port = this.options.port || 3000;
  this.server = this.app.listen(port);
  var url = "http://localhost:" + port + "/access_token/new";
  spawn('sh', ['-c', "open " + url], { stdio: 'inherit' });
};

/**
 * Helper to get Google OAuth2 tokens for integration testing
 * filePath to the cached access token.
 * If there read the access token and use it to get the user's profile
 * When that fails, use the refresh token to get a new access token
 * When that fails or if there is no accessToken/refreshToken,
 * Open an express app and open the browser to login to google
 * and retrieve the accessToken and refreshToken.
 *
 * @param options:
{ 
  filePath: googOAuth2Token.txt,
  accessToken: ...
  refreshToken: ...

*/
OAuth2TestHelper.getOAuth2Tokens = function(options, done) {
  var accessToken = options.accessToken;
  var refreshToken = options.refreshToken;
  async.series({
    readTokens: function(callback) {
      if (!accessToken && !refreshToken && options.filePath) {
        utils.readTokens(options.filePath, function(err, _accessToken, _refreshToken) {
          accessToken = _accessToken;
          refreshToken = _refreshToken;
          callback();
        });
      } else {
        callback();
      }
    },
    checkTokenAndRefresh: function(callback) {
      if (accessToken) {
        utils.checkToken(accessToken, function(err, profile) {
          if (err || !profile) {
            accessToken = undefined;
            if (refreshToken) {
              utils.refreshToken(refreshToken, options, function(err, _accessToken) {
                if (err || !_accessToken) {
                  refreshToken = undefined;
                } else {
                  accessToken = _accessToken;
                }
                callback();
              });
            } else {
              accessToken = undefined;
              callback();
            }
          } else {
            callback();
          }
        });
      } else {
        callback();
      }
    },
    getTokensLazy: function(callback) {
      if (accessToken) {
        callback();
      } else {
        var getter = new OAuth2TestHelper(options);
        getter.configureApp().startApp(function(err, result) {
          if (err) {
            callback(err);
          } else {
            accessToken = result.accessToken;
            refreshToken = result.refreshToken;
            if (options.filePath) {
              utils.storeTokens(accessToken, refreshToken, options.filePath, function(err, r) {
                callback(null, accessToken, refreshToken);
              });
            } else {
              callback(null, accessToken, refreshToken);
            }
          }
        });
      }
    }
  }, function(err, r) {
    done(err, accessToken, refreshToken);
  });
};

module.exports = OAuth2TestHelper;
OAuth2TestHelper.refreshToken = utils.refreshToken;
OAuth2TestHelper.checkToken = utils.checkToken;
