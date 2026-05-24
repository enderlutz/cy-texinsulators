import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PHASES: Phase[] = [
  {
    n: 1,
    title: "Create Meta Developer App",
    time: "~5 min (one-time forever — reuse for every future client)",
    steps: [
      <>
        Open{" "}
        <Ext href="https://developers.facebook.com/apps">
          developers.facebook.com/apps
        </Ext>{" "}
        → top right → <strong>Create App</strong>
      </>,
      <>
        <strong>Use case:</strong> scroll to{" "}
        <strong>"Manage everything on your Page"</strong> (flag icon, listed
        under the "Others" filter — has the description{" "}
        <em>"Publish content and videos…"</em>) → check it →{" "}
        <strong>Next</strong>
      </>,
      <>
        On the next screen, fill in: Display name{" "}
        <code>Stillwater Hiring</code>, your email, and pick or create a Meta
        Business Account.
      </>,
      <>
        Click <strong>Create app</strong> (may prompt for FB password)
      </>,
      <>
        Left sidebar → <strong>App Settings → Basic</strong>. Note down:{" "}
        <strong>App ID</strong> (top of page) and <strong>App Secret</strong>{" "}
        (click <em>Show</em> → enter password). ⚠️ Don't share App Secret in
        chat — it goes into your own terminal in Phase 3.
      </>,
      <>
        Left sidebar → <strong>Add products</strong> → find{" "}
        <strong>Facebook Login for Business</strong> →{" "}
        <strong>Set up</strong>. No further config needed; this just unlocks
        the page permissions.
      </>,
    ],
  },
  {
    n: 2,
    title: "Get short-lived User Token",
    time: "~3 min",
    partner: true,
    steps: [
      <>
        Open{" "}
        <Ext href="https://developers.facebook.com/tools/explorer/">
          Graph API Explorer
        </Ext>
      </>,
      <>
        Top right: <strong>Meta App</strong> = `Stillwater Hiring`,{" "}
        <strong>User or Page</strong> → <strong>Get User Access Token</strong>
      </>,
      <>
        Permissions modal — check these three:{" "}
        <code>pages_show_list</code>,
        <code className="mx-1">pages_read_engagement</code>,{" "}
        <code>pages_manage_posts</code>
      </>,
      <>
        Click <strong>Generate Access Token</strong>
      </>,
      <>
        🤝 <strong>Partner moment:</strong> FB login popup appears. Partner
        logs in with their account on your laptop, approves the permission
        grant. Done. Partner can leave after this.
      </>,
      <>
        Copy the token from the Explorer text field. It starts with{" "}
        <code>EAA…</code> and is short-lived (~1 hour).
      </>,
    ],
  },
  {
    n: 3,
    title: "Exchange for long-lived User Token",
    time: "~2 min (your terminal)",
    steps: [
      <>Open Terminal on your Mac.</>,
      <>
        Run this curl, replacing the three <code>YOUR_*</code> placeholders
        with the App ID, App Secret (Phase 1.6) and short-lived token (Phase
        2.6):
      </>,
      {
        code: `curl "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"`,
      },
      <>
        Response includes <code>access_token</code> and{" "}
        <code>expires_in: 5183944</code> (~60 days). Copy the new{" "}
        <code>access_token</code> — this is your long-lived <strong>user</strong>{" "}
        token (still not the Page token yet).
      </>,
    ],
  },
  {
    n: 4,
    title: "Get the non-expiring Page Access Token",
    time: "~1 min (terminal)",
    steps: [
      <>Replace the placeholder and run:</>,
      {
        code: `curl "https://graph.facebook.com/v21.0/me/accounts?access_token=YOUR_LONG_LIVED_USER_TOKEN"`,
      },
      <>
        Response includes a <code>data: [...]</code> array with the partner's
        Page(s). For each, you get an <code>id</code>, a <code>name</code>,
        and an <code>access_token</code>. <strong>Copy</strong> the{" "}
        <code>id</code> and <code>access_token</code> for the Page you'll
        post to.
      </>,
      <>
        ⚠️ If <code>data: []</code> → partner isn't a Page admin. Have them
        check FB Page → Settings → Page Roles.
      </>,
      <>
        ✅ This Page Access Token <strong>does not expire</strong> (unless the
        partner changes their password or revokes the app).
      </>,
    ],
  },
  {
    n: 5,
    title: "Connect in this app",
    time: "~1 min",
    steps: [
      <>
        Open{" "}
        <Link to="/settings" className="text-blue-700 underline">
          Settings
        </Link>{" "}
        in this dashboard.
      </>,
      <>
        Paste <strong>Page ID</strong> + <strong>Page Access Token</strong>{" "}
        from Phase 4 → click <strong>Connect Page</strong>.
      </>,
      <>
        Backend validates against Graph API. On success you see a green ✓
        Connected badge with the partner's business name.
      </>,
      <>
        Click <strong>Test connection</strong> to confirm the token still
        works.
      </>,
    ],
  },
  {
    n: 6,
    title: "Create the first job",
    time: "~3 min",
    steps: [
      <>
        Open{" "}
        <Link to="/jobs" className="text-blue-700 underline">
          Jobs
        </Link>{" "}
        tab.
      </>,
      <>
        Left form — fill in: Title (e.g. <em>Insulation Installer</em>),
        Location, Pay range with real owner numbers, and a 2-4 sentence
        description (work type, schedule, perks like weekly pay).
      </>,
      <>
        Click <strong>Create job</strong>. Card appears on the right.
      </>,
    ],
  },
  {
    n: 7,
    title: "Publish to Facebook",
    time: "~1 min",
    steps: [
      <>
        On the new job card → <strong>Publish & Share</strong>.
      </>,
      <>
        Card expands with editable post message + public apply link. Tweak
        the message if it sounds robotic.
      </>,
      <>
        Click <strong>Publish to Facebook Page</strong>. Backend hits Graph
        API → "View live post on Facebook →" link appears.
      </>,
      <>
        Click that link → opens the actual post on the partner's FB Page.
        Verify it looks right.
      </>,
    ],
  },
  {
    n: 8,
    title: "Verify the apply funnel works",
    time: "~2 min",
    steps: [
      <>
        On the job card, copy the apply link with the link button.
      </>,
      <>
        Open the URL in a new tab (or send to your phone). You see the public
        apply page.
      </>,
      <>Fill in test data and submit. See "Application received ✓".</>,
      <>
        Open{" "}
        <Link to="/pipeline" className="text-blue-700 underline">
          Pipeline
        </Link>{" "}
        → your fake applicant shows up in <strong>New</strong> with a score.
      </>,
    ],
  },
];

