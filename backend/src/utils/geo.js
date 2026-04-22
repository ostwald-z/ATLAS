const geoip = require("geoip-lite")

function getLocationFromIP(ip) {
  const geo = geoip.lookup(ip);

  if (!geo) return null;

  return {
    country: geo.country,
    region: geo.region,
    city: geo.city,
    ll: geo.ll // latitude/longitude
  };
}


module.exports = {getLocationFromIP}