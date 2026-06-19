export function isAccessAllowed(request: Request): boolean {
  const configuredToken = process.env.APP_ACCESS_TOKEN?.trim();

  if (!configuredToken) {
    return true;
  }

  const requestUrl = new URL(request.url);
  const tokenFromQuery = requestUrl.searchParams.get("token");
  const tokenFromHeader = request.headers.get("x-access-token");

  return tokenFromQuery === configuredToken || tokenFromHeader === configuredToken;
}
