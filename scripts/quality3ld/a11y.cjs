function attributeLabels(tree) {
  const labels = new Set();
  function visit(node) {
    if (!node || typeof node !== "object") return;
    const attributes = node.attributes || {};
    for (const key of ["accessibilityText", "content-desc", "accessibilityLabel"]) {
      if (typeof attributes[key] === "string" && attributes[key].trim())
        labels.add(attributes[key]);
    }
    if (Array.isArray(node)) node.forEach(visit);
    else
      Object.values(node).forEach((value) => {
        if (typeof value === "object") visit(value);
      });
  }
  visit(tree);
  return labels;
}
module.exports = { attributeLabels };
