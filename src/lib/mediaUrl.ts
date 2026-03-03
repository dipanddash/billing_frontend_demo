export const resolveMediaUrl = (value: unknown, baseOrigin: string): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    raw.startsWith("./") ||
    raw.startsWith("../")
  ) {
    return raw;
  }

  if (raw.startsWith("//")) {
    return `https:${raw}`;
  }

  const base = baseOrigin.replace(/\/+$/, "");
  if (raw.startsWith("/")) {
    return `${base}${raw}`;
  }

  return `${base}/${raw}`;
};
