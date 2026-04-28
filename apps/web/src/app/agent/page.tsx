import { PortalShell } from "@/components/portal-shell";
import { getAgentPortalData } from "@/lib/mock-data";

export default function AgentPortalPage() {
  const snapshot = getAgentPortalData();

  return (
    <PortalShell
      heading="Maya's coordination workspace"
      kicker="Agent portal"
      description="A multi-thread inbox for every buyer relationship, with direct messaging, property-linked discussions, shareable invites, and a summary rail that keeps the whole search moving."
      snapshot={snapshot}
    />
  );
}
