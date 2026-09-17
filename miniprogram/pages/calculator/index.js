const api = require("../../utils/api");
const { estimate } = require("../../utils/engine");
Page({
  data: {
    models: [],
    selected: 0,
    input: "1000",
    output: "1000",
    reasoning: "",
    requests: "1",
    q: "",
    result: null,
    error: "",
    loading: false,
  },
  onLoad(o) {
    this.id = o.id;
    this.load();
  },
  field(e) {
    this.setData({
      [e.currentTarget.dataset.field]: e.detail.value,
      result: null,
    });
  },
  select(e) {
    this.setData({ selected: Number(e.detail.value), result: null });
  },
  async load() {
    this.setData({ loading: true, error: "", result: null });
    try {
      let models;
      if (this.id) {
        models = [
          await api.request("/api/v1/catalog/" + encodeURIComponent(this.id)),
        ];
        this.id = null;
      } else
        models = (
          await api.request("/api/v1/catalog", {
            q: this.data.q,
            support: "price",
            pageSize: 100,
          })
        ).models;
      this.setData({ models, selected: 0 });
    } catch (e) {
      this.setData({ error: e.message });
    } finally {
      this.setData({ loading: false });
    }
  },
  calculate() {
    try {
      const d = this.data;
      const m = d.models[d.selected];
      if (!m) throw Error("请先选择模型");
      const fields = ["input", "output", "requests"].concat(
        d.reasoning !== "" ? ["reasoning"] : [],
      );
      if (
        fields.some(
          (k) =>
            !/^\d+$/.test(d[k]) ||
            !Number.isSafeInteger(Number(d[k])) ||
            Number(d[k]) > 10000000,
        ) ||
        Number(d.requests) < 1
      )
        throw Error("请填写 0–10000000 之间的整数，请求次数至少为 1");
      if (!m.reasoning && Number(d.reasoning) > 0)
        throw Error("当前模型未标注推理能力，请清空推理预算");
      const budget = (n) => ({ low: n, typical: n, high: n });
      const r = estimate(m, Number(d.input), {
        visible: budget(Number(d.output)),
        reasoning: d.reasoning === "" ? null : budget(Number(d.reasoning)),
        extra: 0,
        cache: 0,
        requests: Number(d.requests),
        fx: "",
        currency: "USD",
        preference: "balanced",
        task: "auto",
        encoding: "o200k_base",
      });
      this.setData({
        result: {
          ...r,
          cost: r.values ? r.values.typical.toFixed(6) : "",
          total: r.monthly ? r.monthly.typical.toFixed(6) : "",
        },
        error: "",
      });
    } catch (e) {
      this.setData({ error: e.message, result: null });
    }
  },
  copy() {
    api.copy(require("../../config").website + "/calculators/tokens");
  },
});
