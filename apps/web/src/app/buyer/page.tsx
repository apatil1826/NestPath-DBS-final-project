import { PortalShell } from "@/components/portal-shell";
import { SignOutLink } from "@/components/auth/sign-out-link";
import { requireAuthenticatedProfile } from "@/lib/auth";
import { getBuyerPortalData } from "@/lib/mock-data";

export default async function BuyerPortalPage() {
  const profile = await requireAuthenticatedProfile("buyer");
  const snapshot = getBuyerPortalData();

  snapshot.viewer = {
    id: profile.id,
    role: profile.role,
    fullName: profile.full_name,
    email: profile.email,
  };

  return (
    <PortalShell
      heading="Jordan's home search hub"
      kicker="Buyer portal"
      description="A calmer view of the same relationship: direct access to the agent, property-specific threads for each option under review, and a lightweight summary of the next actions that matter."
      snapshot={snapshot}
      toolbar={<SignOutLink />}
    />
  );
}
