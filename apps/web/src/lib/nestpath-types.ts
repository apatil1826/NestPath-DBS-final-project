export type ProfileRole = "agent" | "buyer";
export type RelationshipStatus = "invited" | "active" | "archived";
export type PropertyStage =
  | "considering"
  | "touring"
  | "offer"
  | "under_contract"
  | "closed"
  | "paused";
export type ThreadKind = "direct" | "property";
export type InviteChannel = "email" | "link";
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";
export type MessageKind = "user" | "system";
export type ActionItemStatus = "open" | "in_progress" | "done";

export type Profile = {
  id: string;
  role: ProfileRole;
  fullName: string;
  email: string;
};

export type Relationship = {
  id: string;
  agentProfileId: string;
  buyerProfileId: string;
  status: RelationshipStatus;
};

export type Property = {
  id: string;
  relationshipId: string;
  title: string;
  address: string;
  stage: PropertyStage;
  isPrimary: boolean;
};

export type Thread = {
  id: string;
  relationshipId: string;
  propertyId: string | null;
  kind: ThreadKind;
  title: string;
  summary: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
};

export type Message = {
  id: string;
  threadId: string;
  senderProfileId: string | null;
  kind: MessageKind;
  body: string;
  createdAt: string;
};

export type Invite = {
  id: string;
  relationshipId: string;
  propertyId: string | null;
  buyerEmail: string | null;
  channel: InviteChannel;
  status: InviteStatus;
  token: string;
  expiresAt: string;
};

export type ActionItem = {
  id: string;
  relationshipId: string;
  threadId: string | null;
  propertyId: string | null;
  title: string;
  status: ActionItemStatus;
  assigneeProfileId: string | null;
};

export type ThreadDetail = Thread & {
  property: Property | null;
  participants: Profile[];
  messages: Message[];
};

export type PortalSnapshot = {
  viewer: Profile;
  counterparts: Profile[];
  relationship: Relationship;
  activeThread: ThreadDetail;
  threads: Thread[];
  properties: Property[];
  invites: Invite[];
  actionItems: ActionItem[];
};
