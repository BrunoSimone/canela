import { describe, expect, it } from "vitest";

import { isSameOriginAdminRequest } from "./admin-origin";

const url = "https://canela.test/api/admin/auth/verify";

describe("admin request origin validation", () => {
  it.each([
    { origin: "https://canela.test", site: "same-origin", expected: true },
    { origin: "https://canela.test", site: undefined, expected: true },
    { origin: "null", site: "same-origin", expected: true },
    { origin: undefined, site: "same-origin", expected: true },
    { origin: "null", site: "cross-site", expected: false },
    { origin: "null", site: "same-site", expected: false },
    { origin: "null", site: "none", expected: false },
    { origin: "null", site: undefined, expected: false },
    { origin: undefined, site: undefined, expected: false },
    { origin: "https://elsewhere.test", site: "same-origin", expected: false },
    { origin: "http://canela.test", site: "same-origin", expected: false },
    { origin: "https://canela.test", site: "cross-site", expected: false },
  ])("validates Origin=$origin and Sec-Fetch-Site=$site", ({ origin, site, expected }) => {
    const headers = new Headers();
    if (origin !== undefined) headers.set("Origin", origin);
    if (site !== undefined) headers.set("Sec-Fetch-Site", site);
    expect(isSameOriginAdminRequest(new Request(url, { method: "POST", headers })))
      .toBe(expected);
  });
});
