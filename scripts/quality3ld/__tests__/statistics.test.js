const { percentile, median, rate } = require("../statistics.cjs");
describe("3LD result summaries", () => {
  it("averages the two middle observations for an even-sized median", () => {
    expect(median([10, 20, 30, 40])).toBe(25);
  });
  it("uses nearest-rank p95 so the slow tail is not replaced by the average", () => {
    // Arrange
    const observations = [...Array(18).fill(10), 2000, 3000];
    // Act
    const actual = percentile(observations, 0.95);
    // Assert
    expect(actual).toBe(2000);
  });
  it("keeps failed observations in the denominator", () => {
    // Arrange
    const observations = [{ passed: true }, { passed: false }];
    // Act
    const actual = rate(observations);
    // Assert
    expect(actual).toEqual({ correct: 1, total: 2 });
  });
  it("refuses a percentage when a measurement was not run", () => {
    // Arrange
    const observations = [];
    // Act / Assert
    expect(() => rate(observations)).toThrow("without observations");
  });
});
