const { apiBase } = require("../config");
const sessionKey = "mendao-session:" + apiBase;
function token() {
  return wx.getStorageSync(sessionKey) || "";
}
function saveToken(value) {
  if (value) wx.setStorageSync(sessionKey, value);
  else wx.removeStorageSync(sessionKey);
}
function request(path, data, method = "GET") {
  return new Promise((resolve, reject) => {
    const header = { "content-type": "application/json" };
    if (path.startsWith("/api/mini/community/") && token())
      header.Authorization = "Bearer " + token();
    wx.request({
      url: apiBase + path,
      data: data || {},
      method,
      header,
      timeout: 20000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300)
          return resolve(res.data);
        if (res.statusCode === 401 && path.startsWith("/api/mini/community/"))
          saveToken("");
        reject(
          new Error(
            res.data &&
              typeof res.data.error === "string" &&
              res.data.error.length < 180
              ? res.data.error
              : "请求失败（" + res.statusCode + "），请稍后重试",
          ),
        );
      },
      fail() {
        reject(new Error("网络连接失败，请检查网络与小程序服务器域名配置"));
      },
    });
  });
}
function absolute(url) {
  return url && url.startsWith("/") ? apiBase + url : url;
}
function toast(error) {
  wx.showToast({
    title: error.message || String(error),
    icon: "none",
    duration: 3000,
  });
}
function copy(url) {
  if (url) wx.setClipboardData({ data: url });
}
module.exports = { request, token, saveToken, absolute, toast, copy };
