import { PortalShell } from "@/components/portal-shell";
import { AgentEmptyState } from "@/components/agent-empty-state";
import { createRelationshipInviteAction, sendMessageAction } from "@/app/actions";
import { requireAuthenticatedProfile } from "@/lib/auth";
import { getWorkspaceSnapshotForProfile } from "@/lib/live-data";

export default async function AgentPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireAuthenticatedProfile("agent");
  const snapshot = await getWorkspaceSnapshotForProfile(profile);

  if (!snapshot) {
    return <AgentEmptyState inviteLink={params.invite} />;
  }

  return (
    <PortalShell
      heading="Relationship inbox"
      kicker="Agent portal"
      description="Open the relationship first, keep the direct chat at the center, and let property threads, invites, and action items support the next decision."
      snapshot={snapshot}
      sendMessageAction={sendMessageAction}
      workspacePath="/agent"
      createRelationshipInviteAction={createRelationshipInviteAction}
    />
  );
}
