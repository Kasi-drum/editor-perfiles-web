var map = L.map("map").setView([42.5, 1.5], 13);
var trackpoints = [];
var osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
  maxZoom: 19
});

var topo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  maxZoom: 17
}).addTo(map);

var sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
  attribution: '&copy; <a href="https://www.esri.com">ESRI</a>',
  maxZoom: 19
});

var ign = L.tileLayer("https://tms-mapa-raster.ign.es/1.0.0/mapa-raster/{z}/{x}/{-y}.jpeg", {
  attribution: '&copy; <a href="https://www.ign.es">IGN España</a>, CC BY 4.0',
  maxZoom: 20
});

var hiking = L.tileLayer("https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://waymarkedtrails.org">Waymarked Trails</a>, <a href="https://www.openstreetmap.org/copyright">OSM</a>',
  maxZoom: 18,
  minZoom: 0,
  opacity: 0.7
});

var capaAgua = L.layerGroup().addTo(map);
var capaRefugios = L.layerGroup().addTo(map);
var capaPuertos = L.layerGroup().addTo(map);
var capaPicos = L.layerGroup().addTo(map);
var capaBares = L.layerGroup().addTo(map);
var wpLayer = L.layerGroup().addTo(map);
L.control.layers({
  "OpenTopoMap": topo,
  "OpenStreetMap": osm,
  "IGN 1:25000": ign,
  "Satélite": sat
}, {
  "Puntos de Agua": capaAgua,
  "Refugios": capaRefugios,
  "Puertos de Montaña": capaPuertos,
  "Picos": capaPicos,
  "Bares / Restaurantes": capaBares,
  "Waypoints": wpLayer,
  "Senderos": hiking
}, { collapsed: false }).addTo(map);

var poiButtonsControl = L.control({ position: "topright" });
poiButtonsControl.onAdd = function() {
  var div = L.DomUtil.create("div", "leaflet-control poi-buttons");
  div.innerHTML = '<button id="btn-poi" class="poi-btn">\uD83D\uDD0D Buscar POIs</button><button id="btn-add-pois" class="poi-btn" style="display:none">\uD83D\uDCCC A\u00F1adir POIs cercanos</button>';
  return div;
};
poiButtonsControl.addTo(map);

