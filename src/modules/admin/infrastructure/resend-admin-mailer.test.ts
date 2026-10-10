import { afterEach, describe, expect, it, vi } from "vitest";

import { sendAdminLoginEmail } from "./resend-admin-mailer";

afterEach(() => vi.unstubAllGlobals());

describe("admin login email", () => {
  it("uses the configured origin in the one-time login link", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendAdminLoginEmail("owner@example.com", "a".repeat(43), {
      apiKey: "resend-test-key",
      from: "Canela <pedidos@canela.test>",
      siteUrl: "https://canela.test",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(request.body));
    expect(url).toBe("https://api.resend.com/emails");
    expect((request.headers as Record<string, string>).Authorization).toBe("Bearer resend-test-key");
    expect(body.from).toBe("Canela <pedidos@canela.test>");
    expect(body.to).toEqual(["owner@example.com"]);
    expect(body.subject).toBe("Ingresar al panel de pedidos de Canela");
    expect(body.html).toContain("Entrá al panel de pedidos");
    expect(body.html).toContain(`href="https://canela.test/admin/acceso?token=${"a".repeat(43)}"`);
    expect(body.text).toContain(`https://canela.test/admin/acceso?token=${"a".repeat(43)}`);
    expect(body.text).toContain("El enlace vence en 15 minutos");
  });

  it("reports provider rejection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 422 })));
    await expect(sendAdminLoginEmail("owner@example.com", "a".repeat(43), {
      apiKey: "resend-test-key",
      from: "pedidos@canela.test",
      siteUrl: "https://canela.test",
    })).rejects.toThrow("ADMIN_MAIL_SEND_FAILED_422");
  });
});
