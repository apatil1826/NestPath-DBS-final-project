import { PortalShell } from "@/components/portal-shell";
import { getAgentPortalData } from "@/lib/mock-data";

export default function AgentPortalPage() {
  const snapshot = getAgentPortalData();

  return (
    <PortalShell
      heading="Relationship inbox"
      kicker="Agent portal"
      description="Open the relationship first, keep the direct chat at the center, and let property threads, invites, and action items support the next decision."
      snapshot={snapshot}
    />
  );
}
