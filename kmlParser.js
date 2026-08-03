var kmlParser = {
  parse: function(xmlString) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, 'text/xml');
    const trackpoints = [];

    const coordsEls = xml.getElementsByTagName('coordinates');
    for (let ci = 0; ci < coordsEls.length; ci++) {
      const el = coordsEls[ci];
      if (!hasAncestor(el, 'LineString')) continue;
      if (hasAncestor(el, 'Point')) continue;
      addCoordsPoints(trackpoints, el.textContent);
    }

    const gxCoords = xml.getElementsByTagName('gx:coord');
    for (let gi = 0; gi < gxCoords.length; gi++) {
      addGxCoord(trackpoints, gxCoords[gi].textContent);
    }

    const waypoints = [];
    const placemarks = xml.getElementsByTagName('Placemark');
    for (let pi = 0; pi < placemarks.length; pi++) {
      const pm = placemarks[pi];
      const point = pm.getElementsByTagName('Point')[0];
      if (!point) continue;
      const coords = point.getElementsByTagName('coordinates')[0];
      if (!coords) continue;
      const parts = coords.textContent.trim().split(/\s+/);
      if (!parts.length) continue;
      const c = parts[0].split(',');
      const lat = parseFloat(c[1]);
      const lng = parseFloat(c[0]);
      if (isNaN(lat) || isNaN(lng)) continue;
      const nameEl = pm.getElementsByTagName('name')[0];
      const name = nameEl ? nameEl.textContent : '';
      const hasEle = c.length > 2 && !isNaN(parseFloat(c[2]));
      const ele = hasEle ? parseFloat(c[2]) : null;
      waypoints.push({lat: lat, lng: lng, name: name, ele: ele, hasEle: hasEle});
    }

    var accumulatedDist = 0;
    for (var i = 0; i < trackpoints.length; i++) {
      if (i > 0) {
        accumulatedDist += haversine(trackpoints[i-1].lat, trackpoints[i-1].lng, trackpoints[i].lat, trackpoints[i].lng);
      }
      trackpoints[i].dist = accumulatedDist;
    }
    var elevations = trackpoints.map(function(p) { return p.ele; });
    waypoints.forEach(function(wp) {
      var nearest = 0, minDist = Infinity;
      for (var i = 0; i < trackpoints.length; i++) {
        var d = haversine(wp.lat, wp.lng, trackpoints[i].lat, trackpoints[i].lng);
        if (d < minDist) { minDist = d; nearest = i; }
      }
      wp.dist = trackpoints[nearest].dist;
      if (!wp.hasEle) wp.ele = trackpoints[nearest].ele;
    });
    var zones = [];
    var dataEls = xml.getElementsByTagName('Data');
    for (var di = 0; di < dataEls.length; di++) {
      if (dataEls[di].getAttribute('name') === 'editorperfiles_zones') {
        var valueEl = dataEls[di].getElementsByTagName('value')[0];
        if (valueEl) {
          try {
            var parsed = JSON.parse(valueEl.textContent);
            if (Array.isArray(parsed)) zones = parsed;
          } catch (e) {}
        }
        break;
      }
    }
    return {
      trackpoints: trackpoints,
      totalDistance: accumulatedDist,
      maxEle: trackpoints.length ? Math.max.apply(null, elevations) : 0,
      minEle: trackpoints.length ? Math.min.apply(null, elevations) : 0,
      waypoints: waypoints,
      zones: zones
    };
  }
};
function hasAncestor(el, tag) {
  var n = el.parentNode;
  while (n && n.nodeType === 1) {
    if (n.localName === tag) return true;
    n = n.parentNode;
  }
  return false;
}
function addCoordsPoints(arr, text) {
  var parts = text.trim().split(/\s+/);
  for (var i = 0; i < parts.length; i++) {
    var c = parts[i].split(',');
    var lng = parseFloat(c[0]);
    var lat = parseFloat(c[1]);
    if (isNaN(lat) || isNaN(lng)) continue;
    var ele = c.length > 2 && !isNaN(parseFloat(c[2])) ? parseFloat(c[2]) : 0;
    arr.push({lat: lat, lng: lng, ele: ele});
  }
}
function addGxCoord(arr, text) {
  var parts = text.trim().split(/\s+/);
  if (parts.length < 2) return;
  var lng = parseFloat(parts[0]);
  var lat = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return;
  var ele = parts.length > 2 && !isNaN(parseFloat(parts[2])) ? parseFloat(parts[2]) : 0;
  arr.push({lat: lat, lng: lng, ele: ele});
}
