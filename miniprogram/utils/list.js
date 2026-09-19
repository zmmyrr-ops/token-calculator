const api = require("./api");
const nav = require("./navigation");
module.exports = function (kind) {
  return {
    data: {
      kind,
      items: [],
      page: 0,
      total: 0,
      loading: false,
      error: "",
      q: "",
      filter: "",
      filters:
        kind === "news"
          ? ["全部", "大模型", "软件应用", "硬件算力", "研究进展", "产业动态"]
          : kind === "learn"
            ? ["全部", "文章", "精选分享", "实践", "视频", "场景"]
            : [],
    },
    async onLoad(options) {
      if (options && options.kind) this.setData({ kind: options.kind });
      if (["news", "forum", "models", "tools"].includes(this.data.kind)) {
        const modules = await getApp().refreshSettings();
        if (!modules[this.data.kind === "tools" ? "platforms" : this.data.kind]) {
          getApp().enforceModules();
          return;
        }
      }
      this.load(true);
    },
    onShow() {
      if (this.data.kind === "forum" && this.data.page) this.load(true);
    },
    onPullDownRefresh() {
      this.load(true).finally(() => wx.stopPullDownRefresh());
    },
    onReachBottom() {
      if (!this.data.loading && this.data.items.length < this.data.total)
        this.load(false);
    },
    query(e) {
      this.setData({ q: e.detail.value });
    },
    search() {
      this.load(true);
    },
    filter(e) {
      this.setData({ filter: e.currentTarget.dataset.value });
      this.load(true);
    },
    retry() {
      this.load(this.data.page === 0);
    },
    async load(reset) {
      const seq = (this._seq = (this._seq || 0) + 1);
      const page = reset ? 1 : this.data.page + 1;
      const k = this.data.kind;
      this.setData({
        loading: true,
        error: "",
        ...(reset ? { items: [], page: 0, total: 0 } : {}),
      });
      try {
        let path =
          k === "news"
            ? "/api/v1/mini/news"
            : k === "models"
              ? "/api/v1/mini/models"
              : k === "forum"
                ? "/api/mini/community/posts"
                : k === "tools" ? "/api/v1/mini/tools" : "/api/v1/library/" + k;
        const data = { page, pageSize: 18, q: this.data.q };
        if (k === "news" && this.data.filter !== "全部")
          data.category = this.data.filter;
        if (k === "learn")
          data.format =
            { 文章: "article", 精选分享:"curated", 实践: "practice", 视频: "video" }[
              this.data.filter
            ] || "";
        if (k === "learn" && this.data.filter === "场景")
          path = "/api/v1/mini/scenarios";
        const r = await api.request(path, data);
        if (seq !== this._seq) return;
        const scenario = k === "learn" && this.data.filter === "场景";
        let items = r.items || r.models || [];
        if (scenario && this.data.q)
          items = items.filter((x) =>
            (x.name + x.summary).includes(this.data.q),
          );
        items = items.map((x) => ({
          ...x,
          key: x.id || x.slug,
          title: x.title || x.name,
          summary: x.summary || x.description || x.body || "",
          date: x.publishedAt ? x.publishedAt.slice(0, 10) : "",
          kind: scenario ? "scenarios" : k,
        }));
        this.setData({
          items: reset ? items : this.data.items.concat(items),
          page,
          total: scenario ? items.length : r.total,
        });
      } catch (e) {
        if (seq === this._seq) this.setData({ error: e.message });
      } finally {
        if (seq === this._seq) this.setData({ loading: false });
      }
    },
    open(e) {
      const item = this.data.items[e.currentTarget.dataset.index];
      if (item.kind === "forum") {
        wx.navigateTo({
          url: "/pages/post/index?id=" + encodeURIComponent(item.id),
        });
        return;
      }

      nav.detail(item.kind, item.id || item.slug);
    },
    imageError(e) {
      this.setData({
        ["items[" + e.currentTarget.dataset.index + "].imageUrl"]: null,
      });
    },
    compose() {
      wx.navigateTo({ url: "/pages/compose/index" });
    },
    onShareAppMessage() {
      return {
        title: "AI 门道 · 看懂 AI，用出门道。",
        path: "/pages/home/index?tab=" + (this.data.kind === "news" ? "news" : this.data.kind === "learn" ? "learn" : "tools"),
      };
    },
  };
};
