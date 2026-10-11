import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SMAP — Smart Mobility Alicante Platform",
    short_name: "SMAP",
    description: "Demo web responsive per la mobilità pubblica di Alicante.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7f8",
    theme_color: "#005b73",
    lang: "es",
    icons: [
      { src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
