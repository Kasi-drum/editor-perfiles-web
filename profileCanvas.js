class ProfileCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.trackpoints = [];
    this.totalDistance = 0;
    this.maxEle = 0;
    this.minEle = 0;
    this.margin = { top: 35, right: 40, bottom: 35, left: 50 };
    this.paddingTop = 300;
    this.paddingBottom = 100;
    this.showGrid = true;
    this.showWaypoints = true;
    this.showZones = true;
    this.mostrarLineasVerticales = true;
    this.mostrarSimbolos = true;
    this.mostrarNombres = true;
    this.waypoints = [];
    this.zones = [];
    this.selectedElement = null;
    this.mouseX = -1;
    this.zoneStartDist = -1;
    this.zonePreviewDist = -1;
    this.isSelectingZone = false;
    this.elevationProfile = null;
    this.wpLabelsOverlay = document.getElementById("wp-labels-overlay");
    this.resize();
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("load", () => this.resize());
    var ro = new ResizeObserver(function(entries) {
      this.resize();
    }.bind(this));
    ro.observe(canvas.parentElement.parentElement);
  }
  calcExtraPadding(cleanH) {
    if (!this.trackpoints.length || this.maxEle <= this.minEle) return 0;
    var r = this.maxEle - this.minEle;
    var s = 10;
    if (r > 100) s = 20;
    if (r > 250) s = 50;
    if (r > 500) s = 100;
    if (r > 1000) s = 200;
    var bottomEle = Math.floor(this.minEle / s) * s;
    var profileH = (cleanH || (this.height - this.paddingTop - this.paddingBottom)) - 50;
    return Math.ceil(((this.minEle - bottomEle) / r) * profileH + 96);
  }
  resize() {
    var dpr = window.devicePixelRatio || 1;
    var parent = this.canvas.parentElement;
    if (!parent) return;
    var w = parent.clientWidth || 100;
    var cleanW = w - this.margin.left - this.margin.right;
    var ratio = window.innerWidth < 768 ? 3 : 5;
    var cleanH = Math.max(80, cleanW / ratio);
    this.paddingBottom = 100 + Math.max(0, this.calcExtraPadding(cleanH));
    var h = cleanH + this.paddingTop + this.paddingBottom;
    this.width = w;
    this.height = h;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    parent.style.height = h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.trackpoints.length) this.render();
  }
  loadData(data) {
    this.trackpoints = data.trackpoints;
    this.totalDistance = data.totalDistance;
    this.maxEle = data.maxEle;
    this.minEle = data.minEle;
    this.elevationProfile = null;
    this.resize();
  }
  setElevationProfile(profile) {
    this.elevationProfile = profile;
    this.render();
  }
  get drawArea() {
    var w = this.width - this.margin.left - this.margin.right;
    var h = this.height - this.paddingTop - this.paddingBottom;
    return { x: this.margin.left, y: this.paddingTop, width: w, height: h };
  }
  xPos(dist) {
    var a = this.drawArea;
    var maxDist = this.totalDistance || 1;
    return a.x + (dist / maxDist) * a.width;
  }
  yPos(ele) {
    var a = this.drawArea;
    var eleRange = (this.maxEle - this.minEle) || 1;
    var profileTop = a.y + 50;
    var profileHeight = a.height - 50;
    return profileTop + profileHeight - ((ele - this.minEle) / eleRange) * profileHeight;
  }
  get gridBottom() {
    return this.axisY;
  }
  get axisY() {
    var r = (this.maxEle - this.minEle) || 1;
    var s = 10;
    if (r > 100) s = 20;
    if (r > 250) s = 50;
    if (r > 500) s = 100;
    if (r > 1000) s = 200;
    return this.yPos(Math.floor(this.minEle / s) * s);
  }
  render() {
    var ctx = this.ctx, w = this.width, h = this.height;
    var dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!this.trackpoints.length) {
      ctx.fillStyle = "#999"; ctx.font = "18px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Abre un archivo GPX", w/2, h/2); return;
    }
    var area = this.drawArea;
    var axisY = this.axisY;
    if (this.showGrid) GridRenderer(ctx, area, this);
    // FASE 1: Waypoint leaders (detrás del perfil)
    if (this.showWaypoints && this.waypoints.length) {
      this._computeWaypointLayout();
    }
    // FASE 2: Relleno y trazo del perfil
    ctx.beginPath();
    ctx.moveTo(this.xPos(this.trackpoints[0].dist), axisY);
    for (var i = 0; i < this.trackpoints.length; i++) {
      ctx.lineTo(this.xPos(this.trackpoints[i].dist), this.yPos(this.trackpoints[i].ele));
    }
    var last = this.trackpoints.length - 1;
    ctx.lineTo(this.xPos(this.trackpoints[last].dist), axisY);
    ctx.closePath();
    ctx.fillStyle = "#BFE8FF"; ctx.fill();
    if (this.showZones) {
      for (var i = 0; i < this.zones.length; i++) this.renderZone(ctx, this.zones[i]);
    }
    if (this.isSelectingZone && this.zonePreviewDist >= 0) {
      this.renderZone(ctx, {startDist: Math.min(this.zoneStartDist, this.zonePreviewDist), endDist: Math.max(this.zoneStartDist, this.zonePreviewDist), startEle: this.interpolateEle(this.zoneStartDist), endEle: this.interpolateEle(this.zonePreviewDist)});
    }
    ctx.beginPath();
    for (var i = 0; i < this.trackpoints.length; i++) {
      var x = this.xPos(this.trackpoints[i].dist);
      var y = this.yPos(this.trackpoints[i].ele);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#1565C0"; ctx.lineWidth = 2; ctx.stroke();
    // FASE 2b: Waypoint leaders (encima del perfil)
    if (this.showWaypoints && this._wpLayout && this.mostrarLineasVerticales && (this.mostrarSimbolos || this.mostrarNombres)) {
      var layout = this._wpLayout;
      for (var i = 0; i < this.waypoints.length; i++) {
        var wp = this.waypoints[i];
        var x = this.xPos(wp.dist);
        var symX = layout.leaderInfo[i] ? layout.leaderInfo[i].shiftX : x;
        var symY = layout.symYs[i];
        var surfaceY = this.yPos(this.interpolateEle(wp.dist));
        ctx.beginPath();
        ctx.moveTo(x, this.axisY);
        ctx.lineTo(x, surfaceY);
        ctx.lineTo(symX, symY);
        ctx.strokeStyle = this.selectedElement === wp ? "#1565C0" : "#888";
        ctx.lineWidth = this.selectedElement === wp ? 2 : 0.5;
        ctx.stroke();
      }
    }
    // FASE 3: Regla y etiquetas del eje X
    if (this.totalDistance > 0.001) {
      var padding = 6;
      ctx.beginPath();
      for (var km = 0; km <= Math.floor(this.totalDistance); km++) {
        var gx = this.xPos(km);
        if (gx < area.x - 5 || gx > area.x + area.width + 5) continue;
        ctx.moveTo(gx, axisY);
        ctx.lineTo(gx, axisY + 6);
      }
      var totalGx = this.xPos(this.totalDistance);
      if (totalGx >= area.x - 5 && totalGx <= area.x + area.width + 5) {
        ctx.moveTo(totalGx, axisY);
        ctx.lineTo(totalGx, axisY + 6);
      }
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.stroke();
      var labelY = axisY + 21;
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      var drawnLabels = [];
      for (var km = 0; km <= Math.floor(this.totalDistance); km++) {
        var gx = this.xPos(km);
        if (gx < area.x - 5 || gx > area.x + area.width + 5) continue;
        var labelW = ctx.measureText(km + " km").width;
        var collides = false;
        for (var di = 0; di < drawnLabels.length; di++) {
          var dl = drawnLabels[di];
          if (gx + labelW/2 + padding > dl.x - dl.w/2 && gx - labelW/2 - padding < dl.x + dl.w/2) { collides = true; break; }
        }
        if (totalGx >= area.x - 5 && totalGx <= area.x + area.width + 5) {
          if (gx + labelW/2 + padding > totalGx - ctx.measureText(this.totalDistance.toFixed(1) + " km").width/2 &&
              gx - labelW/2 - padding < totalGx + ctx.measureText(this.totalDistance.toFixed(1) + " km").width/2) { collides = true; }
        }
        if (!collides) {
          ctx.fillStyle = "#888";
          ctx.fillText(km + " km", gx, labelY);
          drawnLabels.push({x: gx, w: labelW});
        }
      }
      if (totalGx >= area.x - 5 && totalGx <= area.x + area.width + 5) {
        ctx.fillStyle = "#333";
        ctx.fillText(this.totalDistance.toFixed(1) + " km", totalGx, labelY);
      }
    }
    // FASE 4: Símbolos
    if (this._wpLayout) {
      var layout = this._wpLayout;
      for (var i = 0; i < this.waypoints.length; i++) {
        this.renderWaypoint(ctx, this.waypoints[i], layout.symYs[i], layout.colInfo[i], layout.leaderInfo[i]);
      }
    }
    this.renderWpLabels();
    this.renderBottomInfo(ctx);
    if (this.mouseX >= 0) {
      if (this.mouseX >= area.x && this.mouseX <= area.x + area.width) {
        var dist = ((this.mouseX - area.x) / area.width) * this.totalDistance;
        var profileY = this.yPos(this.interpolateEle(dist));
        ctx.beginPath();
        ctx.moveTo(this.mouseX, axisY);
        ctx.lineTo(this.mouseX, profileY);
        ctx.strokeStyle = "#e53935";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#333";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(dist.toFixed(1) + " km", this.mouseX, axisY + 35);
        ctx.fillStyle = "#e53935";
        ctx.font = "12px sans-serif";
        ctx.fillText(this.interpolateEle(dist).toFixed(0) + " m", this.mouseX, axisY + 51);
      }
    }
  }
  _computeWaypointLayout() {
    var r = Math.max(6, Math.min(10, this.width / 100));
    var baseSymY = this.yPos(this.maxEle) - 50;
    var minDist = r * 2 + 1;
    var positions = [];
    for (var i = 0; i < this.waypoints.length; i++) {
      positions.push({x: this.xPos(this.waypoints[i].dist), symY: baseSymY});
    }
    var targetX = [];
    for (var i = 0; i < positions.length; i++) targetX[i] = positions[i].x;
    // Fase 1: Detectar subgrupos iniciales por proximidad (< minDist)
    var groups = [];
    var inGroup = false;
    for (var i = 1; i < positions.length; i++) {
      if (positions[i].x - positions[i-1].x < minDist) {
        if (!inGroup) { groups.push({first: i-1, last: i}); inGroup = true; }
        else { groups[groups.length-1].last = i; }
      } else { inGroup = false; }
    }
    // Absorción expansiva: si el bloque centrado invade un vecino, absorberlo
    var absorbed = true;
    while (absorbed) {
      absorbed = false;
      for (var g = 0; g < groups.length && !absorbed; g++) {
        var grp = groups[g];
        var first = grp.first, last = grp.last;
        var N = last - first + 1;
        var ancho = (N - 1) * minDist;
        var centro = (positions[first].x + positions[last].x) / 2;
        var X_start = centro - ancho / 2;
        if (first > 0) {
          var li = first - 1;
          var inG = false;
          for (var gg = 0; gg < groups.length; gg++) {
            if (groups[gg].first <= li && groups[gg].last >= li) { inG = true; break; }
          }
          if (!inG && Math.abs(X_start - positions[li].x) < minDist) {
            grp.first = li; absorbed = true;
          }
        }
        if (!absorbed && last < positions.length - 1) {
          var ri = last + 1;
          var inG = false;
          for (var gg = 0; gg < groups.length; gg++) {
            if (groups[gg].first <= ri && groups[gg].last >= ri) { inG = true; break; }
          }
          var X_end = X_start + ancho;
          if (!inG && Math.abs(positions[ri].x - X_end) < minDist) {
            grp.last = ri; absorbed = true;
          }
        }
        if (absorbed) break;
      }
    }
    // Fusión de grupos adyacentes cuyos bloques centrados colisionen
    var merged = true;
    while (merged) {
      merged = false;
      for (var g = 0; g < groups.length - 1; g++) {
        var grpA = groups[g], grpB = groups[g+1];
        var NA = grpA.last - grpA.first + 1, NB = grpB.last - grpB.first + 1;
        var centroA = (positions[grpA.first].x + positions[grpA.last].x) / 2;
        var centroB = (positions[grpB.first].x + positions[grpB.last].x) / 2;
        var X_end_A = centroA + ((NA - 1) * minDist) / 2;
        var X_start_B = centroB - ((NB - 1) * minDist) / 2;
        if (X_start_B - X_end_A < minDist) {
          grpA.last = grpB.last;
          groups.splice(g+1, 1);
          merged = true;
          break;
        }
      }
    }
    // Fase 2 y 3: Posicionamiento rígido centrado con separación exacta minDist
    var gi = 0;
    for (var i = 0; i < positions.length; i++) {
      if (gi < groups.length && i === groups[gi].first) {
        var first = groups[gi].first, last = groups[gi].last;
        var N = last - first + 1;
        var centro = (positions[first].x + positions[last].x) / 2;
        var X_start = centro - ((N - 1) * minDist) / 2;
        for (var k = 0; k < N; k++) targetX[first + k] = X_start + k * minDist;
        i = last;
        gi++;
      }
    }
    var leaderInfo = new Array(positions.length);
    for (var i = 0; i < leaderInfo.length; i++) leaderInfo[i] = null;
    for (var i = 0; i < positions.length; i++) {
      if (Math.abs(targetX[i] - positions[i].x) > 0.5)
        leaderInfo[i] = {shiftX: targetX[i], breakY: this.yPos(this.interpolateEle(this.waypoints[i].dist))};
    }
    var colInfo = new Array(positions.length).fill(2);
    this._wpLayout = {symYs: positions.map(function(p){return p.symY;}), colInfo: colInfo, leaderInfo: leaderInfo};
  }
  renderZone(ctx, zone) {
    var axisY = this.axisY;
    var isDescending = (zone.endEle || this.interpolateEle(zone.endDist)) < (zone.startEle || this.interpolateEle(zone.startDist));
    var fillColor = isDescending ? "rgba(13, 71, 161, 0.4)" : "rgba(255, 48, 48, 0.4)";
    var lineColor = isDescending ? "#0d47a1" : "#e53935";
    ctx.beginPath();
    var started = false;
    for (var i = 0; i < this.trackpoints.length; i++) {
      var tp = this.trackpoints[i];
      if (tp.dist >= zone.startDist && tp.dist <= zone.endDist) {
        var x = this.xPos(tp.dist), y = this.yPos(tp.ele);
        if (!started) {
          ctx.moveTo(this.xPos(zone.startDist), this.yPos(this.interpolateEle(zone.startDist)));
          started = true;
        }
        ctx.lineTo(x, y);
      }
    }
    if (started) {
      ctx.lineTo(this.xPos(zone.endDist), this.yPos(this.interpolateEle(zone.endDist)));
      ctx.lineTo(this.xPos(zone.endDist), axisY);
      ctx.lineTo(this.xPos(zone.startDist), axisY);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      if (this.selectedElement === zone) {
        ctx.strokeStyle = lineColor; ctx.lineWidth = 2;
        ctx.stroke();
      }
      var sx = this.xPos(zone.startDist), ex = this.xPos(zone.endDist);
      var sy = this.yPos(this.interpolateEle(zone.startDist));
      var ey = this.yPos(this.interpolateEle(zone.endDist));
      if (this.selectedElement !== zone) {
        ctx.beginPath(); ctx.moveTo(sx, axisY); ctx.lineTo(sx, sy);
        ctx.moveTo(ex, axisY); ctx.lineTo(ex, ey);
        ctx.strokeStyle = lineColor; ctx.lineWidth = 1;
        ctx.stroke();
      }
      var textEnd = axisY + 55;
      ctx.beginPath(); ctx.moveTo(sx, axisY); ctx.lineTo(sx, textEnd);
      ctx.moveTo(ex, axisY); ctx.lineTo(ex, textEnd);
      ctx.stroke();
    }
  }
  renderWaypoint(ctx, wp, symY, col, leader) {
    var x = this.xPos(wp.dist);
    var area = this.drawArea;
    var radius = Math.max(6, Math.min(10, this.width / 100));
    var isSel = this.selectedElement === wp;
    var symX = leader ? leader.shiftX : x;
    if (this.mostrarSimbolos) {
      ctx.beginPath(); ctx.arc(symX, symY, radius, 0, Math.PI * 2);
      var od = wp.offTrackDist || 0;
      if (od <= 0.05) ctx.fillStyle = "#1565C0";
      else if (od <= 0.1) ctx.fillStyle = "#FFB74D";
      else ctx.fillStyle = "#BDBDBD";
      ctx.fill();
      if (isSel) { ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.fillStyle = "#FFF";
      ctx.font = "bold " + radius + "px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(wp.number, symX, symY);
    }
  }
  renderBottomInfo(ctx) {
    var fb = this.axisY;
    var yDist = fb + 49;
    var yElev = fb + 67;
    for (var i = 0; i < this.zones.length; i++) {
      var z = this.zones[i];
      var segDist = z.endDist - z.startDist;
      var midX = this.xPos(z.startDist + segDist/2);
      var ev = this.calcZoneElevation(z);
      ctx.fillStyle = "#333"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(segDist.toFixed(1) + ' km', midX, yDist);
      ctx.fillStyle = "#e53935"; ctx.fillText('+' + ev.pos + ' m', midX, yElev);
      ctx.fillStyle = "#0d47a1"; ctx.fillText(ev.neg + ' m', midX, yElev + 16);
    }
  }
  calcZoneElevation(z) {
    if (!this.elevationProfile || !this.elevationProfile.profile) return {pos: 0, neg: 0, net: 0};
    const profile = this.elevationProfile.profile;
    const startPt = profile.find(p => p.dist >= z.startDist) || profile[0];
    const endPt = profile.find(p => p.dist >= z.endDist) || profile[profile.length - 1];
    const pos = Math.max(0, endPt.dPos - startPt.dPos);
    const neg = Math.min(0, endPt.dNeg - startPt.dNeg);
    return {pos: Math.round(pos), neg: Math.round(neg), net: Math.round(pos + neg)};
  }
  interpolateEle(dist) {
    var pts = this.trackpoints;
    for (var i = 0; i < pts.length - 1; i++) {
      if (dist >= pts[i].dist && dist <= pts[i+1].dist) {
        var r = (dist - pts[i].dist) / (pts[i+1].dist - pts[i].dist);
        return pts[i].ele + r * (pts[i+1].ele - pts[i].ele);
      }
    }
    return dist <= pts[0].dist ? pts[0].ele : pts[pts.length-1].ele;
  }
  renderWpLabels() {
    if (!this.wpLabelsOverlay || !this._wpLayout) return;
    if (!this.mostrarNombres) { this.wpLabelsOverlay.innerHTML = ""; return; }
    var layout = this._wpLayout;
    this.wpLabelsOverlay.innerHTML = "";
    for (var i = 0; i < this.waypoints.length; i++) {
      var wp = this.waypoints[i];
      var symX = layout.leaderInfo[i] ? layout.leaderInfo[i].shiftX : this.xPos(wp.dist);
      var symY = layout.symYs[i];
      var radius = Math.max(6, Math.min(10, this.width / 100));
      var label = this.mostrarSimbolos ? wp.name : wp.number + " - " + wp.name;
      if (wp.poiType === "peak") label = "\u25B2 " + label;
      else if (wp.poiType === "pass") label = "][" + label;
      var adj = this.mostrarSimbolos ? radius + 5 : 5;
      var labelStartY = symY - adj;
      var el = document.createElement("span");
      el.className = "wp-label";
      if (wp.poiType === "pass") {
        el.innerHTML = "<b>][</b> " + label.replace(/^\]\[/, "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      } else {
        el.textContent = label;
      }
      el.style.left = (symX - 6) + "px";
      el.style.top = labelStartY + "px";
      this.wpLabelsOverlay.appendChild(el);
      var rng = document.createRange();
      rng.selectNodeContents(el);
      el.style.left = (symX - rng.getBoundingClientRect().width / 2) + "px";
    }
  }
}
