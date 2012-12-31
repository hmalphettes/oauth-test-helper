var request = require('superagent')
  , fs = require('fs')
  , should = require('should');
require('long-stack-traces');
var libpath = process.env.COVER ? '../lib-cov' : '../lib';
var utils = require(libpath + '/utils');
var OAuth2TestHelper = require(libpath + '/oauth2_helper');

var access_token;
var refresh_token;

function read_access_token_sync() {
  if (access_token) {
    return;
  }
  var path = 'access_token';
  if (!fs.existsSync(path)) {
    return;
  }
  var array = fs.readFileSync(path).toString().split("\n");
  access_token = array[0];
  refresh_token = array[1];
}

function store_access_token(authResult, done) {
  fs.writeFile("access_token", authResult.accessToken + "\n" + authResult.refreshToken, done);
}

function options() {
  return {
    appId: process.env.APP_ID,
    appSecret: process.env.APP_SECRET,
    port: 3000,
    scope: [ 'https://www.googleapis.com/auth/userinfo.profile',
             'https://www.googleapis.com/auth/userinfo.email' ]
  };
}

function lazyExecuteOAuth2Helper(done) {
  if (!access_token || !refresh_token) {
    setTimeout(done, 2000000);
    var getter = new OAuth2TestHelper(options());
    getter.configureApp().startApp(function(err, result) {
      access_token = result.accessToken;
      refresh_token = result.refreshToken;
      store_access_token(result, done);
    });
  } else {
    done();
  }

}

describe("When accessing a google api", function() {
  before(function(done) {
    read_access_token_sync();
    if (!refresh_token) {
      lazyExecuteOAuth2Helper(done);
    } else {
      done();
    }
  });
  it("Must be able to read access_token", function() {
    should.exist(access_token);
    should.exist(refresh_token);
  });
  it("Must be able to refresh the access token", function(done) {
    OAuth2TestHelper.refreshToken(refresh_token, options(), function(err, _access_token) {
      should.exist(_access_token);
      _access_token.should.not.equal(access_token);
      access_token = _access_token;
      done(err);
    });
  });
  it("Must be able to read the email of the integration tester", function(done) {
    OAuth2TestHelper.checkToken(access_token, function(err, res) {
      should.exist(res);
      should.exist(res.email);
      done(err);
    });
  });
});

describe("When using the helper", function() {
  var _options = options();
  before(function(done) {
    _options.filePath = 'test_access_token';
    fs.exists(_options.filePath, function(err, res) {
      if (res) {
        fs.unlink(_options.filePath, done);
      } else {
        done();
      }
    });
  });
  it("Must get a valid access token", function(done) {
    OAuth2TestHelper.getOAuth2Tokens(_options, function(err, _accessToken, _refreshToken) {
      should.exist(_accessToken);
      should.exist(_refreshToken);
      utils.checkToken(_accessToken, done);
    });
  });
});
