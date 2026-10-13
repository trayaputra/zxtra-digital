import { createFileRoute } from "@tanstack/react-router";
import StoreClient from "@/components/StoreClient";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zxtraa Store — Solusi Kebutuhan Digital Anda" },
      {
        name: "description",
        content:
          "Solusi kebutuhan digital Anda dalam satu tempat. Cepat, mudah, aman, dan terpercaya.",
      },
      { property: "og:title", content: "Zxtraa Store" },
      {
        property: "og:description",
        content:
          "Solusi kebutuhan digital Anda dalam satu tempat. Cepat, mudah, aman, dan terpercaya.",
      },
      {
        property: "og:image",
        content: "https://setoranemail-trayaa.netlify.app/og-zxtraa-store.png",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://setoranemail-trayaa.netlify.app/",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Zxtraa Store",
      },
      {
        name: "twitter:description",
        content:
          "Solusi kebutuhan digital Anda dalam satu tempat. Cepat, mudah, aman, dan terpercaya.",
      },
      {
        name: "twitter:image",
        content: "https://setoranemail-trayaa.netlify.app/og-zxtraa-store.png",
      },
    ],
  }),
  component: StoreClient,
});
