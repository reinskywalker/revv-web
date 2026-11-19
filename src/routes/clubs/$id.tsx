import { createFileRoute } from "@tanstack/react-router";
import { ClubDetailView } from "@/components/revv/ClubDetailView";
import { SiteFooter, SiteHeader } from "@/components/revv/chrome";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/clubs/$id")({
  head: () => ({
    meta: [{ title: "Club Detail — REVV" }],
  }),
  component: ClubDetailRoutePage,
});

function ClubDetailRoutePage() {
  const { id } = Route.useParams();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <ClubDetailView communityId={id} />
      </main>
      {!isAuthenticated && <SiteFooter />}
    </div>
  );
}
