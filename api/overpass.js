var https = require("https");

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  var body = "";
  req.on("data", function(chunk) { body += chunk; });
  req.on("end", function() {
    var parsed;
    try { parsed = JSON.parse(body); } catch(e) { parsed = {}; }
    var query = parsed.query;
    var urlStr = parsed.endpoint || "https://overpass-api.de/api/interpreter";
    if (!query) {
      res.status(400).json({ error: "Missing query" });
      return;
    }

    var postBody = "data=" + encodeURIComponent(query);
    var urlObj = new URL(urlStr);
    var options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "*/*",
        "User-Agent": "curl/8.5.0"
      },
      timeout: 20000
    };
    var proxyReq = https.request(options, function(proxyRes) {
      var data = "";
      proxyRes.on("data", function(chunk) { data += chunk; });
      proxyRes.on("end", function() {
        if (proxyRes.statusCode !== 200) {
          res.status(502).json({ error: "HTTP " + proxyRes.statusCode, body: data });
        } else {
          try { res.status(200).json(JSON.parse(data)); }
          catch(e) { res.status(502).json({ error: "Invalid JSON from OSM" }); }
        }
      });
    });
    proxyReq.on("error", function(err) {
      res.status(502).json({ error: err.message });
    });
    proxyReq.on("timeout", function() {
      proxyReq.destroy();
      res.status(502).json({ error: "Timeout" });
    });
    proxyReq.write(postBody);
    proxyReq.end();
  });
};
