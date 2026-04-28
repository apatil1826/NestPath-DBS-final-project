import {
  ActionItem,
  Invite,
  Message,
  PortalSnapshot,
  Profile,
  Property,
  Relationship,
  Thread,
  ThreadDetail,
} from "@/lib/nestpath-types";

const profiles: Record<string, Profile> = {
  agent: {
    id: "profile-agent-1",
    role: "agent",
    fullName: "Maya Chen",
    email: "maya@nestpath.demo",
  },
  buyerA: {
    id: "profile-buyer-1",
    role: "buyer",
    fullName: "Jordan Lee",
    email: "jordan@nestpath.demo",
  },
  buyerB: {
    id: "profile-buyer-2",
    role: "buyer",
    fullName: "Samira Patel",
    email: "samira@nestpath.demo",
  },
};

const relationship: Relationship = {
  id: "relationship-1",
  agentProfileId: profiles.agent.id,
  buyerProfileId: profiles.buyerA.id,
  status: "active",
};

const properties: Property[] = [
  {
    id: "property-1",
    relationshipId: relationship.id,
    title: "North Center Brick Two-Flat",
    address: "2134 W Nelson St, Chicago, IL",
    stage: "touring",
    isPrimary: true,
  },
  {
    id: "property-2",
    relationshipId: relationship.id,
    title: "Roscoe Village Corner Condo",
    address: "1748 W Roscoe St, Chicago, IL",
    stage: "considering",
    isPrimary: false,
  },
];

const threads: Thread[] = [
  {
    id: "thread-1",
    relationshipId: relationship.id,
    propertyId: null,
    kind: "direct",
    title: "Jordan + Maya",
    summary: "General buyer-agent chat for coordination, questions, and next steps.",
    lastMessagePreview: "I can make the 5:30 walkthrough on Thursday.",
    lastMessageAt: "2026-04-28T13:10:00-05:00",
    unreadCount: 2,
  },
  {
    id: "thread-2",
    relationshipId: relationship.id,
    propertyId: properties[0].id,
    kind: "property",
    title: "North Center Brick Two-Flat",
    summary: "Property-specific thread for touring feedback and offer preparation.",
    lastMessagePreview: "I uploaded the disclosure packet summary.",
    lastMessageAt: "2026-04-28T12:42:00-05:00",
    unreadCount: 0,
  },
  {
    id: "thread-3",
    relationshipId: relationship.id,
    propertyId: properties[1].id,
    kind: "property",
    title: "Roscoe Village Corner Condo",
    summary: "A lighter evaluation thread while the buyer is still comparing options.",
    lastMessagePreview: "Can we compare HOA details with the other place?",
    lastMessageAt: "2026-04-27T18:05:00-05:00",
    unreadCount: 1,
  },
];

const messages: Message[] = [
  {
    id: "message-1",
    threadId: "thread-1",
    senderProfileId: profiles.agent.id,
    kind: "system",
    body: "Jordan is now connected to Maya through NestPath.",
    createdAt: "2026-04-25T09:00:00-05:00",
  },
  {
    id: "message-2",
    threadId: "thread-1",
    senderProfileId: profiles.agent.id,
    kind: "user",
    body: "I opened a property thread for the North Center brick two-flat so we can keep feedback organized there.",
    createdAt: "2026-04-28T08:42:00-05:00",
  },
  {
    id: "message-3",
    threadId: "thread-1",
    senderProfileId: profiles.buyerA.id,
    kind: "user",
    body: "Perfect. I also want one general place to ask financing and timeline questions.",
    createdAt: "2026-04-28T08:47:00-05:00",
  },
  {
    id: "message-4",
    threadId: "thread-1",
    senderProfileId: profiles.agent.id,
    kind: "user",
    body: "Absolutely. We can keep that here, and each property gets its own thread if it needs deeper review.",
    createdAt: "2026-04-28T12:58:00-05:00",
  },
  {
    id: "message-5",
    threadId: "thread-1",
    senderProfileId: profiles.buyerA.id,
    kind: "user",
    body: "I can make the 5:30 walkthrough on Thursday.",
    createdAt: "2026-04-28T13:10:00-05:00",
  },
  {
    id: "message-6",
    threadId: "thread-2",
    senderProfileId: profiles.agent.id,
    kind: "system",
    body: "Property thread linked to 2134 W Nelson St.",
    createdAt: "2026-04-27T10:00:00-05:00",
  },
  {
    id: "message-7",
    threadId: "thread-2",
    senderProfileId: profiles.buyerA.id,
    kind: "user",
    body: "The layout feels strong, but I want to understand what needs updating in the basement.",
    createdAt: "2026-04-28T12:15:00-05:00",
  },
  {
    id: "message-8",
    threadId: "thread-2",
    senderProfileId: profiles.agent.id,
    kind: "user",
    body: "I uploaded the disclosure packet summary.",
    createdAt: "2026-04-28T12:42:00-05:00",
  },
  {
    id: "message-9",
    threadId: "thread-3",
    senderProfileId: profiles.buyerA.id,
    kind: "user",
    body: "Can we compare HOA details with the other place?",
    createdAt: "2026-04-27T18:05:00-05:00",
  },
];

