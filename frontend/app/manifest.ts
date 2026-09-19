import type { MetadataRoute } from "next";

// Lets the app be added to the home screen and open full-screen like an app, which is
// also what gives an iPhone room to keep the offline library around.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SoundSea",
    short_name: "SoundSea",
    description: "Save audio from YouTube and TikTok and play it anywhere, offline too.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    icons: [{ src: "/logo.png", sizes: "1024x1024", type: "image/png", purpose: "any" }],
  };
}
