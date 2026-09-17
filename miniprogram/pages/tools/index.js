const nav = require("../../utils/navigation");
Page({
  list(e) {
    nav.list(e.currentTarget.dataset.kind);
  },
  budget() {
    wx.navigateTo({ url: "/pages/calculator/index" });
  },
  copy() {
    require("../../utils/api").copy(
      require("../../config").website + "/calculators/tokens",
    );
  },
  onShareAppMessage() {
    return { title: "AI 门道 · 模型、平台与成本预算" };
  },
});
