function allowed(kind) {
  const m = getApp().globalData.modules;
  return kind === "models" ? m.models : kind === "tools" ? m.platforms : kind === "news" ? m.news : kind === "forum" ? m.forum : true;
}
function detail(kind, id) {
  if (!allowed(kind)) return wx.showToast({ title: "该模块暂未开放", icon: "none" });
  wx.navigateTo({
    url:
      "/pages/detail/index?kind=" +
      encodeURIComponent(kind) +
      "&id=" +
      encodeURIComponent(id),
  });
}
function list(kind) {
  if (!allowed(kind)) return wx.showToast({ title: "该模块暂未开放", icon: "none" });
  wx.navigateTo({ url: "/pages/list/index?kind=" + encodeURIComponent(kind) });
}
module.exports = { detail, list, allowed };
