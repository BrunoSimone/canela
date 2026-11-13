// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const { session } = vi.hoisted(() => ({ session: vi.fn<() => Promise<{ email: string } | null>>() }));
vi.mock("@/modules/admin/infrastructure/admin-request", () => ({ currentAdminSession: session }));
import { AdminPreviewNotice } from "./admin-preview-notice";

afterEach(() => { cleanup(); session.mockReset(); });

describe("maintenance preview notice", () => {
  it("tells a panel session that the public store is closed and payments are blocked", async () => {
    session.mockResolvedValueOnce({ email: "qa@canela.test" });
    render(<>{await AdminPreviewNotice()}</>);
    expect(screen.getByRole("status").textContent).toMatch(/mantenimiento.*pagos están bloqueados/);
    expect(screen.getByRole("status").textContent).not.toContain("qa@canela.test");
  });
  it("renders nothing without a valid session or when the lookup fails", async () => {
    session.mockResolvedValueOnce(null);
    expect(await AdminPreviewNotice()).toBeNull();
    session.mockRejectedValueOnce(new Error("database unavailable"));
    expect(await AdminPreviewNotice()).toBeNull();
  });
});
