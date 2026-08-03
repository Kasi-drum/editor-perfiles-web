var gpxParser = {
  parse: function(xmlString) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, 'text/xml');
    const trkpts = xml.querySelectorAll('trkpt');
    const trackpoints = [];
    trkpts.forEach(function(pt) {
      trackpoints.push({
        lat: parseFloat(pt.getAttribute('lat')),
        lng: parseFloat(pt.getAttribute('lon')),
        ele: pt.querySelector('ele') ? parseFloat(pt.querySelector('ele').textContent) : 0
      });
    });
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
    return {
      trackpoints: trackpoints,
      totalDistance: accumulatedDist,
      maxEle: Math.max.apply(null, elevations),
      minEle: Math.min.apply(null, elevations),
      waypoints: waypoints,
      zones: zones
    };
  }
};
function haversine(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}