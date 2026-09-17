const api = require("../../utils/api");
Page({
  data: {
    user: null,
    nickname: "",
    avatar: null,
    avatarDirty: false,
    avatarLoading: false,
    avatarUrl: "",
    loading: false,
    error: "",
    agreed: false,
    created: false,
  },
  async onLoad() {
    if (api.token())
      try {
        const r = await api.request("/api/mini/community/session");
        if (r.user)
          this.setData({
            user: r.user,
            nickname: r.user.nickname,
            avatarUrl: api.absolute(r.user.avatar),
          });
        else api.saveToken("");
      } catch (e) {
        this.setData({ error: e.message });
      }
  },
  field(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },
  agree(e) {
    this.setData({ agreed: e.detail.value.includes("yes") });
  },
  privacy() {
    wx.navigateTo({ url: "/pages/about/index" });
  },
  async login() {
    if (this.data.loading) return;
    if (!this.data.agreed) {
      this.setData({ error: "请先阅读并同意隐私说明" });
      return;
    }
    this.setData({ loading: true, error: "" });
    try {
      const code = await new Promise((resolve, reject) =>
        wx.login({
          timeout: 10000,
          success: (r) =>
            r.code
              ? resolve(r.code)
              : reject(Error("未获取到微信登录凭证，请重试")),
          fail: () => reject(Error("微信登录失败，请重试")),
        }),
      );
      const r = await api.request(
        "/api/mini/community/wechat-login",
        { code },
        "POST",
      );
      if (!r.token || !r.user) throw Error("登录响应异常，请重试");
      api.saveToken(r.token);
      this.setData({
        user: r.user,
        nickname: r.user.nickname,
        avatarUrl: api.absolute(r.user.avatar),
        created: r.created,
      });
      wx.showToast({ title: "微信登录成功", icon: "success" });
    } catch (e) {
      this.setData({ error: e.message });
    } finally {
      this.setData({ loading: false });
    }
  },
  async submit(e) {
    if (this.data.loading || this.data.avatarLoading || !this.data.user) return;
    // Read the form value after the native nickname component has validated it.
    const nickname = String(e?.detail?.value?.nickname ?? this.data.nickname).trim();
    if (!nickname) {
      this.setData({ error: "请填写昵称" });
      return;
    }
    this.setData({ loading: true, error: "" });
    try {
      const data = { nickname };
      if (this.data.avatarDirty) data.avatar = this.data.avatar;
      const r = await api.request("/api/mini/community/profile", data, "PUT");
      this.setData({
        user: r.user,
        nickname: r.user.nickname,
        avatarDirty: false,
        avatar: null,
        avatarUrl: api.absolute(r.user.avatar),
      });
      wx.showToast({ title: "资料已保存", icon: "success" });
    } catch (e) {
      this.setData({ error: e.message });
    } finally {
      this.setData({ loading: false });
    }
  },
  chooseAvatar(e) {
    if (this.data.loading || this.data.avatarLoading) return;
    const path = e.detail && e.detail.avatarUrl;
    if (path) this.convertAvatar(path);
  },
  convertAvatar(path) {
    this.setData({ avatarLoading: true, error: "" });
    const fail = (message) => this.setData({ avatarLoading: false, error: message });
    wx.getImageInfo({
      src: path,
      success: (info) => {
        const size = Math.min(info.width, info.height);
        const ctx = wx.createCanvasContext("avatar", this);
        ctx.clearRect(0, 0, 256, 256);
        ctx.drawImage(
          path,
          (info.width - size) / 2,
          (info.height - size) / 2,
          size,
          size,
          0,
          0,
          256,
          256,
        );
        ctx.draw(false, () =>
          wx.canvasToTempFilePath(
            {
              canvasId: "avatar",
              x: 0,
              y: 0,
              width: 256,
              height: 256,
              destWidth: 192,
              destHeight: 192,
              fileType: "png",
              success: (r) => {
                wx.getFileSystemManager().readFile({
                  filePath: r.tempFilePath,
                  encoding: "base64",
                  success: (f) =>
                    this.setData({
                      avatar: "data:image/png;base64," + f.data,
                      avatarDirty: true,
                      avatarLoading: false,
                      avatarUrl: r.tempFilePath,
                    }),
                  fail: () => fail("读取头像失败，请重新选择"),
                });
              },
              fail: () => fail("头像转换失败，请换一张图片"),
            },
            this,
          ),
        );
      },
      fail: () => fail("无法读取这张图片，请重新选择"),
    });
  },
  defaultAvatar() {
    if (this.data.loading || this.data.avatarLoading) return;
    this.setData({ avatar: null, avatarUrl: "", avatarDirty: true });
  },
});
