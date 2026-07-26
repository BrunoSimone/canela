import { defineCliConfig } from "sanity/cli";

import { dataset, projectId } from "./src/sanity/env";

export default defineCliConfig({
  api: { projectId, dataset },
  // Hosted Studio URL: https://canela-artesanal.sanity.studio
  studioHost: "canela-artesanal",
  // Pins the deploy target so `sanity deploy` never re-prompts for the app id.
  deployment: { appId: "k4tk043883uquz3cesm89fcs" },
});
