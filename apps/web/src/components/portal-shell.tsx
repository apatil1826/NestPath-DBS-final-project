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

function stageClassName(stage: Property["stage"]) {
  switch (stage) {
    case "touring":
      return "bg-sky-500/15 text-sky-100 ring-1 ring-sky-300/20";
    case "offer":
      return "bg-amber-500/15 text-amber-100 ring-1 ring-amber-300/20";
    case "under_contract":
      return "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-300/20";
    case "closed":
      return "bg-stone-200 text-stone-900";
    case "paused":
      return "bg-rose-500/15 text-rose-100 ring-1 ring-rose-300/20";
    default:
      return "bg-white/10 text-stone-100 ring-1 ring-white/10";
  }
}

function actionStatusClassName(status: ActionItem["status"]) {
  switch (status) {
    case "done":
      return "bg-emerald-400/15 text-emerald-100";
    case "in_progress":
      return "bg-amber-400/15 text-amber-100";
    default:
      return "bg-white/10 text-stone-100";
  }
}

function inviteStatusClassName(status: Invite["status"]) {
  switch (status) {
    case "accepted":
      return "bg-emerald-400/15 text-emerald-100";
    case "expired":
      return "bg-rose-400/15 text-rose-100";
    case "revoked":
      return "bg-stone-200 text-stone-900";
    default:
      return "bg-sky-400/15 text-sky-100";
  }
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
    <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-stone-50">{value}</p>
      <p className="mt-2 text-sm text-stone-300">{sublabel}</p>
    </div>
  );
}

