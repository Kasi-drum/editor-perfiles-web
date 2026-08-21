var gpxParser = {
  parseTracks: function(xmlString) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, 'text/xml');

    const wpts = xml.querySelectorAll('wpt');
    var waypoints = [];
    wpts.forEach(function(pt) {
      var lat = parseFloat(pt.getAttribute('lat'));
      var lon = parseFloat(pt.getAttribute('lon'));
      var name = pt.querySelector('name') ? pt.querySelector('name').textContent : '';
      var eleEl = pt.querySelector('ele');
      var ele = eleEl ? parseFloat(eleEl.textContent) : null;
      waypoints.push({lat: lat, lng: lon, name: name, ele: ele, hasEle: !!eleEl});
    });

    var zones = [];
    var zoneEls = xml.getElementsByTagName('zns:zone');
    for (var zi = 0; zi < zoneEls.length; zi++) {
      var z = zoneEls[zi];
      zones.push({
        id: z.getAttribute('id') || ('zone-' + (zi + 1)),
        name: z.getAttribute('name') || ('Zona ' + (zi + 1)),
        startDist: parseFloat(z.getAttribute('start')),
        endDist: parseFloat(z.getAttribute('end')),
        startEle: z.getAttribute('startEle') !== null ? parseFloat(z.getAttribute('startEle')) : null,
        endEle: z.getAttribute('endEle') !== null ? parseFloat(z.getAttribute('endEle')) : null
      });
    }

    var trks = xml.querySelectorAll('trk');
    var tracks = [];
    trks.forEach(function(trk, ti) {
      var nameEl = trk.querySelector('name');
      var name = nameEl && nameEl.textContent ? nameEl.textContent.trim() : 'Track ' + (ti + 1);
      var trackpoints = [];
      trk.querySelectorAll('trkpt').forEach(function(pt) {
        trackpoints.push({
          lat: parseFloat(pt.getAttribute('lat')),
          lng: parseFloat(pt.getAttribute('lon')),
          ele: pt.querySelector('ele') ? parseFloat(pt.querySelector('ele').textContent) : 0
        });
      });
      var accumulatedDist = 0;
      for (var i = 0; i < trackpoints.length; i++) {
        if (i > 0) {
          accumulatedDist += haversine(trackpoints[i-1].lat, trackpoints[i-1].lng, trackpoints[i].lat, trackpoints[i].lng);
        }
        trackpoints[i].dist = accumulatedDist;
      }
      var elevations = trackpoints.map(function(p) { return p.ele; });
      tracks.push({
        name: name,
        trackpoints: trackpoints,
        totalDistance: accumulatedDist,
        maxEle: elevations.length ? Math.max.apply(null, elevations) : 0,
        minEle: elevations.length ? Math.min.apply(null, elevations) : 0
      });
    });

    return { tracks: tracks, waypoints: waypoints, zones: zones };
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
      return {
        tracks: parsed.tracks,
        waypoints: parsed.waypoints,
        zones: parsed.zones,
        multiple: true
      };
    }

    var trackpoints = parsed.tracks.length === 1 ? parsed.tracks[0].trackpoints : collectAllTrackpoints(xmlString);
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
function collectAllTrackpoints(xmlString) {
  var parser = new DOMParser();
  var xml = parser.parseFromString(xmlString, 'text/xml');
  var trkpts = xml.querySelectorAll('trkpt');
  var trackpoints = [];
  trkpts.forEach(function(pt) {
    trackpoints.push({
      lat: parseFloat(pt.getAttribute('lat')),
      lng: parseFloat(pt.getAttribute('lon')),
      ele: pt.querySelector('ele') ? parseFloat(pt.querySelector('ele').textContent) : 0
    });
  });
  var accumulatedDist = 0;
  for (var i = 0; i < trackpoints.length; i++) {
    if (i > 0) {
      accumulatedDist += haversine(trackpoints[i-1].lat, trackpoints[i-1].lng, trackpoints[i].lat, trackpoints[i].lng);
    }
    trackpoints[i].dist = accumulatedDist;
  }
  return trackpoints;
}
function haversine(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
