import { SELF } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SECURITY_HEADERS, withSecurityHeaders } from "../src/index";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("withSecurityHeaders", () => {
  it("preserves the origin response while adding the security policy", async () => {
    const origin = new Response("origin body", {
      status: 418,
      statusText: "Teapot",
      headers: {
        "Cache-Control": "public, max-age=600",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Origin-Header": "kept",
      },
    });

    const hardened = withSecurityHeaders(origin);

    expect(hardened).not.toBe(origin);
    expect(hardened.status).toBe(418);
    expect(hardened.statusText).toBe("Teapot");
    expect(hardened.headers.get("Cache-Control")).toBe("public, max-age=600");
    expect(hardened.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(hardened.headers.get("X-Origin-Header")).toBe("kept");
    expect(await hardened.text()).toBe("origin body");

    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(hardened.headers.get(name)).toBe(value);
    }
  });

  it("replaces conflicting policy values without mutating origin headers", () => {
    const origin = new Response(null, {
      status: 204,
      headers: {
        "X-Frame-Options": "DENY",
        "Strict-Transport-Security":
          "max-age=63072000; includeSubDomains; preload",
      },
    });

    const hardened = withSecurityHeaders(origin);

    expect(hardened.status).toBe(204);
    expect(hardened.body).toBeNull();
    expect(hardened.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(hardened.headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000",
    );
    expect(origin.headers.get("X-Frame-Options")).toBe("DENY");
    expect(origin.headers.get("Strict-Transport-Security")).toContain(
      "includeSubDomains",
    );
  });

  it("does not add a Content-Security-Policy header", () => {
    const hardened = withSecurityHeaders(new Response("ok"));

    expect(hardened.headers.has("Content-Security-Policy")).toBe(false);
    expect(hardened.headers.get("Strict-Transport-Security")).not.toContain(
      "includeSubDomains",
    );
    expect(hardened.headers.get("Strict-Transport-Security")).not.toContain(
      "preload",
    );
  });

  it("applies the policy through the real default SELF entrypoint", async () => {
    const originFetch = vi.fn(async (request: Request) =>
      new Response(`origin:${new URL(request.url).pathname}`, {
        status: 206,
        statusText: "Partial Content",
        headers: {
          "Cache-Control": "public, max-age=120",
          "X-Origin-Header": "entrypoint-kept",
        },
      }),
    );
    vi.stubGlobal("fetch", originFetch);

    const response = await SELF.fetch(
      "https://www.jabbarsourcing.com/assets/example.css?entrypoint=1",
    );

    expect(originFetch).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(206);
    expect(response.statusText).toBe("Partial Content");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=120");
    expect(response.headers.get("X-Origin-Header")).toBe("entrypoint-kept");
    expect(await response.text()).toBe("origin:/assets/example.css");
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(response.headers.get(name)).toBe(value);
    }
  });
});
