var request = require('superagent')
  , fs = require('fs');

function readTokens(filePath, callback) {
  fs.readFile(filePath, function(err, res) {
    if (err) {
      callback(err);
    } else {
      try {
        var r = JSON.parse(res);
        callback(null, r.access_token, r.refresh_token);
      } catch (ex) {
        callback(ex);
      }
    }
  });
}

function storeTokens(result, filePath, callback) {
  var accessToken = result.accessToken
    , refreshToken = result.refreshToken
    , callbackUrl = result.callbackUrl
    , profile = result.profile;

  fs.writeFile(filePath
    , JSON.stringify({ access_token: accessToken,
                     refresh_token: refreshToken,
                     callback_url: callbackUrl,
                     profile: profile }, null, 2)
    , callback);
}

/**
 * Makes a call against the user info service.
 * callback with the profile if ok and an error if it did not go through.
 */
function checkToken(accessToken, callback) {
  request
    .get('https://www.googleapis.com/oauth2/v1/userinfo')
    .set('Authorization', "Bearer " + accessToken)
    .set('Accept', 'application/json')
    .end(function(res) {
      if (res.body && res.body.name) {
        callback(null, res.body);
      } else {
        callback(new Error("not granted need to use the refresh token"));
      }
    }
  );
}

/*
https://developers.google.com/accounts/docs/OAuth2WebServer#refresh
<br/>
client_id=8819981768.apps.googleusercontent.com&
client_secret={client_secret}&
refresh_token=1/6BMfW9j53gdGImsiyUH5kU5RsR4zwI9lUVX-tqf8JXQ&
grant_type=refresh_token
*/
function refreshToken(refreshTok, options, callback) {
  request
    .post("https://accounts.google.com/o/oauth2/token")
    .set("Content-Type", "application/x-www-form-urlencoded")
    .send({client_id: options.appId,
          client_secret: options.appSecret,
          refresh_token: refreshTok,
          grant_type: 'refresh_token'})
    .end(function(err, res) {
      if (err) {
        callback(err);
      } else if (res.body && res.body.access_token) {
        callback(err, res.body.access_token);
      } else {
        callback(new Error("Can't find the refreshed access token"));
      }
    });
}

exports.readTokens = readTokens;
exports.storeTokens = storeTokens;
exports.checkToken = checkToken;
exports.refreshToken = refreshToken;
