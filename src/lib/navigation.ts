export function buildLoginCallbackUrl(
  pathname: string,
  search: string,
): string {
  return `${pathname}${search}`;
}

export function normalizeCallbackUrl(
  value: string | string[] | undefined,
): string {
  const callbackUrl = Array.isArray(value) ? value[0] : value;
  if (
    !callbackUrl?.startsWith("/") ||
    callbackUrl.startsWith("//") ||
    callbackUrl.includes("\\")
  ) {
    return "/editor";
  }
  return callbackUrl;
}