const ERRORS: { error: string; fix: string }[] = [
  {
    error: "Phase 4 returns `data: []`",
    fix: "Partner isn't a Page admin. Check FB Page → Settings → Page Roles.",
  },
  {
    error: "Phase 5 'Invalid OAuth access token'",
    fix: "Token mistyped or expired. Redo Phases 2-4.",
  },
  {
    error: "Phase 7 'publish failed: (#200) Permission denied'",
    fix: "Missed `pages_manage_posts` in Phase 2. Redo Phase 2 with that box checked.",
  },
  {
    error: "Publish returns mock response",
    fix: "Settings didn't save. Click Test connection in Settings, then retry.",
  },
  {
    error: "Apply form opens to localhost",
    fix: "Railway PUBLIC_APPLY_BASE env var not set to your Vercel URL.",
  },
];

export default function FbSetupPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <div className="rounded-md border bg-amber-50 border-amber-200 p-3 flex items-start gap-2">
        <Info size={18} className="text-amber-700 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <strong>Temporary setup guide.</strong> Walks you through connecting
          a Facebook Page to this dashboard. Remove this page from the sidebar
          once integration is live.
        </div>
      </div>

      <h1 className="text-2xl font-semibold">Facebook Page — Setup Guide</h1>
      <p className="text-sm text-muted-foreground">
        Total time ~25-30 min. The partner is only needed for ~90 seconds
        (Phase 2 — the permission grant). All other phases are solo.
      </p>

      {PHASES.map((p) => (
        <PhaseCard key={p.n} phase={p} />
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Common failures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            {ERRORS.map(({ error, fix }, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr] gap-3 border-b last:border-0 pb-2 last:pb-0">
                <code className="text-xs text-destructive">{error}</code>
                <div className="text-muted-foreground">{fix}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type Step = React.ReactNode | { code: string };

interface Phase {
  n: number;
  title: string;
  time: string;
  partner?: boolean;
  steps: Step[];
}

function PhaseCard({ phase }: { phase: Phase }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-secondary text-secondary-foreground border-transparent">
            Phase {phase.n}
          </Badge>
          <span>{phase.title}</span>
          {phase.partner && (
            <Badge className="bg-amber-100 text-amber-900 border-transparent text-xs">
              🤝 Partner needed
            </Badge>
          )}
        </CardTitle>
        <div className="text-xs text-muted-foreground">{phase.time}</div>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2 text-sm list-decimal list-outside ml-5">
          {phase.steps.map((step, i) =>
            typeof step === "object" && step !== null && "code" in step ? (
              <li key={i} className="list-none ml-[-1.25rem]">
                <CodeBlock code={step.code} />
              </li>
            ) : (
              <li key={i}>{step as React.ReactNode}</li>
            )
          )}
        </ol>
      </CardContent>
    </Card>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Command copied");
  };
  return (
    <div className="relative group bg-zinc-900 text-zinc-100 rounded-md p-3 my-2 font-mono text-xs overflow-x-auto">
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
        aria-label="Copy"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <pre className="whitespace-pre-wrap break-all pr-9">{code}</pre>
    </div>
  );
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-blue-700 underline inline-flex items-center gap-0.5"
    >
      {children} <ExternalLink size={11} />
    </a>
  );
}
