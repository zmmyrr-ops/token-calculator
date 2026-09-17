// Reuse list/profile controllers inside the single home page.
module.exports = function (definition) {
  const { data, ...methods } = definition;
  Component({
    options: { styleIsolation: "apply-shared" },
    data: data || {},
    methods,
    lifetimes: {
      attached() {
        if (this.onLoad) this.onLoad({});
        if (this.onShow) this.onShow();
      },
      detached() {
        this._seq = (this._seq || 0) + 1;
        if (this.onUnload) this.onUnload();
      },
    },
    pageLifetimes: { show() { if (this.onShow) this.onShow(); } },
  });
};