function haversineDist(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function distanceAtClosestPoint(lat, lng) {
  var bestDist = Infinity, bestLat = lat, bestLng = lng;
  var bestTot = 0;
  for (var i = 0; i < trackpoints.length - 1; i++) {
    var a = trackpoints[i], b = trackpoints[i+1];
    var ax = a.lat, ay = a.lng, bx = b.lat, by = b.lng;
    var dx = bx - ax, dy = by - ay;
    var segLen2 = dx * dx + dy * dy;
    var t = segLen2 > 0 ? Math.max(0, Math.min(1, ((lat - ax) * dx + (lng - ay) * dy) / segLen2)) : 0;
    var px = ax + t * dx, py = ay + t * dy;
    var d = haversineDist(lat, lng, px, py);
    var segDist = haversineDist(ax, ay, px, py);
    if (d < bestDist) {
      bestDist = d; bestLat = px; bestLng = py;
      bestTot = trackpoints[i].dist + segDist;
    }
  }
  return {lat: bestLat, lng: bestLng, dist: bestTot, offTrackDist: bestDist};
}

function interpolateEle(dist) {
  for (var i = 0; i < trackpoints.length - 1; i++) {
    if (dist >= trackpoints[i].dist && dist <= trackpoints[i+1].dist) {
      var r = (dist - trackpoints[i].dist) / (trackpoints[i+1].dist - trackpoints[i].dist);
      return trackpoints[i].ele + r * (trackpoints[i+1].ele - trackpoints[i].ele);
    }
  }
  return trackpoints[trackpoints.length-1].ele;
}

function showMapPrompt(title, defaultValue) {
  return new Promise(function(resolve) {
    var overlay = document.getElementById("modal-overlay");
    document.getElementById("modal-title").textContent = title;
    var input = document.getElementById("modal-input");
    input.value = defaultValue || "";
    input.style.display = "";
    overlay.classList.add("show");
    setTimeout(function() { input.focus(); input.select(); }, 50);
    function cleanup() {
      overlay.classList.remove("show");
      document.getElementById("modal-ok").onclick = null;
      document.getElementById("modal-cancel").onclick = null;
      input.onkeydown = null;
    }
    document.getElementById("modal-ok").onclick = function() { cleanup(); resolve(input.value); };
    document.getElementById("modal-cancel").onclick = function() { cleanup(); resolve(null); };
    input.onkeydown = function(e) {
      if (e.key === "Enter") { cleanup(); resolve(input.value); }
      if (e.key === "Escape") { cleanup(); resolve(null); }
    };
  });
}
function showMapConfirm(title, msg) {
  return new Promise(function(resolve) {
    var overlay = document.getElementById("modal-overlay");
    document.getElementById("modal-title").textContent = title;
    var input = document.getElementById("modal-input");
    input.style.display = "none";
    overlay.classList.add("show");
    function cleanup() {
      overlay.classList.remove("show");
      document.getElementById("modal-ok").onclick = null;
      document.getElementById("modal-cancel").onclick = null;
      input.onkeydown = null;
    }
    document.getElementById("modal-ok").textContent = "SI";
    document.getElementById("modal-cancel").textContent = "NO";
    document.getElementById("modal-cancel").focus();
    document.getElementById("modal-ok").onclick = function() { cleanup(); resolve(true); };
    document.getElementById("modal-cancel").onclick = function() { cleanup(); resolve(false); };
    input.onkeydown = function(e) {
      if (e.key === "Enter") { cleanup(); resolve(true); }
      if (e.key === "Escape") { cleanup(); resolve(false); }
    };
  });
}

map.on("contextmenu", async function(e) {
  if (!trackpoints.length) return;
  var pt = distanceAtClosestPoint(e.latlng.lat, e.latlng.lng);
  var ele = interpolateEle(pt.dist);
  var name = await showMapPrompt("Nuevo Waypoint", "WP " + pt.dist.toFixed(2) + " km");
  if (!name) return;
  try { localStorage.setItem("mapa-new-wp", JSON.stringify({name: name, dist: pt.dist, ele: ele, lat: e.latlng.lat, lng: e.latlng.lng, offTrackDist: pt.offTrackDist, poiType: null})); } catch(ex) {}
  var icon = L.divIcon({
    className: "wp-marker",
    html: '<div style="background:#1a1a1a;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)">+</div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
  L.marker([e.latlng.lat, e.latlng.lng], {icon: icon}).addTo(map).bindTooltip(name, {permanent:false, direction:"top", offset:[0,-14]});
});

// ================================================================
// Puntos de Interés de OpenStreetMap (Agua y Refugios)
// Se consultan al pulsar el botón "Buscar POIs"
// ================================================================
var poiSeen = {};
var fetchedPOIs = [];
var selectedWp = null;

var overpassEndpoints = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter"
];
var requestToken = 0;
function fetchOSMPOIsForBounds(bounds, attempt) {
  if (attempt == null) attempt = 0;
  if (attempt === 0) setPoiButtonLoading(true);
  if (attempt >= overpassEndpoints.length) { setPoiButtonLoading(false); savePoiCache(); setPoiMsg("No se pudo conectar con los servidores OSM", "#c62828"); return; }

  capaAgua.clearLayers();
  capaRefugios.clearLayers();
  capaPuertos.clearLayers();
  capaPicos.clearLayers();
  capaBares.clearLayers();
  poiSeen = {};
  fetchedPOIs = [];
  document.getElementById("btn-add-pois").style.display = "none";

  console.log("POI fetch attempt " + attempt + " to " + overpassEndpoints[attempt]);
  setPoiMsg("Buscando puntos de inter\u00E9s\u2026", "#888");
  var sw = bounds.getSouthWest(), ne = bounds.getNorthEast();
  var pad = 0.05;
  var bbox = (sw.lat - pad) + "," + (sw.lng - pad) + "," + (ne.lat + pad) + "," + (ne.lng + pad);
  var q = '[out:json][timeout:30];' +
    '(' +
    'nwr["amenity"="drinking_water"]["drinking_water"!~"no"][!"disused"](' + bbox + ');' +
    'nwr["man_made"="water_tap"]["drinking_water"="yes"][!"disused"](' + bbox + ');' +
    'nwr["amenity"="water_point"][!"disused"](' + bbox + ');' +
    'nwr["amenity"="fountain"]["drinking_water"="yes"][!"disused"](' + bbox + ');' +
    'nwr["natural"="spring"]["drinking_water"!~"no"][!"disused"](' + bbox + ');' +
    'nwr["amenity"="well"]["drinking_water"="yes"][!"disused"](' + bbox + ');' +
    'nwr["tourism"="wilderness_hut"](' + bbox + ');' +
    'nwr["amenity"="shelter"]["shelter_type"~"basic_hut|lean_to|rock_shelter|bivouac"](' + bbox + ');' +
    'nwr["tourism"="picnic_site"]["camp_site"="yes"](' + bbox + ');' +
    'nwr["tourism"="camp_pitch"](' + bbox + ');' +
    'nwr["tourism"="alpine_hut"](' + bbox + ');' +
    'nwr["tourism"="hunting_lodge"](' + bbox + ');' +
    'nwr["tourism"="camp_site"](' + bbox + ');' +
    'nwr["building"~"cabin|shack"](' + bbox + ');' +
    'nwr["mountain_pass"="yes"](' + bbox + ');' +
    'nwr["natural"="saddle"]["name"](' + bbox + ');' +
    'nwr["natural"="peak"](' + bbox + ');' +
    'nwr["amenity"~"^(bar|pub|restaurant|cafe)$"][!"disused"](' + bbox + ');' +
    ');' +
    'out center;';
  var token = ++requestToken;
  var timer = setTimeout(function() {
    if (token === requestToken) fetchOSMPOIsForBounds(bounds, attempt + 1);
  }, 15000);
  fetch("/api/overpass", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({query: q, endpoint: overpassEndpoints[attempt]})
  })
    .then(function(resp) {
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      return resp.json();
    })
    .then(function(data){
      clearTimeout(timer);
      if (token !== requestToken) return;
      console.log("POI fetch OK, elements:", data.elements ? data.elements.length : 0);
      if (!data || !data.elements) { setPoiButtonLoading(false); savePoiCache(); setPoiMsg("El servidor OSM no devolvi\u00F3 datos", "#c62828"); return; }
      var counts = {water:0, shelter:0, pass:0, peak:0, bar:0};
      data.elements.forEach(function(el){
        var c = addFetchedPOI(el);
        if (c) counts[c]++;
      });
      if (fetchedPOIs.length) {
        setPoiButtonLoading(false);
        showPoiSummary(counts);
        savePoiCache();
      } else {
        setPoiButtonLoading(false);
        setPoiMsg("No hay POIs en esta zona", "#888");
        savePoiCache();
      }
    })
    .catch(function(err){
      clearTimeout(timer);
      console.log("POI fetch failed:", err.message || err);
      if (token !== requestToken) return;
      setPoiMsg("Probando servidor alternativo\u2026", "#e65100");
      var myToken = token;
      setTimeout(function() {
        if (myToken === requestToken) fetchOSMPOIsForBounds(bounds, attempt + 1);
      }, 3000);
    });
}
var poiControl = L.control({position:"bottomleft"});
poiControl.onAdd = function() {
  var div = L.DomUtil.create("div", "poi-control");
  div.id = "poi-control";
  div.style.cssText = "background:rgba(255,255,255,0.92);padding:3px 10px;border-radius:4px;box-shadow:0 1px 5px rgba(0,0,0,0.3);font-family:sans-serif;font-size:12px;color:#888;min-width:120px;white-space:nowrap;";
  div.innerHTML = "POI: \u2014";
  return div;
};
poiControl.addTo(map);
function setPoiMsg(msg, color) {
  var el = document.getElementById("poi-control");
  if (el) { el.innerHTML = "POI: " + msg; el.style.color = color || "#888"; }
}
function setPoiButtonLoading(on) {
  var btn = document.getElementById("btn-poi");
  if (on) {
    btn.disabled = true;
    btn.classList.add("loading");
    btn.innerHTML = '<span class="hourglass">\u23F3</span> Buscando POIs...';
  } else {
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.innerHTML = "\uD83D\uDD0D Buscar POIs";
  }
}
document.getElementById("btn-poi").addEventListener("click", function() {
  fetchOSMPOIsForBounds(map.getBounds());
});
function addFetchedPOI(el) {
  var lat = el.lat != null ? el.lat : (el.center && el.center.lat);
  var lon = el.lon != null ? el.lon : (el.center && el.center.lon);
  if (lat == null || lon == null || poiSeen[el.id]) return null;
  poiSeen[el.id] = true;
  var tags = el.tags || {};
  var e = { id: el.id, lat: lat, lon: lon, tags: tags };
  fetchedPOIs.push(e);
  if (tags.amenity === "drinking_water" || tags.amenity === "fountain" || tags.amenity === "water_point" || tags.man_made === "water_tap") { addWaterMarker(e); return "water"; }
  if (tags.natural === "spring" || tags.amenity === "well") { addNaturalWaterMarker(e); return "water"; }
  if (tags.tourism === "wilderness_hut" || tags.amenity === "shelter" || (tags.amenity === "picnic_site" && tags.camp_site === "yes")) { addFreeShelterMarker(e); return "shelter"; }
  if (tags.tourism === "alpine_hut" || tags.tourism === "hunting_lodge" || tags.tourism === "camp_site" || tags.building === "cabin") { addPaidShelterMarker(e); return "shelter"; }
  if (tags.mountain_pass === "yes" || tags.natural === "saddle") { addPassMarker(e); return "pass"; }
  if (tags.natural === "peak") { addPeakMarker(e); return "peak"; }
  if (tags.amenity === "bar" || tags.amenity === "pub" || tags.amenity === "restaurant" || tags.amenity === "cafe") { addBarMarker(e); return "bar"; }
  return null;
}
function showPoiSummary(counts) {
  var parts = [];
  if (counts.water > 0) parts.push(counts.water + " agua" + (counts.water!==1?"s":""));
  if (counts.shelter > 0) parts.push(counts.shelter + " refugio" + (counts.shelter!==1?"s":""));
  if (counts.pass > 0) parts.push(counts.pass + " puerto" + (counts.pass!==1?"s":""));
  if (counts.peak > 0) parts.push(counts.peak + " pico" + (counts.peak!==1?"s":""));
  if (counts.bar > 0) parts.push(counts.bar + " bar/rest" + (counts.bar!==1?"":""));
  setPoiMsg(parts.join(", ") + " encontrados", "#2e7d32");
  document.getElementById("btn-add-pois").style.display = "block";
}
function getCurrentGpxId() {
  try { return localStorage.getItem("mapa-gpx-id") || ""; } catch(ex) { return ""; }
}
function savePoiCache() {
  try { localStorage.setItem("mapa-pois-cache", JSON.stringify({gpxId: getCurrentGpxId(), pois: fetchedPOIs})); } catch(ex) {}
}
function restoreCachedPOIs() {
  var raw;
  try { raw = JSON.parse(localStorage.getItem("mapa-pois-cache")); } catch(ex) {}
  if (!raw || !raw.pois || !raw.pois.length) return;
  if (!getCurrentGpxId() || raw.gpxId !== getCurrentGpxId()) return;
  var counts = {water:0, shelter:0, pass:0, peak:0, bar:0};
  raw.pois.forEach(function(el){
    var c = addFetchedPOI(el);
    if (c) counts[c]++;
  });
  if (fetchedPOIs.length) showPoiSummary(counts);
}
function poiDisplayName(tags) {
  var name;
  if (tags.natural === "peak") {
    name = tags.name ? tags.name : "Pico / Cima";
    if (tags.ele) name += " (" + Math.round(parseFloat(tags.ele)) + " m)";
    return name;
  }
  if (tags.name) name = tags.name;
  else if (tags.amenity === "drinking_water") name = "Fuente de Agua Potable";
  else if (tags.man_made === "water_tap") name = "Grifo";
  else if (tags.amenity === "water_point") name = "Punto de Agua";
  else if (tags.amenity === "fountain") name = "Fuente";
  else if (tags.natural === "spring") name = "Manantial";
  else if (tags.amenity === "well") name = "Pozo";
  else if (tags.tourism === "wilderness_hut") name = "Caba\u00F1a Libre";
  else if (tags.tourism === "alpine_hut") name = "Refugio Guardado";
  else if (tags.tourism === "hunting_lodge") name = "Coto de Caza";
  else if (tags.tourism === "camp_site") name = "Camping";
  else if (tags.tourism === "camp_pitch") name = "\u00C1rea de Acampada";
  else if (tags.tourism === "picnic_site") name = "\u00C1rea de Picnic";
  else if (tags.amenity === "shelter" && tags.shelter_type === "basic_hut") name = "Refugio Libre";
  else if (tags.amenity === "shelter" && tags.shelter_type === "lean_to") name = "Refugio Abierto";
  else if (tags.amenity === "shelter" && tags.shelter_type === "rock_shelter") name = "Cueva\/Abrigo";
  else if (tags.amenity === "shelter" && tags.shelter_type === "bivouac") name = "Zona de Vivac";
  else if (tags.building === "cabin") name = "Caba\u00F1a";
  else if (tags.building === "shack") name = "Cobertizo";
  else if (tags.mountain_pass === "yes" || tags.natural === "saddle") name = "Puerto de Monta\u00F1a";
  else if (tags.amenity === "bar") name = "Bar";
  else if (tags.amenity === "pub") name = "Pub";
  else if (tags.amenity === "restaurant") name = "Restaurante";
  else if (tags.amenity === "cafe") name = "Caf\u00E9";
  else name = "POI";
  if (tags.amenity === "restaurant") name += " (restaurante)";
  else if (tags.amenity === "bar" || tags.amenity === "pub" || tags.amenity === "cafe") name += " (bar)";
  return name;
}
document.getElementById("btn-add-pois").addEventListener("click", function() {
  var btn = this;
  btn.disabled = true;
  btn.textContent = "\u23F3 A\u00F1adiendo...";
  var added = 0;
  var toAdd = [];
  fetchedPOIs.forEach(function(poi) {
    var tags = poi.tags || {};
    var isWater = tags.amenity === "drinking_water" || tags.amenity === "fountain" || tags.amenity === "water_point" || tags.man_made === "water_tap";
    var isNaturalWater = tags.natural === "spring" || tags.amenity === "well";
    var isFreeShelter = tags.tourism === "wilderness_hut" || tags.amenity === "shelter" || (tags.amenity === "picnic_site" && tags.camp_site === "yes");
    var isPaidShelter = tags.tourism === "alpine_hut" || tags.tourism === "hunting_lodge" || tags.tourism === "camp_site" || tags.building === "cabin";
    var isPass = tags.mountain_pass === "yes" || tags.natural === "saddle";
    var isPeak = tags.natural === "peak";
    var isBar = tags.amenity === "bar" || tags.amenity === "pub" || tags.amenity === "restaurant" || tags.amenity === "cafe";
    if (isWater || isNaturalWater) { if (!map.hasLayer(capaAgua)) return; }
    else if (isFreeShelter || isPaidShelter) { if (!map.hasLayer(capaRefugios)) return; }
    else if (isPass) { if (!map.hasLayer(capaPuertos)) return; }
    else if (isPeak) { if (!map.hasLayer(capaPicos)) return; }
    else if (isBar) { if (!map.hasLayer(capaBares)) return; }
    var pt = distanceAtClosestPoint(poi.lat, poi.lon);
    var maxOff = (isWater || isNaturalWater) ? 0.05 : 0.1;
    if (pt.offTrackDist <= maxOff) {
      toAdd.push({poi: poi, pt: pt, isWater: (isWater || isNaturalWater)});
    }
  });
  toAdd.forEach(function(item) {
    var poi = item.poi, pt = item.pt;
    var ele = interpolateEle(pt.dist);
    var poiType = null;
    if (item.isWater) poiType = "water";
    else if (poi.tags.natural === "peak") poiType = "peak";
    else if (poi.tags.mountain_pass === "yes" || poi.tags.natural === "saddle") poiType = "pass";
    try { localStorage.setItem("mapa-new-wp", JSON.stringify({
      name: poiDisplayName(poi.tags),
      dist: pt.dist,
      ele: ele,
      lat: poi.lat,
      lng: poi.lon,
      offTrackDist: pt.offTrackDist,
      poiType: poiType
    })); } catch(ex) {}
    added++;
  });
  btn.textContent = "\u2714 A\u00F1adidos: " + added;
  setTimeout(function() {
    btn.textContent = "\uD83D\uDCCC A\u00F1adir POIs cercanos";
    btn.disabled = false;
  }, 3000);
});
function addWaterMarker(el) {
  var tags = el.tags || {};
  var icon = L.divIcon({
    className: "poi-marker",
    html: '<div style="background:#0288D1;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)">\uD83D\uDEB0</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
  L.marker([el.lat, el.lon], {icon: icon}).addTo(capaAgua).bindPopup(waterPopupHTML(tags, "#0288D1"));
}
function addNaturalWaterMarker(el) {
  var tags = el.tags || {};
  var icon = L.divIcon({
    className: "poi-marker",
    html: '<div style="background:#00BCD4;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)">\uD83D\uDCA7</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
  L.marker([el.lat, el.lon], {icon: icon}).addTo(capaAgua).bindPopup(waterPopupHTML(tags, "#00BCD4"));
}
function addFreeShelterMarker(el) {
  var tags = el.tags || {};
  var icon = L.divIcon({
    className: "poi-marker",
    html: '<div style="background:#2E7D32;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)">\uD83C\uDFD5\uFE0F</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
  L.marker([el.lat, el.lon], {icon: icon}).addTo(capaRefugios).bindPopup(shelterPopupHTML(tags, "free"));
}
function addPaidShelterMarker(el) {
  var tags = el.tags || {};
  var icon = L.divIcon({
    className: "poi-marker",
    html: '<div style="background:#C62828;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)">\uD83C\uDFE0</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
  L.marker([el.lat, el.lon], {icon: icon}).addTo(capaRefugios).bindPopup(shelterPopupHTML(tags, "paid"));
}
function addPassMarker(el) {
  var tags = el.tags || {};
  var icon = L.divIcon({
    className: "poi-marker",
    html: '<div style="background:#6A1B9A;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;font-family:monospace;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)">][</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
  L.marker([el.lat, el.lon], {icon: icon}).addTo(capaPuertos).bindPopup(passPopupHTML(tags));
}
function passPopupHTML(tags) {
  var name = tags.name || "";
  if (!name) {
    if (tags.mountain_pass === "yes") name = "Puerto de Monta\u00F1a";
    else name = "Collado / Puerto";
  }
  var color = "#6A1B9A";
  var ele = tags.ele ? '<br>Altitud: ' + Math.round(parseFloat(tags.ele)) + ' m' : '';
  var extra = "";
  if (tags.ele2) extra += '<br>Altitud (2): ' + Math.round(parseFloat(tags.ele2)) + ' m';
  return '<div style="font-family:sans-serif;font-size:13px;min-width:180px;line-height:1.5"><b style="font-size:14px;color:' + color + '">' + escHtml(name) + '</b><br><span style="color:' + color + '">\u27A1 Collado / Puerto de Monta\u00F1a</span>' + ele + extra + '</div>';
}
function addPeakMarker(el) {
  var tags = el.tags || {};
  var icon = L.divIcon({
    className: "poi-marker",
    html: '<div style="background:#E65100;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;font-family:monospace;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)">\u25B2</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
  L.marker([el.lat, el.lon], {icon: icon}).addTo(capaPicos).bindPopup(peakPopupHTML(tags));
}
function addBarMarker(el) {
  var tags = el.tags || {};
  var icon = L.divIcon({
    className: "poi-marker",
    html: '<div style="background:#F57C00;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)">\uD83C\uDF7A</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
  L.marker([el.lat, el.lon], {icon: icon}).addTo(capaBares).bindPopup(barPopupHTML(tags));
}
function barPopupHTML(tags) {
  var name = tags.name || "";
  if (!name) {
    if (tags.amenity === "bar") name = "Bar";
    else if (tags.amenity === "pub") name = "Pub";
    else if (tags.amenity === "restaurant") name = "Restaurante";
    else if (tags.amenity === "cafe") name = "Caf\u00E9";
    else name = "Bar / Restaurante";
  }
  var color = "#F57C00";
  var label = '\uD83C\uDF7A ';
  if (tags.amenity === "restaurant") label = '\uD83C\uDF7D\uFE0F Restaurante';
  else if (tags.amenity === "cafe") label = '\u2615 Caf\u00E9';
  else if (tags.amenity === "pub") label = '\uD83C\uDF7A Pub';
  else label = '\uD83C\uDF7A Bar';
  var extra = "";
  if (tags.opening_hours) extra += '<br>Horario: ' + escHtml(tags.opening_hours);
  if (tags.website) extra += (extra ? " | " : "<br>") + 'Web: ' + escHtml(tags.website);
  return '<div style="font-family:sans-serif;font-size:13px;min-width:180px;line-height:1.5"><b style="font-size:14px;color:' + color + '">' + escHtml(name) + '</b><br><span style="color:' + color + '">' + label + '</span>' + extra + '</div>';
}
function peakPopupHTML(tags) {
  var name = tags.name || "";
  if (!name) name = "Pico / Cima";
  var color = "#E65100";
  var ele = tags.ele ? '<br>Altitud: ' + Math.round(parseFloat(tags.ele)) + ' m' : '';
  var extra = "";
  if (tags.prominence) extra += '<br>Prominencia: ' + parseInt(tags.prominence) + ' m';
  if (tags.wikipedia) extra += (extra ? " | " : "<br>") + 'Wikipedia: ' + escHtml(tags.wikipedia);
  return '<div style="font-family:sans-serif;font-size:13px;min-width:180px;line-height:1.5"><b style="font-size:14px;color:' + color + '">\u25B2 ' + escHtml(name) + '</b><br><span style="color:' + color + '">Pico / Cima de Monta\u00F1a</span>' + ele + extra + '</div>';
}
function waterPopupHTML(tags, color) {
  color = color || "#0288D1";
  var name = tags.name || "";
  if (!name) {
    if (tags.amenity === "drinking_water") name = "Fuente de Agua Potable";
    else if (tags.amenity === "fountain") name = "Fuente";
    else if (tags.amenity === "water_point") name = "Punto de Agua";
    else if (tags.natural === "spring") name = "Manantial";
    else if (tags.amenity === "well") name = "Pozo";
    else if (tags.man_made === "water_tap") name = "Grifo / Agua Corriente";
    else name = "Fuente / Agua";
  }
  var pot = "";
  if (tags.drinking_water === "yes") pot = '<span style="color:#2e7d32;font-weight:bold">\uD83D\uDCA7 Agua Potable</span>';
  else if (tags.drinking_water === "no") pot = '<span style="color:#c62828;font-weight:bold">\u26A0\uFE0F Agua No Potable / No Tratada</span>';
  else pot = '<span style="color:#757575">\u2753 Potabilidad Desconocida</span>';
  var ele = tags.ele ? '<br>Altitud: ' + Math.round(parseFloat(tags.ele)) + ' m' : '';
  return '<div style="font-family:sans-serif;font-size:13px;min-width:180px;line-height:1.5"><b style="font-size:14px;color:' + color + '">' + escHtml(name) + '</b><br>' + pot + ele + '</div>';
}
function shelterPopupHTML(tags, kind) {
  kind = kind || "free";
  var name = tags.name || "";
  if (!name) {
    if (tags.tourism === "alpine_hut") name = "Refugio Guardado";
    else if (tags.tourism === "hunting_lodge") name = "Coto de Caza / Refugio de Caza";
    else if (tags.tourism === "camp_site") name = "Camping / \u00C1rea de Acampada";
    else if (tags.amenity === "shelter" && tags.shelter_type === "basic_hut") name = "Refugio Libre / Vivac";
    else if (tags.amenity === "shelter" && tags.shelter_type === "lean_to") name = "Refugio Abierto / Lean-to";
    else if (tags.amenity === "shelter" && tags.shelter_type === "wilderness_hut") name = "Caba\u00F1a de Monta\u00F1a";
    else if (tags.amenity === "picnic_site" && tags.camp_site === "yes") name = "\u00C1rea de Picnic con Acampada";
    else if (tags.building === "cabin") name = "Caba\u00F1a / Borda";
    else if (tags.tourism === "wilderness_hut") name = "Caba\u00F1a Libre";
    else name = "Refugio";
  }
  var color, label;
  if (kind === "paid") {
    color = "#C62828";
    if (tags.tourism === "alpine_hut") label = '<span style="color:' + color + '">\uD83C\uDFE0 Refugio Guardado / Albergue (pago)</span>';
    else if (tags.tourism === "hunting_lodge") label = '<span style="color:' + color + '">\uD83C\uDF92 Coto de Caza (privado)</span>';
    else if (tags.tourism === "camp_site") label = '<span style="color:' + color + '">\uD83C\uDFD5\uFE0F Camping / Acampada (pago)</span>';
    else if (tags.building === "cabin") label = '<span style="color:' + color + '">\uD83E\uDEB5 Caba\u00F1a (posiblemente privada)</span>';
    else label = '<span style="color:' + color + '">\uD83C\uDFE0 Refugio (pago/privado)</span>';
  } else {
    color = "#2E7D32";
    if (tags.amenity === "shelter" && tags.shelter_type === "basic_hut") label = '<span style="color:' + color + '">\uD83C\uDFD5\uFE0F Refugio Libre / Vivac</span>';
    else if (tags.amenity === "shelter" && tags.shelter_type === "lean_to") label = '<span style="color:' + color + '">\uD83C\uDFD5\uFE0F Refugio Abierto / Lean-to (libre)</span>';
    else if (tags.amenity === "shelter" && tags.shelter_type === "wilderness_hut") label = '<span style="color:' + color + '">\uD83C\uDFD5\uFE0F Caba\u00F1a de Monta\u00F1a (libre)</span>';
    else if (tags.amenity === "picnic_site" && tags.camp_site === "yes") label = '<span style="color:' + color + '">\uD83C\uDFD5\uFE0F \u00C1rea de Picnic con Acampada (libre)</span>';
    else if (tags.tourism === "wilderness_hut") label = '<span style="color:' + color + '">\uD83C\uDFD5\uFE0F Caba\u00F1a Libre / Vivac</span>';
    else label = '<span style="color:' + color + '">\uD83C\uDFD5\uFE0F Refugio Libre</span>';
  }
  var extra = "";
  if (tags.capacity) extra += '<br>Capacidad: ' + parseInt(tags.capacity) + ' plazas';
  if (tags.fireplace === "yes") extra += (extra ? " | " : "<br>") + 'Dispone de chimenea';
  if (tags.operator) extra += (extra ? " | " : "<br>") + 'Operador: ' + escHtml(tags.operator);
  var ele = tags.ele ? '<br>Altitud: ' + Math.round(parseFloat(tags.ele)) + ' m' : '';
  return '<div style="font-family:sans-serif;font-size:13px;min-width:200px;line-height:1.5"><b style="font-size:14px;color:' + color + '">' + escHtml(name) + '</b><br>' + label + extra + ele + '</div>';
}
function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function renderWpMarkers(waypoints) {
  wpLayer.clearLayers();
  if (!waypoints || !waypoints.length) return;
  waypoints.forEach(function(wp) {
    if (!wp.lat || !wp.lng) return;
    var isSel = selectedWp && selectedWp.name === wp.name && selectedWp.dist === wp.dist;
    var border = isSel ? '3px solid #FFD700' : '2px solid #fff';
    var icon = L.divIcon({
      className: "wp-marker",
      html: '<div style="background:#1a1a1a;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:' + border + ';box-shadow:0 0 6px ' + (isSel ? 'rgba(255,215,0,0.7)' : 'rgba(0,0,0,0.3)') + '">'+(wp.number || '')+'</div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    var marker = L.marker([wp.lat, wp.lng], {icon: icon}).addTo(wpLayer).bindTooltip(wp.name, {permanent:false, direction:"top", offset:[0,-14]});
    marker._wpData = wp;
    marker.on("click", function(e) {
      L.DomEvent.stopPropagation(e);
      selectWp(this._wpData);
    });
  });
}
function selectWp(wp) {
  selectedWp = wp;
  renderWpMarkers(profileWaypoints);
}
map.on("click", function() {
  if (selectedWp) {
    selectedWp = null;
    renderWpMarkers(profileWaypoints);
  }
});
document.addEventListener("keydown", function(e) {
  if ((e.key === "x" || e.key === "X" || e.key === "Delete" || e.key === "Supr") && selectedWp && e.target === document.body) {
    e.preventDefault();
    (async function() {
      var wp = selectedWp;
      var ok = await showMapConfirm("Eliminar WP", "Eliminar " + wp.name + "?");
      if (!ok) return;
      var idx = -1;
      for (var i = 0; i < profileWaypoints.length; i++) {
        if (profileWaypoints[i] === wp) { idx = i; break; }
      }
      if (idx === -1) return;
      var name = wp.name, dist = wp.dist;
      profileWaypoints.splice(idx, 1);
      selectedWp = null;
      renderWpMarkers(profileWaypoints);
      renderProfile();
      try { localStorage.setItem("mapa-del-wp", JSON.stringify({name: name, dist: dist})); } catch(ex) {}
    })();
  }
});

function handleOrientationChange() {
  setTimeout(function() {
    map.invalidateSize();
    if (profileX === null || window.innerWidth < 768) {
      profileX = window.innerWidth - profileW - 10;
      profileY = window.innerHeight - profileH - 10;
      localStorage.setItem("profileX", profileX);
      localStorage.setItem("profileY", profileY);
      updatePanelPos();
    }
  }, 300);
}
window.addEventListener("orientationchange", handleOrientationChange);
window.addEventListener("resize", handleOrientationChange);

var trackPolyline = null;

function updateTrackStyle() {
  if (!trackPolyline) return;
  trackPolyline.setStyle({
    color: document.getElementById("track-color").value,
    weight: parseInt(document.getElementById("track-width").value)
  });
}

var savedColor = localStorage.getItem("trackColor");
var savedWidth = localStorage.getItem("trackWidth");
if (savedColor) document.getElementById("track-color").value = savedColor;
if (savedWidth) {
  document.getElementById("track-width").value = savedWidth;
  document.getElementById("track-width-val").textContent = savedWidth;
}

document.getElementById("track-color").addEventListener("input", function() {
  localStorage.setItem("trackColor", this.value);
  if (trackPolyline) updateTrackStyle();
});
document.getElementById("track-width").addEventListener("input", function() {
  localStorage.setItem("trackWidth", this.value);
  document.getElementById("track-width-val").textContent = this.value;
  if (trackPolyline) updateTrackStyle();
});

// ================================================================
// Exportacion del mapa a imagen (solo mapa base + track + WPs)
// Se emite con la vista actual del usuario (sin reencuadrar).
// ================================================================
function restoreExportForLayers(layers, wasOn) {
  layers.forEach(function(l, i) {
    if (wasOn[i] && !map.hasLayer(l)) map.addLayer(l);
  });
}
function drawTrackPolylineOnCanvas(canvas) {
  var ctx = canvas.getContext("2d");
  var color = document.getElementById("track-color").value;
  var width = parseInt(document.getElementById("track-width").value);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (var i = 0; i < trackpoints.length; i++) {
    var p = map.latLngToContainerPoint(L.latLng(trackpoints[i].lat, trackpoints[i].lng));
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
}
function drawWaypointMarkersOnCanvas(canvas) {
  var ctx = canvas.getContext("2d");
  var r = 11;
  for (var i = 0; i < profileWaypoints.length; i++) {
    var wp = profileWaypoints[i];
    if (wp.lat == null || wp.lng == null) continue;
    var p = map.latLngToContainerPoint(L.latLng(wp.lat, wp.lng));
    var cx = Math.round(p.x), cy = Math.round(p.y);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 4;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(wp.number || "", cx, cy + 1);
    ctx.restore();
  }
}
function getExportBaseName() {
  var id = getCurrentGpxId() || "";
  var i = id.indexOf(":");
  var n = i === -1 ? id : id.slice(i + 1);
  return n || "track";
}
function downloadDataUrl(dataUrl, filename) {
  var a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
window.__mapaExportRunning = false;
function triggerMapExport(format) {
  if (!trackPolyline || !trackpoints.length) { alert("No hay track cargado para exportar."); return; }
  if (window.__mapaExportRunning) return;
  window.__mapaExportRunning = true;
  var overlayLayers = [capaAgua, capaRefugios, capaPuertos, capaPicos, capaBares, hiking, wpLayer];
  var wasOn = overlayLayers.map(function(l) { var on = map.hasLayer(l); if (on) map.removeLayer(l); return on; });
  setTimeout(function() {
    if (typeof leafletImage !== "function") {
      restoreExportForLayers(overlayLayers, wasOn);
      window.__mapaExportRunning = false;
      alert("No se pudo cargar el motor de exportacion.");
      return;
    }
    leafletImage(map, function(err, canvas) {
      if (!canvas) {
        restoreExportForLayers(overlayLayers, wasOn);
        window.__mapaExportRunning = false;
        alert("No se pudo exportar el mapa.");
        return;
      }
      drawTrackPolylineOnCanvas(canvas);
      drawWaypointMarkersOnCanvas(canvas);
      restoreExportForLayers(overlayLayers, wasOn);
      try {
        var dataUrl = (format === "jpg")
          ? canvas.toDataURL("image/jpeg", 0.92)
          : canvas.toDataURL("image/png");
        window.__mapaExportRunning = false;
        downloadDataUrl(dataUrl, "mapa_track_" + getExportBaseName() + "." + format);
      } catch (e) {
        window.__mapaExportRunning = false;
        alert("La capa base actual no permite exportar la imagen (requiere CORS). Prueba con otra capa base.");
      }
    });
  }, 200);
}
document.getElementById("btn-export-png").addEventListener("click", function() { triggerMapExport("png"); });
document.getElementById("btn-export-jpg").addEventListener("click", function() { triggerMapExport("jpg"); });

var profileWaypoints = [];
var minEle = 0, maxEle = 0;

var profileW = parseInt(localStorage.getItem("profileW")) || 300;
var profileH = parseInt(localStorage.getItem("profileH")) || 150;

function updatePanelPos() {
  var panel = document.getElementById("profile-panel");
  if (profileX !== null) {
    panel.style.left = profileX + "px";
    panel.style.top = profileY + "px";
    panel.style.bottom = "auto";
    panel.style.right = "auto";
  }
}

function renderProfile() {
  if (!trackpoints.length) return;
  updatePanelPos();
  var canvas = document.getElementById("profile-canvas");
  var w = profileW, h = profileH;
  canvas.width = w;
  canvas.height = h;
  var ctx = canvas.getContext("2d");
  var padL = 45, padR = 10, padT = 15, padB = 20;
  var plotW = w - padL - padR;
  var plotH = h - padT - padB;
  var totalDist = trackpoints[trackpoints.length-1].dist;
  var eleRange = (maxEle - minEle) || 1;

  ctx.clearRect(0, 0, w, h);

  // fill
  ctx.beginPath();
  ctx.moveTo(padL, padT + plotH);
  for (var i = 0; i < trackpoints.length; i++) {
    var x = padL + (trackpoints[i].dist / totalDist) * plotW;
    var y = padT + plotH - ((trackpoints[i].ele - minEle) / eleRange) * plotH;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.closePath();
  ctx.fillStyle = "rgba(21,101,192,0.15)";
  ctx.fill();

  // profile line
  ctx.beginPath();
  for (var i = 0; i < trackpoints.length; i++) {
    var x = padL + (trackpoints[i].dist / totalDist) * plotW;
    var y = padT + plotH - ((trackpoints[i].ele - minEle) / eleRange) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = document.getElementById("track-color").value;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Y axis labels
  ctx.fillStyle = "#666";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(maxEle.toFixed(0), padL - 4, padT);
  ctx.fillText(minEle.toFixed(0), padL - 4, padT + plotH);
  var midEle = (minEle + maxEle) / 2;
  ctx.fillText(midEle.toFixed(0), padL - 4, padT + plotH / 2);

  // X axis labels
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#666";
  ctx.font = "9px sans-serif";
  var step = totalDist <= 5 ? 0.5 : totalDist <= 20 ? 1 : totalDist <= 50 ? 5 : totalDist <= 100 ? 10 : 20;
  for (var d = 0; d <= totalDist; d += step) {
    var x = padL + (d / totalDist) * plotW;
    ctx.fillText(d.toFixed(d % 1 === 0 ? 0 : 1) + " km", x, padT + plotH + 4);
    ctx.beginPath();
    ctx.moveTo(x, padT + plotH - 3);
    ctx.lineTo(x, padT + plotH);
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillText(totalDist.toFixed(1) + " km", padL + plotW, padT + plotH + 4);

  // waypoint markers
  for (var i = 0; i < profileWaypoints.length; i++) {
    var wp = profileWaypoints[i];
    var wx = padL + (wp.dist / totalDist) * plotW;
    ctx.beginPath();
    ctx.moveTo(wx, padT);
    ctx.lineTo(wx, padT + plotH);
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#1565C0";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(wp.number || wp.name, wx, padT - 2);
  }
}

var profileX = parseFloat(localStorage.getItem("profileX")) || null;
var profileY = parseFloat(localStorage.getItem("profileY")) || null;
var dragging = false, resizing = false;
var resizeMode = "";
var dragStartX, dragStartY, resizeStartX, resizeStartY, startW, startH, startX, startY;
var profilePanel = document.getElementById("profile-panel");
var profileCanvas = document.getElementById("profile-canvas");
var profileCloseBtn = document.getElementById("profile-close");
var profileReopenBtn = document.getElementById("profile-reopen");
var profileCollapsed = localStorage.getItem("profileCollapsed") === "1";
var EDGE = 10;

function applyProfileVisibility() {
  if (profileCollapsed) {
    profilePanel.style.display = "none";
    profileReopenBtn.style.display = "block";
  } else {
    profilePanel.style.display = "";
    profileReopenBtn.style.display = "none";
  }
}
profileCloseBtn.addEventListener("mousedown", function(e) { e.stopPropagation(); });
profileCloseBtn.addEventListener("click", function(e) {
  e.stopPropagation();
  profileCollapsed = true;
  localStorage.setItem("profileCollapsed", "1");
  applyProfileVisibility();
});
profileReopenBtn.addEventListener("click", function() {
  profileCollapsed = false;
  localStorage.setItem("profileCollapsed", "0");
  applyProfileVisibility();
  updatePanelPos();
  renderProfile();
});
applyProfileVisibility();

function getResizeMode(ev) {
  var r = profilePanel.getBoundingClientRect();
  var x = ev.clientX - r.left, y = ev.clientY - r.top;
  var l = x < EDGE, rEdge = x > r.width - EDGE;
  var t = y < EDGE, b = y > r.height - EDGE;
  if (t && l) return "tl";
  if (t && rEdge) return "tr";
  if (b && l) return "bl";
  if (b && rEdge) return "br";
  if (t) return "t";
  if (b) return "b";
  if (l) return "l";
  if (rEdge) return "r";
  return "";
}

function resizeCursor(mode) {
  var map = {tl:"nwse-resize", tr:"nesw-resize", bl:"nesw-resize", br:"nwse-resize", t:"ns-resize", b:"ns-resize", l:"ew-resize", r:"ew-resize"};
  return map[mode] || "grab";
}

profilePanel.addEventListener("mousemove", function(ev) {
  if (resizing || dragging) return;
  profilePanel.style.cursor = resizeCursor(getResizeMode(ev));
});

profilePanel.addEventListener("mousedown", function(ev) {
  if (ev.button !== 0) return;
  var mode = getResizeMode(ev);
  if (mode) {
    resizing = true;
    resizeMode = mode;
    profilePanel.style.cursor = resizeCursor(mode);
    resizeStartX = ev.clientX;
    resizeStartY = ev.clientY;
    startW = profileW;
    startH = profileH;
    startX = profileX;
    startY = profileY;
    return;
  }
  dragging = true;
  profilePanel.style.cursor = "grabbing";
  dragStartX = ev.clientX;
  dragStartY = ev.clientY;
});

document.addEventListener("mousemove", function(ev) {
  if (dragging) {
    profileX += ev.clientX - dragStartX;
    profileY += ev.clientY - dragStartY;
    dragStartX = ev.clientX;
    dragStartY = ev.clientY;
    localStorage.setItem("profileX", profileX);
    localStorage.setItem("profileY", profileY);
    updatePanelPos();
    return;
  }
  if (!resizing) return;
  var dx = ev.clientX - resizeStartX;
  var dy = ev.clientY - resizeStartY;
  var nw = profileW, nh = profileH;
  if (resizeMode === "br") { nw = Math.max(120, startW + dx); nh = Math.max(60, startH + dy); }
  else if (resizeMode === "tl") { nw = Math.max(120, startW - dx); nh = Math.max(60, startH - dy); profileX = startX + (startW - nw); profileY = startY + (startH - nh); }
  else if (resizeMode === "tr") { nw = Math.max(120, startW + dx); nh = Math.max(60, startH - dy); profileY = startY + (startH - nh); }
  else if (resizeMode === "bl") { nw = Math.max(120, startW - dx); nh = Math.max(60, startH + dy); profileX = startX + (startW - nw); }
  else if (resizeMode === "t") { nh = Math.max(60, startH - dy); profileY = startY + (startH - nh); }
  else if (resizeMode === "b") { nh = Math.max(60, startH + dy); }
  else if (resizeMode === "l") { nw = Math.max(120, startW - dx); profileX = startX + (startW - nw); }
  else if (resizeMode === "r") { nw = Math.max(120, startW + dx); }
  profileW = nw; profileH = nh;
  localStorage.setItem("profileW", profileW);
  localStorage.setItem("profileH", profileH);
  updatePanelPos();
  renderProfile();
});

document.addEventListener("mouseup", function(ev) {
  dragging = false;
  resizing = false;
  profilePanel.style.cursor = "";
});

window.addEventListener("storage", function(e) {
  if (e.key === "mapa-wp-update" && e.newValue) {
    var wps;
    try { wps = JSON.parse(e.newValue); } catch(ex) {}
    if (!wps) return;
    profileWaypoints = wps;
    selectedWp = null;
    renderWpMarkers(profileWaypoints);
    renderProfile();
  }
  if (e.key === "mapa-revision") {
    window.close();
  }
});

(function loadMapaData() {
  var raw;
  try { raw = JSON.parse(localStorage.getItem("mapa-track-data")); } catch(ex) {}
  if (!raw || !raw.trackpoints || !raw.trackpoints.length) {
    document.body.innerHTML = '<div style="font-family:sans-serif;padding:2em;color:#c62828">No hay datos de ruta. Abre primero un archivo GPX en el editor de perfiles.</div>';
    return;
  }
  trackpoints = raw.trackpoints;
  minEle = trackpoints[0].ele;
  maxEle = trackpoints[0].ele;
  for (var i = 1; i < trackpoints.length; i++) {
    if (trackpoints[i].ele < minEle) minEle = trackpoints[i].ele;
    if (trackpoints[i].ele > maxEle) maxEle = trackpoints[i].ele;
  }
  var margin = (maxEle - minEle) * 0.1 || 10;
  minEle -= margin;
  maxEle += margin;
  profileWaypoints = raw.waypoints || [];
  selectedWp = null;
  if (profileX === null) {
    profileX = window.innerWidth - profileW - 10;
    profileY = window.innerHeight - profileH - 10;
  }
  if (window.innerWidth < 768) {
    profileX = Math.max(10, Math.min(profileX, window.innerWidth - profileW - 10));
    profileY = Math.max(10, Math.min(profileY, window.innerHeight - profileH - 10));
  }
  localStorage.setItem("profileX", profileX);
  localStorage.setItem("profileY", profileY);
  updatePanelPos();
  var latlngs = trackpoints.map(function(tp){ return [tp.lat, tp.lng]; });
  trackPolyline = L.polyline(latlngs, {color: document.getElementById("track-color").value, weight: parseInt(document.getElementById("track-width").value)}).addTo(map);
  map.fitBounds(trackPolyline.getBounds().pad(0.05));
  renderWpMarkers(profileWaypoints);
  renderProfile();
  capaAgua.clearLayers();
  capaRefugios.clearLayers();
  capaPuertos.clearLayers();
  capaPicos.clearLayers();
  capaBares.clearLayers();
  poiSeen = {};
  restoreCachedPOIs();
})();
