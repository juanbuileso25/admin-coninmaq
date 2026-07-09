import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import type { MongoAbility } from "@casl/ability";

export type Actions = "read" | "create" | "update" | "delete" | "manage";
export type Subjects =
  | "Dashboard"
  | "Inventory"
  | "Quote"
  | "Lead"
  | "RentalRecord"
  | "Client"
  | "User"
  | "Settings"
  | "Agent"
  | "ForeignTrade"
  | "BotSession"
  | "Payments"
  | "Prospecting"
  | "all";

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export type PermissionDef = { action: string; subject: string };

export function buildAbility(permissions: PermissionDef[]): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
  for (const { action, subject } of permissions) {
    can(action as Actions, subject as Subjects);
  }
  return build();
}
