# Google OAuth2 Test Helper

Helper to get an access token for a web-app from Google OAuth2 service.
Tailored for integration testing purposes:
- Use the helper to get a valid access token
- Start yours automated tests

## Requirements:
A google web-app cliend-id and client-secrete configured with a callback URL for `http://localhost:3000/auth/google/callback` with access to the user's profile.

## Usage:

    function getOAuth2AccessToken(done) {
        var GoogleOAuth2TestHelper = require('oauth2-test-helper');
        GoogleOAuth2TestHelper.getOAuth2Tokens({
            appId: YOUR_CLIENT_ID || process.env.APP_ID,
            appSecret: YOUR_CLIENT_SECRET || process.env.APP_SECRET,
            scope: LIST_OF_SCOPES || [ profile, email ]
            filePath: pathToFileToCacheTokensAndRefreshTokens
        }, function(err, accessToken, refreshToken) {
            console.log("accessToken ready", accessToken);
            done(err, accessToken, refreshToken);
        });
    }
    // With mocha:
    describe("When accessing a goog oauth2 service", function() {
        var accessToken;
        before(function(done) {
            setTimeout(30000); //could take a little while.
            getOAuth2AccessToken(function(err, _accessToken) {
                accessToken = _accessToken;
                done(err);
            });
        });
    });

## Description ##

### First run
A local express server is started; the web-browser is opened and asks the user to login to google.
Once logged in, the tokens are cached in a file and the server will stop.

### Subsequent runs
The access token is tested against the user's profile service.
If it fails, then the refresh token is used to get a new access token.
When this fails, the user is asked to login through the browser. 
