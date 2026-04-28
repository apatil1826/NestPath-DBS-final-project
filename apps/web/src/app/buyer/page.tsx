import { PortalShell } from "@/components/portal-shell";
import { getBuyerPortalData } from "@/lib/mock-data";

export default function BuyerPortalPage() {
  const snapshot = getBuyerPortalData();

  return (
    <PortalShell
      heading="Jordan's home search hub"
      kicker="Buyer portal"
      description="A calmer view of the same relationship: direct access to the agent, property-specific threads for each option under review, and a lightweight summary of the next actions that matter."
      snapshot={snapshot}
    />
  );
}
