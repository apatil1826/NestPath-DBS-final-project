import Link from "next/link";
import { ReactNode } from "react";
import {
  ActionItem,
  Invite,
  Message,
  PortalSnapshot,
  Profile,
  Property,
  Thread,
} from "@/lib/nestpath-types";

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function stageLabel(stage: Property["stage"]) {
  return stage.replaceAll("_", " ");
}

function stageBadge(stage: Property["stage"]) {
  switch (stage) {
    case "touring":
      return "bg-sky-50 text-sky-700 ring-sky-100";
    case "offer":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    case "under_contract":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "closed":
      return "bg-stone-100 text-stone-700 ring-stone-200";
    case "paused":
      return "bg-rose-50 text-rose-700 ring-rose-100";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function inviteBadge(status: Invite["status"]) {
  switch (status) {
    case "accepted":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "expired":
      return "bg-rose-50 text-rose-700 ring-rose-100";
    case "revoked":
      return "bg-stone-100 text-stone-700 ring-stone-200";
    default:
      return "bg-sky-50 text-sky-700 ring-sky-100";
  }
}

function actionBadge(status: ActionItem["status"]) {
  switch (status) {
    case "done":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "in_progress":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function NavPill({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-2 text-sm",
        active ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{sublabel}</p>
    </div>
  );
}

function ConversationRow({
  thread,
  active,
}: {
  thread: Thread;
  active: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4 transition",
        active
          ? "border-slate-900 bg-white shadow-sm"
          : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{thread.title}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
            {thread.kind === "direct" ? "Direct chat" : "Property thread"}
          </p>
        </div>
        {thread.unreadCount > 0 ? (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
            {thread.unreadCount}
          </span>
        ) : null}
      </div>
      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">{thread.lastMessagePreview}</p>
      <p className="mt-4 text-xs text-slate-400">{formatTimestamp(thread.lastMessageAt)}</p>
    </div>
  );
}

function MessageBubble({
  message,
  viewer,
  participants,
}: {
  message: Message;
  viewer: Profile;
  participants: Profile[];
}) {
  if (message.kind === "system") {
    return (
      <div className="mx-auto max-w-xl rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-center text-xs uppercase tracking-[0.16em] text-slate-500">
        {message.body}
      </div>
    );
  }

  const sender = participants.find((participant) => participant.id === message.senderProfileId);
  const isViewer = message.senderProfileId === viewer.id;

  return (
    <div className={`flex gap-3 ${isViewer ? "justify-end" : "justify-start"}`}>
      {!isViewer ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
          {sender ? getInitials(sender.fullName) : "NP"}
        </div>
      ) : null}
      <div className={`flex max-w-xl flex-col ${isViewer ? "items-end" : "items-start"}`}>
        <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">
          {isViewer ? "You" : sender?.fullName ?? "NestPath"}
        </p>
        <div
          className={[
            "rounded-[22px] px-4 py-3 text-sm leading-7",
            isViewer
              ? "bg-slate-900 text-white"
              : "border border-slate-200 bg-white text-slate-700",
          ].join(" ")}
        >
          {message.body}
        </div>
        <p className="mt-2 text-xs text-slate-400">{formatTimestamp(message.createdAt)}</p>
      </div>
    </div>
  );
}

function Composer() {
  return null;
}

function MessageComposer({
  threadId,
  sendMessageAction,
  workspacePath,
}: {
  threadId: string;
  sendMessageAction: (formData: FormData) => Promise<void>;
  workspacePath: string;
}) {
  return (
    <form action={sendMessageAction} className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="redirectTo" value={workspacePath} />
      <textarea
        name="body"
        required
        rows={4}
        placeholder="Send a message to this relationship..."
        className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs uppercase tracking-[0.14em] text-slate-500">
            Direct chat
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs uppercase tracking-[0.14em] text-slate-500">
            Create property thread
          </span>
        </div>
        <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
          Send
        </button>
      </div>
    </form>
  );
}

function SummaryRail({
  invites,
  properties,
  actionItems,
  viewer,
  createRelationshipInviteAction,
}: {
  invites: Invite[];
  properties: Property[];
  actionItems: ActionItem[];
  viewer: Profile;
  createRelationshipInviteAction?: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Summary</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">What needs attention</h3>
        <div className="mt-4 space-y-3">
          {actionItems.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-6 text-slate-900">{item.title}</p>
                <span className={`rounded-full px-3 py-1 text-xs ring-1 ${actionBadge(item.status)}`}>
                  {item.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-400">
                {item.assigneeProfileId === viewer.id ? "Assigned to you" : "Shared workflow"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Properties</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">Property threads</h3>
        <div className="mt-4 space-y-3">
          {properties.map((property) => (
            <div key={property.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{property.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{property.address}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs capitalize ring-1 ${stageBadge(property.stage)}`}>
                  {stageLabel(property.stage)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5">
        <div id="invite-panel">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Invites</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Connection options</h3>
        </div>
        {viewer.role === "agent" && createRelationshipInviteAction ? (
          <form action={createRelationshipInviteAction} className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <input
              name="buyerFullName"
              placeholder="Buyer name"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
            />
            <input
              name="buyerEmail"
              type="email"
              placeholder="buyer@example.com"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
            />
            <select
              name="channel"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              defaultValue="email"
            >
              <option value="email">Send email invite</option>
              <option value="link">Create shareable link</option>
            </select>
            <button className="rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
              Create new relationship
            </button>
          </form>
        ) : null}
        <div className="mt-4 space-y-3">
          {invites.map((invite) => (
            <div key={invite.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {invite.channel === "email" ? invite.buyerEmail : "Shareable relationship link"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                    {invite.channel} invite
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs ring-1 ${inviteBadge(invite.status)}`}>
                  {invite.status}
                </span>
              </div>
              <p className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 font-mono text-xs text-slate-500">
                /invite/{invite.token}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function PortalShell({
  heading,
  kicker,
  description,
  snapshot,
  toolbar,
  sendMessageAction,
  workspacePath,
  createRelationshipInviteAction,
}: {
  heading: string;
  kicker: string;
  description: string;
  snapshot: PortalSnapshot;
  toolbar?: ReactNode;
  sendMessageAction?: (formData: FormData) => Promise<void>;
  workspacePath: string;
  createRelationshipInviteAction?: (formData: FormData) => Promise<void>;
}) {
  const counterpartLabel =
    snapshot.relationshipLabel ||
    snapshot.counterparts.map((profile) => profile.fullName).join(", ");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1680px] gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <aside className="hidden w-[220px] shrink-0 rounded-[30px] border border-slate-200 bg-white p-4 lg:flex lg:flex-col">
        <Link href="/" className="rounded-2xl px-3 py-3">
          <p className="text-lg font-semibold text-slate-900">NestPath</p>
          <p className="mt-1 text-sm text-slate-500">Shared client workspace</p>
        </Link>
        <div className="mt-6 space-y-2">
          <NavPill label="Inbox" active />
          <NavPill label="Relationships" />
          <NavPill label="Action Items" />
          <NavPill label="Profile" />
        </div>
        <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Default flow</p>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
            Inbox first, relationship second, property threads inside the relationship.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <header className="rounded-[32px] border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{kicker}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {heading}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-500">{description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {toolbar}
              <Link
                href="/agent"
                className="rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Agent
              </Link>
              <Link
                href="/buyer"
                className="rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Buyer
              </Link>
              <Link
                href="#invite-panel"
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Invite buyer
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Active relationship</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                  {getInitials(counterpartLabel || snapshot.viewer.fullName)}
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{counterpartLabel}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Relationship-first workspace with direct chat, property threads, and summary.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-2 text-xs uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
                  Messages
                </span>
                <span className="rounded-full bg-white px-3 py-2 text-xs uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
                  Properties
                </span>
                <span className="rounded-full bg-white px-3 py-2 text-xs uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
                  Summary
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <StatCard
                label="Threads"
                value={`${snapshot.threads.length}`}
                sublabel="Direct chat plus property-specific conversations."
              />
              <StatCard
                label="Properties"
                value={`${snapshot.properties.length}`}
                sublabel="Each property stays nested under the relationship."
              />
              <StatCard
                label="Open items"
                value={`${snapshot.actionItems.filter((item) => item.status !== "done").length}`}
                sublabel="One calm rollup of next steps and pending work."
              />
            </div>
          </div>
        </header>

        <section className="grid min-h-0 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
          <aside className="rounded-[30px] border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between px-2 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Inbox</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Relationships</h2>
              </div>
              <Link
                href="#invite-panel"
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                New
              </Link>
            </div>

            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              One row per buyer relationship. Open the relationship, then branch into direct chat or
              a property thread.
            </div>

            <div className="space-y-3">
              {snapshot.threads.map((thread) => (
                <ConversationRow
                  key={thread.id}
                  thread={thread}
                  active={thread.id === snapshot.activeThread.id}
                />
              ))}
            </div>
          </aside>

          <section className="rounded-[30px] border border-slate-200 bg-white p-5">
            <div className="border-b border-slate-200 pb-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    {snapshot.activeThread.kind === "direct" ? "Direct chat" : "Property thread"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    {snapshot.activeThread.title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
                    {snapshot.activeThread.summary}
                  </p>
                </div>

                {snapshot.activeThread.property ? (
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">
                      {snapshot.activeThread.property.address}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                      Property context
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white">
                  Messages
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
                  Properties
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
                  Summary
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-5 py-6">
              {snapshot.activeThread.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  viewer={snapshot.viewer}
                  participants={snapshot.activeThread.participants}
                />
              ))}
            </div>

              {sendMessageAction ? (
                <MessageComposer
                  threadId={snapshot.activeThread.id}
                  sendMessageAction={sendMessageAction}
                  workspacePath={workspacePath}
                />
              ) : (
                <Composer />
              )}
            </section>

          <SummaryRail
            invites={snapshot.invites}
            properties={snapshot.properties}
            actionItems={snapshot.actionItems}
            viewer={snapshot.viewer}
            createRelationshipInviteAction={createRelationshipInviteAction}
          />
        </section>
      </div>
    </main>
  );
}
