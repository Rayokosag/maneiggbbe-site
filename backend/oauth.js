const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

let passportInstance = null;

function initOAuth(app) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || '/api/customers/auth/google/callback';

  if (!clientId || !clientSecret) {
    console.log('OAuth: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not set — Google Sign-In disabled');
    return false;
  }

  passport.use(new GoogleStrategy(
    { clientID: clientId, clientSecret, callbackURL },
    (accessToken, refreshToken, profile, done) => {
      done(null, {
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value || null
      });
    }
  ));

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  app.use(passport.initialize());
  app.use(passport.session());

  passportInstance = passport;
  console.log('OAuth: Google Sign-In enabled');
  return true;
}

function getPassport() {
  return passportInstance;
}

module.exports = { initOAuth, getPassport };
