import { createContext, useContext } from "react";
import { createMongoAbility } from "@casl/ability";
import type { AppAbility } from "../ability";

export const AbilityContext = createContext<AppAbility>(createMongoAbility());

export function useAbility(): AppAbility {
  return useContext(AbilityContext);
}
