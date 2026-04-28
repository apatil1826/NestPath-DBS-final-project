import { PortalShell } from "@/components/portal-shell";
import { SignOutLink } from "@/components/auth/sign-out-link";
import { requireAuthenticatedProfile } from "@/lib/auth";
import { getAgentPortalData } from "@/lib/mock-data";

export default async function AgentPortalPage() {
  const profile = await requireAuthenticatedProfile("agent");
  const snapshot = getAgentPortalData();

  snapshot.viewer = {
    id: profile.id,
    role: profile.role,
    fullName: profile.full_name,
    email: profile.email,
  };

  return (
    <PortalShell
      heading="Maya's coordination workspace"
      kicker="Agent portal"
      description="A multi-thread inbox for every buyer relationship, with direct messaging, property-linked discussions, shareable invites, and a summary rail that keeps the whole search moving."
      snapshot={snapshot}
      toolbar={<SignOutLink />}
    />
  );
}
