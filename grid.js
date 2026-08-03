function GridRenderer(ctx, area, profile) {
  var x = area.x, y = area.y, w = area.width, h = area.height;
  var minEle = profile.minEle, maxEle = profile.maxEle;
  var eleRange = maxEle - minEle;
  var step = 10;
  if (eleRange > 100) step = 20;
  if (eleRange > 250) step = 50;
  if (eleRange > 500) step = 100;
  if (eleRange > 1000) step = 200;
  var topEle = Math.ceil((maxEle + 10) / step) * step;
  var bottomEle = Math.floor(minEle / step) * step;
  var topY = profile.yPos(topEle);
  if (topY < area.y) topY = area.y;
  var gb = profile.gridBottom;

  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 0.5;

  // Vertical grid lines (1 per km)
  var totalKm = profile.totalDistance;
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (var km = 0; km <= Math.floor(totalKm); km++) {
    var gx = profile.xPos(km);
    if (gx < x - 5 || gx > x + w + 5) continue;
    ctx.beginPath();
    ctx.moveTo(gx, topY);
    ctx.lineTo(gx, gb);
    ctx.stroke();
  }
  var totalGx = profile.xPos(totalKm);
  if (totalKm > 0.001 && totalGx >= x - 5 && totalGx <= x + w + 5) {
    ctx.beginPath();
    ctx.moveTo(totalGx, topY);
    ctx.lineTo(totalGx, gb);
    ctx.stroke();
  }

  // Horizontal elevation grid lines (lowest = axis)
  for (var ele = bottomEle; ele <= topEle; ele += step) {
    var gy = profile.yPos(ele);
    var isAxis = (ele === bottomEle);
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
    ctx.strokeStyle = isAxis ? "#999" : "#e0e0e0";
    ctx.lineWidth = isAxis ? 1 : 0.5;
    ctx.stroke();
    ctx.fillStyle = "#888";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(ele + " m", x - 5, gy);
  }
}
