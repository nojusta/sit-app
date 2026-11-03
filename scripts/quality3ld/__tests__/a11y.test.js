const { attributeLabels } = require("../a11y.cjs");

describe("3LD native accessibility name extraction", () => {
  it("does not count visible field values or placeholders as explicit accessible labels", () => {
    // Arrange
    const tree = {
      attributes: { text: "Entered description", hintText: "Example description" },
      children: [{ attributes: { accessibilityText: "Submit marker" } }],
    };
    // Act
    const actual = [...attributeLabels(tree)];
    // Assert
    expect(actual).toEqual(["Submit marker"]);
  });
  it("combines Android and iOS native label fields without counting duplicates", () => {
    // Arrange
    const tree = [
      { attributes: { "content-desc": "Add photos" } },
      { attributes: { accessibilityLabel: "Add photos" } },
      { attributes: { accessibilityText: "Close" } },
    ];
    // Act
    const actual = [...attributeLabels(tree)];
    // Assert
    expect(actual).toEqual(["Add photos", "Close"]);
  });
});
