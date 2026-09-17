import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { ContentDatabase } from "./database";
import { CmsError } from "./database";
const schema = z.object({
  appId: z.string().regex(/^wx[a-f0-9]{16}$/),
  appSecret: z.string().min(16).max(256),
});
function config(store: ContentDatabase) {
  try {
    const value = process.env.WECHAT_APP_SECRET
      ? {
          appId: process.env.WECHAT_APP_ID,
          appSecret: process.env.WECHAT_APP_SECRET,
        }
      : JSON.parse(
          readFileSync(
            process.env.WECHAT_CONFIG_FILE ||
              path.join(path.dirname(store.file), "wechat-config.json"),
            "utf8",
          ),
        );
    return schema.parse(value);
  } catch {
    return null;
  }
}
export function wechatConfiguration(store: ContentDatabase) {
  const value = config(store);
  return {
    configured: !!value,
    appId: value?.appId || process.env.WECHAT_APP_ID || "wx30d01d25ba6ff5c3",
  };
}
export type WechatIdentity = { appId: string; openId: string };
export async function exchangeWechatCode(
  store: ContentDatabase,
  code: string,
): Promise<WechatIdentity> {
  const value = config(store);
  if (!value) throw new CmsError(503, "微信登录尚未配置，请联系管理员");
  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.search = new URLSearchParams({
    appid: value.appId,
    secret: value.appSecret,
    js_code: code,
    grant_type: "authorization_code",
  }).toString();
  let data: unknown;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    if (!response.ok) throw Error();
    data = await response.json();
  } catch {
    throw new CmsError(502, "微信登录服务暂时不可用，请稍后重试");
  }
  const parsed = z
    .object({
      errcode: z.number().optional(),
      openid: z
        .string()
        .min(8)
        .max(128)
        .regex(/^[a-zA-Z0-9_-]+$/)
        .optional(),
    })
    .safeParse(data);
  if (!parsed.success) throw new CmsError(502, "微信登录返回异常，请重试");
  if (parsed.data.errcode || !parsed.data.openid) {
    if (parsed.data.errcode === 40029 || parsed.data.errcode === 40163)
      throw new CmsError(401, "微信登录凭证已失效，请重新登录");
    throw new CmsError(502, "微信登录失败，请稍后重试或联系管理员");
  }
  // Never return or persist session_key; business sessions are independently generated.
  return { appId: value.appId, openId: parsed.data.openid };
}
