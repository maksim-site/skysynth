export default {
  async fetch(request, env) {
    let response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (
      response.status === 404 &&
      acceptsHtml &&
      ["GET", "HEAD"].includes(request.method)
    ) {
      const indexUrl = new URL(request.url);
      indexUrl.pathname = "/index.html";
      indexUrl.search = "";
      response = await env.ASSETS.fetch(new Request(indexUrl, request));
    }

    if (
      request.method !== "GET" ||
      !response.headers.get("content-type")?.includes("text/html")
    ) {
      return response;
    }

    const origin = new URL(request.url).origin;
    const html = (await response.text())
      .replaceAll('content="/og.png"', `content="${origin}/og.png"`);
    const headers = new Headers(response.headers);
    headers.delete("content-length");

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
