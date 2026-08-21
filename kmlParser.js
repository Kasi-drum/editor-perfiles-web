var kmlParser = {
  parseTracks: function(xmlString) {
    var parser = new DOMParser();
    var xml = parser.parseFromString(xmlString, 'text/xml');

    var placemarks = xml.getElementsByTagName('Placemark');
    var tracks = [];
    var allWaypoints = [];
    var zones = [];

    for (var pi = 0; pi < placemarks.length; pi++) {
      var pm = placemarks[pi];
      var nameEl = pm.getElementsByTagName('name')[0];
      var trackName = nameEl && nameEl.textContent ? nameEl.textContent.trim() : 'Track ' + (tracks.length + 1);

      var trackpoints = [];

      var lineStrings = pm.getElementsByTagName('LineString');
      for (var li = 0; li < lineStrings.length; li++) {
        var ls = lineStrings[li];
        var coordsEl = ls.getElementsByTagName('coordinates')[0];
        if (coordsEl) addCoordsPoints(trackpoints, coordsEl.textContent);
      }

      var gxCoords = pm.getElementsByTagName('gx:coord');
      for (var gi = 0; gi < gxCoords.length; gi++) {
        addGxCoord(trackpoints, gxCoords[gi].textContent);
      }

      var gxTracks = pm.getElementsByTagName('gx:Track');
      for (var ti = 0; ti < gxTracks.length; ti++) {
        var gxtc = gxTracks[ti].getElementsByTagName('gx:coord');
        for (var gi = 0; gi < gxtc.length; gi++) {
          addGxCoord(trackpoints, gxtc[gi].textContent);
        }
      }

      if (trackpoints.length > 0) {
        var accumulatedDist = 0;
        for (var i = 0; i < trackpoints.length; i++) {
          if (i > 0) {
            accumulatedDist += haversine(trackpoints[i-1].lat, trackpoints[i-1].lng, trackpoints[i].lat, trackpoints[i].lng);
          }
          trackpoints[i].dist = accumulatedDist;
        }
        var elevations = trackpoints.map(function(p) { return p.ele; });
        tracks.push({
          name: trackName,
          trackpoints: trackpoints,
          totalDistance: accumulatedDist,
          maxEle: elevations.length ? Math.max.apply(null, elevations) : 0,
          minEle: elevations.length ? Math.min.apply(null, elevations) : 0
        });
      }

      var pmWaypoints = pm.getElementsByTagName('Point');
      for (var wi = 0; wi < pmWaypoints.length; wi++) {
        var wpCoords = pmWaypoints[wi].getElementsByTagName('coordinates')[0];
        if (!wpCoords) continue;
        var parts = wpCoords.textContent.trim().split(/\s+/);
        if (!parts.length) continue;
        var c = parts[0].split(',');
        if (c.length < 2) continue;
        var lat = parseFloat(c[1]);
        var lng = parseFloat(c[0]);
        if (isNaN(lat) || isNaN(lng)) continue;
        var hasEle = c.length > 2 && !isNaN(parseFloat(c[2]));
        var ele = hasEle ? parseFloat(c[2]) : null;
        allWaypoints.push({lat: lat, lng: lng, name: trackName, ele: ele, hasEle: hasEle});
      }
    }

    for (var di = 0; di < xml.getElementsByTagName('Data').length; di++) {
      var dataEl = xml.getElementsByTagName('Data')[di];
      if (dataEl.getAttribute('name') === 'editorperfiles_zones') {
        var valueEl = dataEl.getElementsByTagName('value')[0];
        if (valueEl) {
          try {
            var parsed = JSON.parse(valueEl.textContent);
            if (Array.isArray(parsed)) zones = parsed;
          } catch (e) {}
        }
        break;
      }
    }

    if (tracks.length > 1) {
      for (var wi = 0; wi < allWaypoints.length; wi++) {
        var wp = allWaypoints[wi];
        var bestIdx = 0, bestDist = Infinity;
        for (var ti = 0; ti < tracks.length; ti++) {
          var tps = tracks[ti].trackpoints;
          for (var pi = 0; pi < tps.length; pi++) {
            var d = haversine(wp.lat, wp.lng, tps[pi].lat, tps[pi].lng);
            if (d < bestDist) { bestDist = d; bestIdx = ti; }
          }
        }
        wp.trackName = tracks[bestIdx].name;
      }
    }

    return { tracks: tracks, waypoints: allWaypoints, zones: zones };
  },
  attachWaypoints: function(waypoints, trackpoints) {
    if (!trackpoints.length) return;
    waypoints.forEach(function(wp) {
      var nearest = 0, minDist = Infinity;
      for (var i = 0; i < trackpoints.length; i++) {
        var d = haversine(wp.lat, wp.lng, trackpoints[i].lat, trackpoints[i].lng);
        if (d < minDist) { minDist = d; nearest = i; }
      }
      wp.dist = trackpoints[nearest].dist;
      if (!wp.hasEle) wp.ele = trackpoints[nearest].ele;
    });
  },
  parse: function(xmlString) {
    var parsed = this.parseTracks(xmlString);

    if (parsed.tracks.length > 1) {
      for (var ti = 0; ti < parsed.tracks.length; ti++) {
        var twps = [];
        for (var wi = 0; wi < parsed.waypoints.length; wi++) {
          if (parsed.waypoints[wi].trackName === parsed.tracks[ti].name) {
            twps.push(parsed.waypoints[wi]);
          }
        }
        parsed.tracks[ti].waypoints = twps;
      }
      return {
        tracks: parsed.tracks,
        waypoints: parsed.waypoints,
        zones: parsed.zones,
        multiple: true
      };
    }

    var trackpoints = parsed.tracks.length === 1 ? parsed.tracks[0].trackpoints : [];
    var accumulatedDist = trackpoints.length ? trackpoints[trackpoints.length - 1].dist : 0;
    var elevations = trackpoints.map(function(p) { return p.ele; });
    this.attachWaypoints(parsed.waypoints, trackpoints);
    return {
      trackpoints: trackpoints,
      totalDistance: accumulatedDist,
      maxEle: elevations.length ? Math.max.apply(null, elevations) : 0,
      minEle: elevations.length ? Math.min.apply(null, elevations) : 0,
      waypoints: parsed.waypoints,
      zones: parsed.zones
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
