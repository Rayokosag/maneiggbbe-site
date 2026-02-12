// OAuth disabled for cloud deployment
function initOAuth(app) {
  console.log('OAuth: Disabled for cloud deployment');
  return false;
}

function getPassport() {
  return null;
}

module.exports = { initOAuth, getPassport };
