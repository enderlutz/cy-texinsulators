import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Facebook, Link as LinkIcon, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, Job, JobStatus } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function JobsPage() {
  const qc = useQueryClient();
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: api.listJobs });
  const [draft, setDraft] = useState<Partial<Job>>({
    title: "",
    description: "",
    status: "draft",
  });

  const create = useMutation({
    mutationFn: () => api.createJob(draft),
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      setDraft({ title: "", description: "", status: "draft" });
      toast.success(`Job created: ${job.title}`);
    },
    onError: (e: Error) =>
      toast.error("Could not create job", { description: e.message }),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>New job posting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Title — e.g. Insulation Installer"
              value={draft.title || ""}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <Input
              placeholder="Location"
              value={draft.location || ""}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            />
            <Input
              placeholder="Pay range — e.g. $20-28/hr"
              value={draft.pay_range || ""}
              onChange={(e) => setDraft({ ...draft, pay_range: e.target.value })}
            />
            <Textarea
              placeholder="Description"
              value={draft.description || ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={4}
            />
            <Button
              className="w-full"
              disabled={!draft.title || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Creating…" : "Create job"}
            </Button>
            <p className="text-xs text-muted-foreground">
              After creating, click "Publish" on the card to post to Facebook and
              get a shareable apply link.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-3">
        <h2 className="text-2xl font-semibold">Jobs</h2>
        {jobs.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No jobs yet. Create your first posting on the left.
          </div>
        )}
        {jobs.map((j) => (
          <JobCard key={j.id} job={j} />
        ))}
      </div>
    </div>
  );
}

const STATUS_OPTIONS: JobStatus[] = ["draft", "active", "paused", "closed"];

function JobCard({ job }: { job: Job }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [applyUrl, setApplyUrl] = useState<string>("");
  const [copied, setCopied] = useState<"link" | "post" | null>(null);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<Partial<Job>>(job);

  const save = useMutation({
    mutationFn: () =>
      api.updateJob(job.id, {
        title: edit.title,
        location: edit.location,
        pay_range: edit.pay_range,
        description: edit.description,
        status: edit.status,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      setEditing(false);
      toast.success("Job updated");
    },
    onError: (e: Error) =>
      toast.error("Could not update job", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteJob(job.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job deleted");
    },
    onError: (e: Error) =>
      toast.error("Could not delete job", { description: e.message }),
  });

  const startEdit = () => {
    setEdit(job);
    setOpen(false);
    setEditing(true);
  };

  const share = useMutation({
    mutationFn: () => api.shareLinks(job.id),
    onSuccess: (d) => {
      setMessage(d.message);
      setApplyUrl(d.apply_url);
      setOpen(true);
    },
    onError: (e: Error) =>
      toast.error("Could not load share details", { description: e.message }),
  });

  const publish = useMutation({
    mutationFn: () => api.publishJob(job.id, message, applyUrl),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      if (data.mock) {
        toast.warning("Published in mock mode", {
          description: "No Facebook Page connected — open Settings to connect one",
        });
      } else if (data.ok) {
        toast.success("Posted to Facebook", {
          description: "Click the View live post link to see it",
        });
      } else {
        toast.error("Publish failed", {
          description: data.message || "Check Settings → Test connection",
        });
      }
    },
    onError: (e: Error) =>
      toast.error("Publish failed", { description: e.message }),
  });

  const copy = async (text: string, kind: "link" | "post") => {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
    toast.success(kind === "link" ? "Apply link copied" : "Post message copied");
  };

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit job</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Title"
            value={edit.title || ""}
            onChange={(e) => setEdit({ ...edit, title: e.target.value })}
          />
          <Input
            placeholder="Location"
            value={edit.location || ""}
            onChange={(e) => setEdit({ ...edit, location: e.target.value })}
          />
          <Input
            placeholder="Pay range"
            value={edit.pay_range || ""}
            onChange={(e) => setEdit({ ...edit, pay_range: e.target.value })}
          />
          <Textarea
            placeholder="Description"
            value={edit.description || ""}
            onChange={(e) => setEdit({ ...edit, description: e.target.value })}
            rows={4}
          />
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <select
              value={edit.status}
              onChange={(e) => setEdit({ ...edit, status: e.target.value as JobStatus })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => save.mutate()}
              disabled={!edit.title || save.isPending}
            >
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <CardTitle className="min-w-0 break-words">{job.title}</CardTitle>
        <div className="flex items-center gap-2 shrink-0">
          {job.published_at && (
            <Badge className="bg-blue-100 text-blue-800 border-transparent">
              published
            </Badge>
          )}
          <Badge
            className={
              job.status === "active"
                ? "bg-green-100 text-green-800 border-transparent"
                : "bg-secondary text-secondary-foreground border-transparent"
            }
          >
            {job.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {job.location && <div>{job.location}</div>}
        {job.pay_range && <div>{job.pay_range}</div>}
        {job.description && <p className="whitespace-pre-wrap">{job.description}</p>}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => (open ? setOpen(false) : share.mutate())}
            disabled={share.isPending}
          >
            <Facebook size={14} /> {open ? "Hide" : "Publish & Share"}
          </Button>
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil size={14} /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm(`Delete "${job.title}"? This cannot be undone.`)) remove.mutate();
            }}
            disabled={remove.isPending}
          >
            <Trash2 size={14} /> {remove.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>

        {open && (
          <div className="space-y-3 mt-2 p-3 rounded-md border bg-muted/30">
            <div>
              <label className="text-xs font-medium text-foreground">
                Public apply link
              </label>
              <div className="flex gap-2 mt-1">
                <Input value={applyUrl} readOnly className="font-mono text-xs" />
                <Button size="sm" variant="outline" onClick={() => copy(applyUrl, "link")}>
                  {copied === "link" ? "✓" : <LinkIcon size={14} />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Applicants land here. All submissions appear in your Pipeline.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">
                Post message (editable)
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => publish.mutate()}
                disabled={publish.isPending || !message}
              >
                <Facebook size={14} />
                {publish.isPending ? "Publishing…" : "Publish to Facebook Page"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copy(`${message}`, "post")}
              >
                <Copy size={14} />
                {copied === "post" ? "Copied" : "Copy for Marketplace / Groups"}
              </Button>
            </div>

            {publish.data && (
              <div className="text-xs">
                {publish.data.mock ? (
                  <span className="text-amber-700">
                    Mock publish (no FB credentials set). In production this posts to
                    the live Page.
                  </span>
                ) : (
                  <a
                    href={publish.data.post_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 underline"
                  >
                    View live post on Facebook →
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
