import { ConvexReactClient } from "convex/react";

const url = import.meta.env.VITE_CONVEX_URL ?? "https://placeholder.convex.cloud";

export const convex = new ConvexReactClient(url);
