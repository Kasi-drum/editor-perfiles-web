var ExportEngine = {
  toSVG: function(p) {
    var a = p.drawArea, lines = '', fill = '', wps = '', wpLeaders = '', zones = '', grid = '', gridLabels = '';
    var fb = p.gridBottom;
    var gb = fb;
    var minEle = p.minEle, maxEle = p.maxEle;
    var step = 10, eleRange = maxEle - minEle;
    if (eleRange > 100) step = 20;
    if (eleRange > 250) step = 50;
    if (eleRange > 500) step = 100;
    if (eleRange > 1000) step = 200;
    var topEle = Math.ceil((maxEle + 10) / step) * step;
    var bottomEle = Math.floor(minEle / step) * step;
    var topY = p.yPos(topEle);
    if (topY < a.y + p.paddingTop) topY = a.y + p.paddingTop;

    for (var i = 0; i < p.trackpoints.length; i++) {
      var x = p.xPos(p.trackpoints[i].dist), y = p.yPos(p.trackpoints[i].ele);
      var c = i === 0 ? 'M' : 'L';
      lines += c + x + ',' + y + ' ';
      fill += c + x + ',' + y + ' ';
    }
    var lp = p.trackpoints.length - 1;
    fill += 'L' + p.xPos(p.trackpoints[lp].dist) + ',' + fb + ' ';
    fill += 'L' + p.xPos(p.trackpoints[0].dist) + ',' + fb + ' Z';

    // Vertical grid lines
    var totalKm = p.totalDistance;
    for (var km = 0; km <= Math.floor(totalKm); km++) {
      var gx = p.xPos(km);
      if (gx < a.x - 5 || gx > a.x + a.width + 5) continue;
      grid += '<line x1="' + gx + '" y1="' + topY + '" x2="' + gx + '" y2="' + gb + '" stroke="#e0e0e0" stroke-width="0.5"/>';
    }
    var totalGx = p.xPos(totalKm);
    if (totalKm > 0.001 && totalGx >= a.x - 5 && totalGx <= a.x + a.width + 5) {
      grid += '<line x1="' + totalGx + '" y1="' + topY + '" x2="' + totalGx + '" y2="' + gb + '" stroke="#e0e0e0" stroke-width="0.5"/>';
    }

    // Km labels
    var labelY = fb + 21;
    var totalLabelW = totalKm.toFixed(1).length * 7 + 16;
    var drawnKmLabels = [];
    for (var km = 0; km <= Math.floor(totalKm); km++) {
      var gx = p.xPos(km);
      if (gx < a.x - 5 || gx > a.x + a.width + 5) continue;
      var kmLabelW = (km + " km").length * 7 + 6;
      var skip = false;
      for (var di = 0; di < drawnKmLabels.length; di++) {
        var dl = drawnKmLabels[di];
        if (gx + kmLabelW/2 > dl.x - dl.w/2 && gx - kmLabelW/2 < dl.x + dl.w/2) { skip = true; break; }
      }
      if (!skip && totalGx >= a.x - 5 && totalGx <= a.x + a.width + 5) {
        if (gx + kmLabelW/2 + 6 > totalGx - totalLabelW/2 && gx - kmLabelW/2 - 6 < totalGx + totalLabelW/2) { skip = true; }
      }
      if (!skip) {
        gridLabels += '<text x="' + gx + '" y="' + labelY + '" fill="#888" font-size="12" font-weight="bold" text-anchor="middle" font-family="sans-serif">' + km + ' km</text>';
        drawnKmLabels.push({x: gx, w: kmLabelW});
      }
    }
    if (totalGx >= a.x - 5 && totalGx <= a.x + a.width + 5) {
      gridLabels += '<text x="' + totalGx + '" y="' + labelY + '" fill="#333" font-size="12" font-weight="bold" text-anchor="middle" font-family="sans-serif">' + totalKm.toFixed(1) + ' km</text>';
    }

    // Horizontal elevation lines (lowest = axis)
    for (var ele = bottomEle; ele <= topEle; ele += step) {
      var gy = p.yPos(ele);
      var isAxis = (ele === bottomEle);
      grid += '<line x1="' + a.x + '" y1="' + gy + '" x2="' + (a.x + a.width) + '" y2="' + gy + '" stroke="' + (isAxis ? '#999' : '#e0e0e0') + '" stroke-width="' + (isAxis ? '1' : '0.5') + '"/>';
      gridLabels += '<text x="' + (a.x - 5) + '" y="' + gy + '" fill="#888" font-size="12" font-weight="bold" text-anchor="end" dominant-baseline="middle" font-family="sans-serif">' + ele + ' m</text>';
    }

    // Zones
    for (var i = 0; i < p.zones.length; i++) {
      var z = p.zones[i];
      var isDesc = z.endEle < z.startEle;
      var zoneFill = isDesc ? 'rgba(13,71,161,0.4)' : 'rgba(255,48,48,0.4)';
      var zoneLine = isDesc ? '#0d47a1' : '#e53935';
      var path = '';
      for (var j = 0; j < p.trackpoints.length; j++) {
        var tp = p.trackpoints[j];
        if (tp.dist >= z.startDist && tp.dist <= z.endDist) {
          var x = p.xPos(tp.dist), y = p.yPos(tp.ele);
          path += (path ? 'L' : 'M') + x + ',' + y + ' ';
        }
      }
      if (path) {
        var sx = p.xPos(z.startDist), sy = p.yPos(p.interpolateEle(z.startDist));
        var ex = p.xPos(z.endDist), ey = p.yPos(p.interpolateEle(z.endDist));
        path = 'M' + sx + ',' + sy + ' ' + path + 'L' + ex + ',' + ey + 'L' + ex + ',' + fb + 'L' + sx + ',' + fb + 'Z';
        zones += '<path d="' + path + '" fill="' + zoneFill + '"/>';
        zones += '<line x1="' + sx + '" y1="' + fb + '" x2="' + sx + '" y2="' + sy + '" stroke="' + zoneLine + '" stroke-width="1"/>';
        zones += '<line x1="' + ex + '" y1="' + fb + '" x2="' + ex + '" y2="' + ey + '" stroke="' + zoneLine + '" stroke-width="1"/>';
        zones += '<line x1="' + sx + '" y1="' + fb + '" x2="' + sx + '" y2="' + (fb + 55) + '" stroke="' + zoneLine + '" stroke-width="1"/>';
        zones += '<line x1="' + ex + '" y1="' + fb + '" x2="' + ex + '" y2="' + (fb + 55) + '" stroke="' + zoneLine + '" stroke-width="1"/>';
        var midX = (sx + ex) / 2;
        var ev = p.calcZoneElevation(z);
        zones += '<text x="' + midX + '" y="' + (fb + 49) + '" fill="#333" font-size="11" text-anchor="middle" font-family="sans-serif">' + (z.endDist - z.startDist).toFixed(1) + ' km</text>';
        zones += '<text x="' + midX + '" y="' + (fb + 67) + '" fill="#e53935" font-size="11" text-anchor="middle" font-family="sans-serif">+' + ev.pos + ' m</text>';
        var negColor = isDesc ? '#0d47a1' : '#e53935';
        zones += '<text x="' + midX + '" y="' + (fb + 83) + '" fill="' + negColor + '" font-size="11" text-anchor="middle" font-family="sans-serif">' + ev.neg + ' m</text>';
      }
    }

    // Waypoints — usar layout ya calculado por _computeWaypointLayout()
    var r = Math.max(6, Math.min(10, p.width / 100));
    var layout = p._wpLayout;
    var symYs = layout ? layout.symYs : null;
    var leaderInfo = layout ? layout.leaderInfo : null;
    for (var i = 0; i < p.waypoints.length; i++) {
      var wp = p.waypoints[i];
      var x = p.xPos(wp.dist);
      var sy = symYs ? symYs[i] : p.yPos(p.maxEle) - 50;
      var leader = leaderInfo ? leaderInfo[i] : null;
      var symX = leader ? leader.shiftX : x;
      if (p.mostrarLineasVerticales && (p.mostrarSimbolos || p.mostrarNombres)) {
        var surfaceY = p.yPos(p.interpolateEle(wp.dist));
        wpLeaders += '<polyline points="' + x + ',' + fb + ' ' + x + ',' + surfaceY + ' ' + symX + ',' + sy + '" fill="none" stroke="#888" stroke-width="0.5"/>';
      }
      if (p.mostrarSimbolos) {
        wps += '<circle cx="' + symX + '" cy="' + sy + '" r="' + r + '" fill="#1565C0"/>';
        wps += '<text x="' + symX + '" y="' + sy + '" fill="white" font-size="' + r + '" text-anchor="middle" dominant-baseline="central" font-weight="bold" font-family="sans-serif">' + wp.number + '</text>';
      }
      if (p.mostrarNombres) {
        var label = p.mostrarSimbolos ? wp.name : wp.number + " - " + wp.name;
        if (wp.poiType === "peak") label = "\u25B2 " + label;
        else if (wp.poiType === "pass") label = "][" + label;
        var adj = p.mostrarSimbolos ? r + 5 : 5;
        var labelY = sy - adj;
        // Ensure rotated text (extends upward) stays within viewBox
        var textH = label.length * 6.5 + 4;
        if (labelY < textH) labelY = textH;
        var textContent = label;
        if (wp.poiType === "pass") {
          textContent = '<tspan font-weight="bold">][</tspan> ' + label.replace(/^\]\[/, "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
        }
        wps += '<text x="' + symX + '" y="' + labelY + '" fill="#333" font-size="11" transform="rotate(-90 ' + symX + ',' + labelY + ')" text-anchor="start" font-family="sans-serif">' + textContent + '</text>';
      }
    }

    var svg = '<?xml version="1.0" encoding="UTF-8"?>';
    svg += '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + p.width + ' ' + p.height + '" width="' + p.width + '" height="' + p.height + '">';
    svg += '<rect width="' + p.width + '" height="' + p.height + '" fill="white"/>';
    svg += grid;
    svg += '<path d="' + fill + '" fill="#BFE8FF"/>';
    svg += gridLabels;
    svg += zones;
    svg += '<path d="' + lines + '" fill="none" stroke="#1565C0" stroke-width="2"/>';
    svg += wpLeaders;
    svg += wps;
    svg += '</svg>';
    return svg;
  }
};
