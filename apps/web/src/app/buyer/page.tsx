import { PortalShell } from "@/components/portal-shell";
import { getBuyerPortalData } from "@/lib/mock-data";

export default function BuyerPortalPage() {
  const snapshot = getBuyerPortalData();

  return (
    <PortalShell
      heading="Shared home search workspace"
      kicker="Buyer portal"
      description="The buyer experience starts in the conversation, with property context and next steps close by but never competing with the main thread."
      snapshot={snapshot}
    />
  );
}
