// Maps a ServiceCategory.iconName (Module 2: "Used for rendering shadcn/lucide
// UI icons dynamically") to a lucide-react component. Falls back to a generic
// wrench icon for unrecognized names so the grid never renders blank tiles.

import { Wrench, Zap, Snowflake, Hammer, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  plumbing: Wrench,
  wrench: Wrench,
  electrical: Zap,
  zap: Zap,
  ac: Snowflake,
  snowflake: Snowflake,
  carpentry: Hammer,
  hammer: Hammer,
};

export function getCategoryIcon(iconName: string): LucideIcon {
  return ICONS[iconName.toLowerCase()] ?? Wrench;
}
