export const basePath = import.meta.env.BASE_URL || "/";
export const isStaging = basePath !== "/";
export function appPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//")
    ? basePath.replace(/\/$/, "") + path
    : path;
}
export const storageKey = (key: string) => (isStaging ? `staging:${key}` : key);
