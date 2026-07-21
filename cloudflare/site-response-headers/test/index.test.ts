import { SELF } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CONSENT_REGION_PATH,
  SECURITY_HEADERS,
  consentRegionPolicy,
  consentRegionResponse,
  hasGlobalPrivacyControl,
  withSecurityHeaders,
} from "../src/index";

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

describe("consent region policy", () => {
  it("keeps EEA, United Kingdom and Switzerland on explicit opt-in", () => {
    for (const country of ["DE", "FR", "IS", "LI", "NO", "GB", "CH"]) {
      expect(consentRegionPolicy(country)).toBe("strict");
    }
    expect(consentRegionPolicy("GF", true)).toBe("strict");
    expect(consentRegionPolicy("US", true)).toBe("strict");
  });

  it("suppresses the automatic prompt without enabling analytics elsewhere", () => {
    for (const country of ["US", "BR", "CN", "NG", "KE", "AE"]) {
      expect(consentRegionPolicy(country)).toBe("quiet-denied");
    }
  });

  it("fails closed for unknown, Tor and malformed country values", () => {
    for (const country of [undefined, "", "XX", "T1", "usa", "1"]) {
      expect(consentRegionPolicy(country)).toBe("strict");
    }
  });

  it("recognizes only the active Global Privacy Control signal", () => {
    expect(hasGlobalPrivacyControl(new Request("https://example.com", {
      headers: { "Sec-GPC": "1" },
    }))).toBe(true);
    expect(hasGlobalPrivacyControl(new Request("https://example.com", {
      headers: { "Sec-GPC": "0" },
    }))).toBe(false);
    expect(hasGlobalPrivacyControl(new Request("https://example.com"))).toBe(false);
  });

  it("returns only a coarse no-store policy and never exposes the country", async () => {
    const response = consentRegionResponse("DE", true);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
    expect(response.headers.get("Cloudflare-CDN-Cache-Control")).toBe("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(await response.json()).toEqual({ policy: "strict", gpc: true });
    expect(await consentRegionResponse("US", false).json()).toEqual({
      policy: "quiet-denied",
      gpc: false,
    });
    expect(JSON.stringify(await consentRegionResponse("DE", false).json())).not.toContain("DE");
  });

  it("prioritizes Cloudflare's EU signal over a non-list country code", async () => {
    expect(await consentRegionResponse("GF", false, "GET", true).json()).toEqual({
      policy: "strict",
      gpc: false,
    });
  });

  it("supports HEAD and rejects mutating methods", async () => {
    const head = consentRegionResponse("DE", false, "HEAD");
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");

    const post = consentRegionResponse("DE", false, "POST");
    expect(post.status).toBe(405);
    expect(post.headers.get("Allow")).toBe("GET, HEAD");
  });

  it("serves the fail-closed endpoint without fetching the origin", async () => {
    const originFetch = vi.fn(async () => new Response("origin"));
    vi.stubGlobal("fetch", originFetch);

    const response = await SELF.fetch(`https://www.jabbarsourcing.com${CONSENT_REGION_PATH}`);

    expect(originFetch).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ policy: "strict", gpc: false });
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(response.headers.get(name)).toBe(value);
    }
  });
});
