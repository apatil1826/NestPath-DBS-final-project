import { PortalShell } from "@/components/portal-shell";
import { BuyerEmptyState } from "@/components/buyer-empty-state";
import { requireAuthenticatedProfile } from "@/lib/auth";
import { getWorkspaceSnapshotForProfile } from "@/lib/live-data";
import { sendMessageAction } from "@/app/actions";

export default async function BuyerPortalPage() {
  const profile = await requireAuthenticatedProfile("buyer");
  const snapshot = await getWorkspaceSnapshotForProfile(profile);

  if (!snapshot) {
    return <BuyerEmptyState />;
  }

  return (
    <PortalShell
      heading="Shared home search workspace"
      kicker="Buyer portal"
      description="The buyer experience starts in the conversation, with property context and next steps close by but never competing with the main thread."
      snapshot={snapshot}
      sendMessageAction={sendMessageAction}
      workspacePath="/buyer"
    />
  );
}
