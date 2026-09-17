function detail(kind, id) {
  wx.navigateTo({
    url:
      "/pages/detail/index?kind=" +
      encodeURIComponent(kind) +
      "&id=" +
      encodeURIComponent(id),
  });
}
function list(kind) {
  wx.navigateTo({ url: "/pages/list/index?kind=" + encodeURIComponent(kind) });
}
module.exports = { detail, list };
