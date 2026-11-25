import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { formatDbPrice } from "@/lib/api-billing";
import { I18nProvider } from "@/lib/i18n";
import { RevvAvatar } from "@/components/revv/RevvAvatar";
import { ClubMembersPopupModal } from "@/components/revv/ClubMembersPopupModal";
import type { CommunityMemberItem, CommunitySummary } from "@/lib/api-rider";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));

describe("billing formatting & localized ClubMembersPopupModal", () => {
  it("formats IDR and USD prices strictly from DB values", () => {
    expect(formatDbPrice("IDR", 7500)).toContain("7.500");
    expect(formatDbPrice("IDR", 24900)).toContain("24.900");
    expect(formatDbPrice("USD", 100)).toBe("$1.00");
    expect(formatDbPrice("USD", 199)).toBe("$1.99");
  });

  it("renders RevvAvatar initials fallback cleanly when uncached", () => {
    render(<RevvAvatar name="Raka Pratama" size={48} />);
    expect(screen.getByText("R")).toBeTruthy();
  });

  it("renders localized Indonesian roster & Boost Club CTA in ClubMembersPopupModal", () => {
    const community: CommunitySummary = {
      id: "club-1",
      owner_id: "user-1",
      name: "REVV Bandung Riders",
      visibility: "public",
      member_count: 30,
      member_limit: 30,
      boost_count: 0,
      event_count: 2,
      thread_count: 5,
      channel_count: 3,
      is_official: false,
    };
    const members: CommunityMemberItem[] = [
      {
        user_id: "user-1",
        username: "raka",
        display_name: "Raka Pratama",
        role: "Founder",
        status: "Approved",
        equipped_frame_code: "beta_pioneer",
      },
    ];

    render(
      <I18nProvider initialLocale="id">
        <ClubMembersPopupModal
          open={true}
          onClose={() => {}}
          community={community}
          members={members}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("Skuad Klub")).toBeTruthy();
    expect(screen.getByText(/30 \/ 30 Anggota/)).toBeTruthy();
    expect(screen.getByText("Parkiran Penuh (Mode Tunggu)")).toBeTruthy();
    expect(screen.getByText("Boost Klub")).toBeTruthy();
  });
});
