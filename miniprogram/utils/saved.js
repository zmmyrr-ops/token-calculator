const key = "mendao-mini-saved-v1";
function all() {
  const a = wx.getStorageSync(key);
  return Array.isArray(a) ? a : [];
}
function toggle(item) {
  let items = all();
  const exists = items.some((x) => x.key === item.key);
  items = items.filter((x) => x.key !== item.key);
  if (!exists) items.unshift(item);
  wx.setStorageSync(key, items.slice(0, 200));
  return !exists;
}
module.exports = { all, toggle };
