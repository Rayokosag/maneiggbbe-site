let passport = null;
let GoogleStrategy = null;

function initOAuth(app) {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    console.log('OAuth: Google credentials not configured, OAuth disabled');
    return false;
  }

  try {
    passport = require('passport');
    GoogleStrategy = require('passport-google-oauth20').Strategy;

    passport.use(new GoogleStrategy({
      clientID,
      clientSecret,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/customers/auth/google/callback'
    }, (accessToken, refreshToken, profile, done) => {
      const user = {
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
        avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null
      };
      return done(null, user);
    }));

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));

    app.use(passport.initialize());
    app.use(passport.session());

    console.log('OAuth: Google OAuth initialized');
    return true;
  } catch (error) {
    console.error('OAuth: Failed to initialize:', error.message);
    return false;
  }
}

function getPassport() {
  return passport;
}

module.exports = { initOAuth, getPassport };
