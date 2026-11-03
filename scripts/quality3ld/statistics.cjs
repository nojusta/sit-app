function percentile(values, fraction) {
  if (!values.length)
    throw new Error("Cannot calculate a percentile without observations");
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}
function rate(samples) {
  if (!samples.length) throw new Error("Cannot report a rate without observations");
  return { correct: samples.filter((s) => s.passed).length, total: samples.length };
}
function median(values) {
  if (!values.length) throw new Error("Cannot calculate a median without observations");
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
module.exports = { percentile, median, rate };
