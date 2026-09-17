const api = require("../../utils/api");
Page({
  data: {
    user: null,
    mode: "login",
    username: "",
    password: "",
    nickname: "",
    oldPassword: "",
    avatar: null,
    avatarDirty: false,
    avatarUrl: "",
    loading: false,
    error: "",
    agreed: false,
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
  mode() {
    this.setData({
      mode: this.data.mode === "login" ? "register" : "login",
      password: "",
      error: "",
    });
  },
  async submit() {
    if (this.data.loading) return;
    const d = this.data;
    if (!d.user && !d.agreed) {
      this.setData({ error: "请先阅读并同意隐私说明与社区规则" });
      return;
    }
    if (
      !d.user &&
      (!/^[a-zA-Z0-9_]{4,32}$/.test(d.username) ||
        (d.mode === "register" && d.password.length < 12))
    ) {
      this.setData({
        error: "账号需为 4–32 位字母、数字或下划线；注册密码至少 12 位",
      });
      return;
    }
    if ((d.user || d.mode === "register") && !d.nickname.trim()) {
      this.setData({ error: "请填写昵称" });
      return;
    }
    this.setData({ loading: true, error: "" });
    try {
      const data = d.user
        ? { nickname: d.nickname }
        : {
            username: d.username,
            password: d.password,
            ...(d.mode === "register" ? { nickname: d.nickname } : {}),
          };
      if (d.user && d.avatarDirty) data.avatar = d.avatar;
      const r = await api.request(
        "/api/mini/community/" + (d.user ? "profile" : d.mode),
        data,
        d.user ? "PUT" : "POST",
      );
      if (r.token) api.saveToken(r.token);
      this.setData({
        user: r.user,
        nickname: r.user.nickname,
        password: "",
        avatar: null,
        avatarDirty: false,
        avatarUrl: api.absolute(r.user.avatar),
      });
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (e) {
      this.setData({ error: e.message });
    } finally {
      this.setData({ loading: false });
    }
  },
  async password() {
    if (this.data.loading) return;
    if (this.data.password.length < 12) {
      this.setData({ error: "新密码至少 12 位" });
      return;
    }
    this.setData({ loading: true, error: "" });
    try {
      await api.request(
        "/api/mini/community/password",
        { oldPassword: this.data.oldPassword, password: this.data.password },
        "POST",
      );
      api.saveToken("");
      this.setData({
        user: null,
        password: "",
        oldPassword: "",
        mode: "login",
      });
      wx.showToast({ title: "密码已修改，请重新登录", icon: "none" });
    } catch (e) {
      this.setData({ error: e.message });
    } finally {
      this.setData({ loading: false });
    }
  },
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (r) => this.convertAvatar(r.tempFiles[0].tempFilePath),
      fail: (e) => {
        if (!/cancel/.test(e.errMsg))
          api.toast(new Error("无法选择图片，请检查相册权限"));
      },
    });
  },
  convertAvatar(path) {
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
                      avatarUrl: r.tempFilePath,
                    }),
                  fail: () => api.toast(new Error("读取头像失败")),
                });
              },
              fail: () => api.toast(new Error("头像转换失败，请换一张图片")),
            },
            this,
          ),
        );
      },
      fail: () => api.toast(new Error("无法读取这张图片")),
    });
  },
  defaultAvatar() {
    this.setData({ avatar: null, avatarUrl: "", avatarDirty: true });
  },
});