const invites: Invite[] = [
  {
    id: "invite-1",
    relationshipId: relationship.id,
    propertyId: null,
    buyerEmail: "jordan@example.com",
    channel: "email",
    status: "accepted",
    token: "invite-jordan-live",
    expiresAt: "2026-05-05T23:59:00-05:00",
  },
  {
    id: "invite-2",
    relationshipId: relationship.id,
    propertyId: properties[1].id,
    buyerEmail: null,
    channel: "link",
    status: "pending",
    token: "share-roscoe-compare",
    expiresAt: "2026-05-01T23:59:00-05:00",
  },
];

const actionItems: ActionItem[] = [
  {
    id: "action-1",
    relationshipId: relationship.id,
    threadId: "thread-2",
    propertyId: properties[0].id,
    title: "Confirm basement moisture note with listing agent",
    status: "in_progress",
    assigneeProfileId: profiles.agent.id,
  },
  {
    id: "action-2",
    relationshipId: relationship.id,
    threadId: "thread-1",
    propertyId: null,
    title: "Buyer to send updated lender letter",
    status: "open",
    assigneeProfileId: profiles.buyerA.id,
  },
  {
    id: "action-3",
    relationshipId: relationship.id,
    threadId: "thread-3",
    propertyId: properties[1].id,
    title: "Compare HOA fee and reserve disclosures",
    status: "open",
    assigneeProfileId: null,
  },
];

function getThreadDetail(threadId: string): ThreadDetail {
  const thread = threads.find((entry) => entry.id === threadId);

  if (!thread) {
    throw new Error(`Unknown thread: ${threadId}`);
  }

  return {
    ...thread,
    property: properties.find((entry) => entry.id === thread.propertyId) ?? null,
    participants: [profiles.agent, profiles.buyerA],
    messages: messages.filter((entry) => entry.threadId === threadId),
  };
}

export function getAgentPortalData(): PortalSnapshot {
  return {
    viewer: profiles.agent,
    counterparts: [profiles.buyerA, profiles.buyerB],
    relationship,
    activeThread: getThreadDetail("thread-1"),
    threads,
    properties,
    invites,
    actionItems,
  };
}

export function getBuyerPortalData(): PortalSnapshot {
  return {
    viewer: profiles.buyerA,
    counterparts: [profiles.agent],
    relationship,
    activeThread: getThreadDetail("thread-2"),
    threads,
    properties,
    invites,
    actionItems,
  };
}

export function getInviteByToken(token: string): Invite | null {
  return invites.find((entry) => entry.token === token) ?? null;
}

export function getThreadForInvite(invite: Invite): Thread | null {
  if (!invite.propertyId) {
    return threads.find((entry) => entry.kind === "direct") ?? null;
  }

  return (
    threads.find((entry) => entry.propertyId === invite.propertyId) ??
    threads.find((entry) => entry.kind === "direct") ??
    null
  );
}

export function getPropertyById(propertyId: string | null): Property | null {
  if (!propertyId) {
    return null;
  }

  return properties.find((entry) => entry.id === propertyId) ?? null;
}

export function getProfile(profileId: string): Profile {
  const profile = Object.values(profiles).find((entry) => entry.id === profileId);

  if (!profile) {
    throw new Error(`Unknown profile: ${profileId}`);
  }

  return profile;
}
