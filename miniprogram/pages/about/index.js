const api = require("../../utils/api");
Page({
  copy() {
    api.copy(require("../../config").website);
  },
  feedback() {
    wx.navigateTo({ url: "/pages/compose/index" });
  },
});
