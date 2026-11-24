import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/community/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/clubs/$id",
      params: { id: params.id },
      replace: true,
    });
  },
  component: () => null,
});
