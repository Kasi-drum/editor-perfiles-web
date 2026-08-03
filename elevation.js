function calculateElevationProfile(trackpoints, maxDist, opts) {
  if (!trackpoints || trackpoints.length < 2) return { pos: 0, neg: 0, profile: [] };
  const threshold = (opts && opts.threshold != null) ? opts.threshold : 2.0;
  const windowSize = (opts && opts.windowSize != null) ? opts.windowSize : 5;

  const limpias = trackpoints.map(p => ({ ...p }));
  for (let i = 1; i < limpias.length; i++) {
    if (Math.abs(limpias[i].ele - limpias[i - 1].ele) > 50.0) {
      limpias[i].ele = limpias[i - 1].ele;
    }
  }

  const n = limpias.length;
  const halfWindow = Math.floor(windowSize / 2);
  const suavizadas = new Array(n);

  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(n - 1, i + halfWindow);
    for (let j = start; j <= end; j++) {
      sum += limpias[j].ele;
      count++;
    }
    suavizadas[i] = { ...limpias[i], ele: sum / count };
  }

  const THRESHOLD = threshold;
  let ascent = 0;
  let descent = 0;
  let accumulator = 0;

  const profile = suavizadas.map((pt, i) => {
    if (i === 0) {
      return { dist: pt.dist, ele: pt.ele, dPos: 0, dNeg: 0 };
    }

    const delta = pt.ele - suavizadas[i - 1].ele;
    accumulator += delta;

    if (accumulator >= THRESHOLD) {
      ascent += accumulator;
      accumulator = 0;
    }
    else if (accumulator <= -THRESHOLD) {
      descent += Math.abs(accumulator);
      accumulator = 0;
    }

    return {
      dist: pt.dist,
      ele: pt.ele,
      dPos: Math.round(ascent),
      dNeg: -Math.round(descent)
    };
  });

  if (maxDist != null) {
    const filtered = profile.filter(p => p.dist <= maxDist);
    const last = filtered[filtered.length - 1] || profile[0];
    return { pos: last.dPos, neg: last.dNeg, profile: filtered };
  }
  const last = profile[profile.length - 1];
  return { pos: last.dPos, neg: last.dNeg, profile };
}