function ThreadList({
  threads,
  activeThreadId,
}: {
  threads: Thread[];
  activeThreadId: string;
}) {
  return (
    <div className="rounded-[32px] border border-white/10 bg-[#151515] p-4">
      <div className="mb-4 flex items-center justify-between px-2">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Inbox</p>
          <h2 className="mt-2 text-xl font-semibold text-stone-50">Threads</h2>
        </div>
        <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-stone-300">
          Slack-style split
        </span>
      </div>
      <div className="space-y-3">
        {threads.map((thread) => {
          const active = thread.id === activeThreadId;

          return (
            <div
              key={thread.id}
              className={[
                "rounded-[24px] border p-4 transition",
                active
                  ? "border-[#d6a54f]/50 bg-[#221c13] shadow-[0_18px_48px_rgba(214,165,79,0.14)]"
                  : "border-white/6 bg-white/4 hover:border-white/12 hover:bg-white/6",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-50">{thread.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.25em] text-stone-500">
                    {thread.kind === "direct" ? "Direct line" : "Property thread"}
                  </p>
                </div>
                {thread.unreadCount > 0 ? (
                  <span className="rounded-full bg-[#d6a54f] px-2 py-1 text-xs font-semibold text-[#1d170d]">
                    {thread.unreadCount}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 line-clamp-2 text-sm text-stone-300">{thread.lastMessagePreview}</p>
              <p className="mt-4 text-xs text-stone-500">{formatTimestamp(thread.lastMessageAt)}</p>
            </div>
          );
        })}
      </div>
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
      <div className="mx-auto max-w-xl rounded-full border border-white/10 bg-white/6 px-4 py-2 text-center text-xs uppercase tracking-[0.18em] text-stone-400">
        {message.body}
      </div>
    );
  }

  const sender = participants.find((participant) => participant.id === message.senderProfileId);
  const isViewer = message.senderProfileId === viewer.id;

  return (
    <div className={`flex gap-3 ${isViewer ? "justify-end" : "justify-start"}`}>
      {!isViewer ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#232323] text-sm font-semibold text-stone-100">
          {sender ? getInitials(sender.fullName) : "NP"}
        </div>
      ) : null}
      <div className={`max-w-xl ${isViewer ? "items-end" : "items-start"} flex flex-col`}>
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-stone-500">
          {isViewer ? "You" : sender?.fullName ?? "NestPath"}
        </p>
        <div
          className={[
            "rounded-[26px] px-5 py-4 text-sm leading-7 shadow-[0_16px_40px_rgba(0,0,0,0.16)]",
            isViewer
              ? "bg-[#d6a54f] text-[#1b160e]"
              : "border border-white/8 bg-[#181818] text-stone-100",
          ].join(" ")}
        >
          {message.body}
        </div>
        <p className="mt-2 text-xs text-stone-500">{formatTimestamp(message.createdAt)}</p>
      </div>
    </div>
  );
}

function Composer() {
  return (
    <div className="rounded-[30px] border border-white/10 bg-[#141414] p-4">
      <div className="rounded-[24px] border border-white/8 bg-black/20 px-4 py-4 text-sm text-stone-500">
        Type a message here. In the live Supabase version, this composer will insert into
        `messages` and subscribe to realtime updates on the thread.
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-stone-500">
          <span className="rounded-full border border-white/10 px-3 py-2">Realtime</span>
          <span className="rounded-full border border-white/10 px-3 py-2">Property aware</span>
        </div>
        <button className="rounded-full bg-[#d6a54f] px-5 py-3 text-sm font-semibold text-[#1c170d] transition hover:bg-[#e6b65e]">
          Send when connected
        </button>
      </div>
    </div>
  );
}

function InvitePanel({ invites }: { invites: Invite[] }) {
  return (
    <div className="rounded-[32px] border border-white/10 bg-[#151515] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Connect</p>
          <h3 className="mt-2 text-lg font-semibold text-stone-50">Invite options</h3>
        </div>
        <button className="rounded-full border border-white/12 px-3 py-2 text-xs text-stone-300 transition hover:border-white/20 hover:text-stone-50">
          Create invite
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {invites.map((invite) => (
          <div key={invite.id} className="rounded-[24px] border border-white/8 bg-white/4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-stone-100">
                  {invite.channel === "email" ? invite.buyerEmail : "Shareable property link"}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">
                  {invite.channel} invite
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${inviteStatusClassName(invite.status)}`}
              >
                {invite.status}
              </span>
            </div>
            <p className="mt-3 rounded-2xl bg-black/20 px-3 py-3 font-mono text-xs text-stone-300">
              /invite/{invite.token}
            </p>
            <p className="mt-3 text-xs text-stone-500">
              Expires {formatTimestamp(invite.expiresAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryPanel({
  properties,
  actionItems,
  viewer,
}: {
  properties: Property[];
  actionItems: ActionItem[];
  viewer: Profile;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[32px] border border-white/10 bg-[#151515] p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Summary</p>
        <h3 className="mt-2 text-lg font-semibold text-stone-50">Action rollup</h3>
        <div className="mt-4 space-y-3">
          {actionItems.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-white/8 bg-white/4 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-stone-100">{item.title}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${actionStatusClassName(item.status)}`}
                >
                  {item.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-stone-500">
                {item.assigneeProfileId === viewer.id ? "Assigned to you" : "Shared workflow"}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[32px] border border-white/10 bg-[#151515] p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Properties</p>
        <h3 className="mt-2 text-lg font-semibold text-stone-50">Live deal context</h3>
        <div className="mt-4 space-y-3">
          {properties.map((property) => (
            <div key={property.id} className="rounded-[24px] border border-white/8 bg-white/4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-stone-100">{property.title}</p>
                  <p className="mt-1 text-sm text-stone-400">{property.address}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${stageClassName(property.stage)}`}
                >
                  {stageLabel(property.stage)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PortalShell({
  heading,
  kicker,
  description,
  snapshot,
  toolbar,
}: {
  heading: string;
  kicker: string;
  description: string;
  snapshot: PortalSnapshot;
  toolbar?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <header className="overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(214,165,79,0.22),_transparent_35%),linear-gradient(135deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.34em] text-stone-400">{kicker}</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-50 sm:text-5xl">
              {heading}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-stone-300">{description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {toolbar}
            <Link
              href="/agent"
              className="rounded-full border border-white/12 px-5 py-3 text-sm text-stone-200 transition hover:border-white/20 hover:text-stone-50"
            >
              Agent portal
            </Link>
            <Link
              href="/buyer"
              className="rounded-full bg-[#d6a54f] px-5 py-3 text-sm font-semibold text-[#1d180e] transition hover:bg-[#e3b766]"
            >
              Buyer portal
            </Link>
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Relationships"
            value="1 live"
            sublabel="Long-lived agent-buyer connection across multiple property threads."
          />
          <StatCard
            label="Inbox"
            value={`${snapshot.threads.length} threads`}
            sublabel="General conversation plus property-specific threads for active evaluation."
          />
          <StatCard
            label="Invites"
            value={`${snapshot.invites.filter((invite) => invite.status === "pending").length} pending`}
            sublabel="Email invites and shareable links can coexist in the same relationship."
          />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        <ThreadList threads={snapshot.threads} activeThreadId={snapshot.activeThread.id} />

        <section className="rounded-[32px] border border-white/10 bg-[#111111] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
          <div className="flex flex-col gap-4 border-b border-white/8 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                {snapshot.activeThread.kind === "direct" ? "Direct relationship" : "Property channel"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-50">
                {snapshot.activeThread.title}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">
                {snapshot.activeThread.summary}
              </p>
            </div>
            {snapshot.activeThread.property ? (
              <div className="rounded-[24px] border border-white/8 bg-white/4 px-4 py-3">
                <p className="text-sm font-medium text-stone-100">
                  {snapshot.activeThread.property.address}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">
                  Property scoped thread
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 py-6">
            {snapshot.activeThread.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                viewer={snapshot.viewer}
                participants={snapshot.activeThread.participants}
              />
            ))}
          </div>

          <Composer />
        </section>

        <div className="space-y-4">
          <InvitePanel invites={snapshot.invites} />
          <SummaryPanel
            properties={snapshot.properties}
            actionItems={snapshot.actionItems}
            viewer={snapshot.viewer}
          />
        </div>
      </div>
    </div>
  );
}
