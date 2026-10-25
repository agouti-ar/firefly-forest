// Zodiac glyphs sampled along vector strokes: no fonts or downloaded assets.
export function createZodiacPatterns(count) {
  const line = (...points) => points;
  const arc = (x, y, r, from = 0, to = Math.PI * 2, aspect = 1) =>
    Array.from({ length: 41 }, (_, i) => {
      const a = from + (to - from) * i / 40;
      return [x + Math.cos(a) * r, y + Math.sin(a) * r * aspect];
    });
  const curve = (a, b, c, d) => Array.from({ length: 33 }, (_, i) => {
    const t = i / 32, s = 1 - t;
    return [s ** 3 * a[0] + 3 * s * s * t * b[0] + 3 * s * t * t * c[0] + t ** 3 * d[0],
      s ** 3 * a[1] + 3 * s * s * t * b[1] + 3 * s * t * t * c[1] + t ** 3 * d[1]];
  });
  const definitions = [
    ['Aries', [line([0, -2.2], [0, 0.6]),
      curve([0, 0.6], [-0.2, 3], [-3, 2.9], [-2, 0.5]),
      curve([0, 0.6], [0.2, 3], [3, 2.9], [2, 0.5])]],
    ['Taurus', [arc(0, -0.5, 1.5),
      curve([-1.9, 2.3], [-1.7, 0.6], [1.7, 0.6], [1.9, 2.3])]],
    ['Gemini', [curve([-2, 2.2], [-0.7, 1.9], [0.7, 1.9], [2, 2.2]),
      curve([-2, -2.2], [-0.7, -1.9], [0.7, -1.9], [2, -2.2]),
      line([-1.1, -2.02], [-1.1, 2.02]), line([1.1, -2.02], [1.1, 2.02])]],
    ['Cancer', [arc(-1, 0.9, 0.7), arc(1, -0.9, 0.7),
      curve([-1.7, 0.9], [-1.1, 2.7], [0.9, 2.5], [2.3, 1.1]),
      curve([1.7, -0.9], [1.1, -2.7], [-0.9, -2.5], [-2.3, -1.1])]],
    ['Leo', [arc(-1.5, -0.7, 0.65),
      curve([-1.1, -0.2], [-2, 2.9], [1.9, 3.4], [1.4, 0.6]),
      curve([1.4, 0.6], [-0.4, -1.6], [1.2, -2.6], [2.2, -0.9])]],
    ['Virgo', [line([-2.3, -1.9], [-2.3, 1.1]),
      curve([-2.3, 1.1], [-2.3, 2.4], [-0.9, 2.4], [-0.9, 1.1]),
      line([-0.9, 1.1], [-0.9, -1.9]),
      curve([-0.9, 1.1], [-0.9, 2.4], [0.5, 2.4], [0.5, 1.1]),
      line([0.5, 1.1], [0.5, -1.9]),
      curve([0.5, 0.6], [2.7, 3.2], [3.4, -1.5], [0.5, -1.9]),
      curve([0.5, -0.6], [1.2, -1.8], [1.6, -2.2], [2.6, -2.1])]],
    ['Libra', [line([-2.5, -1.8], [2.5, -1.8]), line([-2.5, -0.6], [-1.35, -0.6]),
      arc(0, -0.6, 1.35, Math.PI, 0), line([1.35, -0.6], [2.5, -0.6])]],
    ['Scorpio', [line([-2.2, -1.8], [-2.2, 1.2]),
      curve([-2.2, 1.2], [-2.2, 2.5], [-0.8, 2.5], [-0.8, 1.2]),
      line([-0.8, 1.2], [-0.8, -1.8]),
      curve([-0.8, 1.2], [-0.8, 2.5], [0.6, 2.5], [0.6, 1.2]),
      line([0.6, 1.2], [0.6, -0.9]),
      curve([0.6, -0.9], [0.6, -2.4], [2.1, -2.4], [2.6, -0.9]),
      line([1.6, -1.1], [2.6, -0.9], [2.4, -2])]],
    ['Sagittarius', [line([-2.1, -2.1], [2.1, 2.1]), line([0.4, 2.1], [2.1, 2.1], [2.1, 0.4]),
      line([-1.8, 0.6], [0.6, -1.8])]],
    ['Capricorn', [line([-2.5, 1.5], [-1.5, -1.9], [-0.1, 1.3]),
      curve([-0.1, 1.3], [1.1, 2.2], [0.6, -0.9], [1.6, -1.9]),
      curve([1.6, -1.9], [3.5, -2.1], [3.2, 0.3], [1.5, -0.1]),
      curve([1.5, -0.1], [0.3, -0.7], [0.9, -2.6], [2.7, -2.4])]],
    ['Aquarius', [line([-2.6, 0.7], [-1.55, 1.4], [-0.5, 0.7], [0.55, 1.4], [1.6, 0.7], [2.65, 1.4]),
      line([-2.6, -1.3], [-1.55, -0.6], [-0.5, -1.3], [0.55, -0.6], [1.6, -1.3], [2.65, -0.6])]],
    ['Pisces', [curve([-1.9, 2.3], [-0.3, 0.8], [-0.3, -0.8], [-1.9, -2.3]),
      curve([1.9, 2.3], [0.3, 0.8], [0.3, -0.8], [1.9, -2.3]), line([-1.5, 0], [1.5, 0])]]
  ];
  return definitions.map(([name, paths]) => {
    const segments = [];
    let total = 0;
    for (const path of paths) for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length > 0) { segments.push({ a, b, start: total, length }); total += length; }
    }
    const points = new Float32Array(count * 2);
    let segment = 0;
    for (let i = 0; i < count; i++) {
      const distance = (i + 0.5) / count * total;
      while (segment < segments.length - 1 && distance > segments[segment].start + segments[segment].length) segment++;
      const item = segments[segment], t = (distance - item.start) / item.length;
      points[i * 2] = (item.a[0] + (item.b[0] - item.a[0]) * t) * 1.35;
      points[i * 2 + 1] = (item.a[1] + (item.b[1] - item.a[1]) * t) * 1.35;
    }
    return { name, points };
  });
}
