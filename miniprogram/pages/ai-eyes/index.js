const api = require("../../utils/api");
const {
  mobilePrompt,
  parseMobileResult,
} = require("../../utils/eyes-protocol");
Page({
  data: {
    platforms: ["豆包", "DeepSeek", "其他 AI"],
    platform: 0,
    mode: 0,
    raw: "",
    agreed: false,
    busy: false,
    loading: false,
    user: null,
    result: null,
    error: "",
    promptOpen: false,
    prompt: mobilePrompt("conversation"),
  },
  async onShow() {
    this.setData({ loading: true, result: null, user: null, error: "" });
    try {
      if (api.token()) {
        const s = await api.request("/api/mini/community/session");
        this.setData({ user: s.user });
        if (s.user) {
          const r = await api.request("/api/mini/community/eyes");
          this.showResult(r.result);
        }
      }
    } catch (e) {
      this.setData({ error: e.message });
    } finally {
      this.setData({ loading: false });
    }
  },
  showResult(result) {
    this.setData({
      result: result
        ? {
            ...result,
            cover: api.absolute(result.cover),
            basisLabel:
              result.basis === "questions" ? "基于本次问答" : "基于可见对话",
          }
        : null,
    });
  },
  login() {
    wx.navigateTo({ url: "/pages/account/index" });
  },
  platform(e) {
    this.setData({ platform: Number(e.detail.value) });
  },
  mode(e) {
    this.setData({
      mode: Number(e.detail.value),
      prompt: mobilePrompt(
        Number(e.detail.value) === 0 ? "conversation" : "questions",
      ),
    });
  },
  raw(e) {
    this.setData({ raw: e.detail.value, agreed: false, error: "" });
  },
  agree(e) {
    this.setData({ agreed: e.detail.value.includes("yes") });
  },
  copy() {
    api.copy(this.data.prompt);
  },
  prompt() {
    this.setData({ promptOpen: !this.data.promptOpen });
  },
  async submit() {
    if (this.data.busy) return;
    if (!this.data.user) {
      this.login();
      return;
    }
    if (!this.data.agreed) {
      this.setData({ error: "请先确认只提交行为统计" });
      return;
    }
    this.setData({ busy: true, error: "" });
    try {
      const result = parseMobileResult(this.data.raw);
      const r = await api.request(
        "/api/mini/community/eyes",
        {
          result,
          platform: this.data.platforms[this.data.platform],
          confirmed: true,
        },
        "POST",
      );
      this.showResult(r.result);
      this.setData({ raw: "", agreed: false });
      wx.pageScrollTo({ scrollTop: 0 });
    } catch (e) {
      this.setData({ error: e.message });
    } finally {
      this.setData({ busy: false });
    }
  },
  async remove() {
    if (this.data.busy) return;
    const answer = await new Promise((resolve) =>
      wx.showModal({
        title: "删除当前画像",
        content: "删除后无法恢复，已保存到相册的图片不会删除。",
        success: resolve,
        fail: () => resolve({ confirm: false }),
      }),
    );
    if (!answer.confirm) return;
    this.setData({ busy: true });
    try {
      await api.request("/api/mini/community/eyes", {}, "DELETE");
      this.showResult(null);
    } catch (e) {
      api.toast(e);
    } finally {
      this.setData({ busy: false });
    }
  },
  preview() {
    if (this.data.result) wx.previewImage({ urls: [this.data.result.cover] });
  },
  async save() {
    if (this.data.busy || !this.data.result) return;
    this.setData({ busy: true, error: "" });
    try {
      const file = await new Promise((resolve, reject) =>
        wx.downloadFile({
          url: this.data.result.cover,
          success: (r) =>
            r.statusCode === 200
              ? resolve(r.tempFilePath)
              : reject(Error("封面下载失败")),
          fail: () =>
            reject(Error("封面下载失败，请检查网络及downloadFile合法域名")),
        }),
      );
      await new Promise((resolve, reject) =>
        wx.saveImageToPhotosAlbum({
          filePath: file,
          success: resolve,
          fail: () =>
            reject(
              Error("保存未完成，请允许相册权限，或点击封面预览后长按保存"),
            ),
        }),
      );
      wx.showToast({ title: "已保存" });
    } catch (e) {
      this.setData({ error: e.message });
    } finally {
      this.setData({ busy: false });
    }
  },
  onShareAppMessage() {
    return {
      title: "快来测一测，AI眼中的你是怎样的？",
      path: "/pages/ai-eyes/index",
    };
  },
});
