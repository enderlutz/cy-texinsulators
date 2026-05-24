import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, STAGES, Stage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function ApplicantPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { data: applicant } = useQuery({
    queryKey: ["applicant", id],
    queryFn: () => api.getApplicant(id),
    enabled: !!id,
  });

  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const sendMsg = useMutation({
    mutationFn: () => api.sendMessage(id, { channel, body, subject }),
    onSuccess: () => {
      setBody("");
      setSubject("");
      qc.invalidateQueries({ queryKey: ["applicant", id] });
    },
  });

  const updateStage = useMutation({
    mutationFn: (stage: Stage) => api.updateApplicant(id, { stage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applicant", id] }),
  });

  if (!applicant) return <div>Loading…</div>;

  return (
    <div className="max-w-3xl space-y-4">
      <Link to="/pipeline" className="text-sm text-muted-foreground hover:underline">
        ← Back to pipeline
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{applicant.full_name || "Unnamed applicant"}</span>
            <Badge className="bg-secondary text-secondary-foreground border-transparent">
              score {applicant.score}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {applicant.phone && <div>📞 {applicant.phone}</div>}
          {applicant.email && <div>✉ {applicant.email}</div>}
          <div className="text-xs text-muted-foreground">
            Source: {applicant.source} · Created{" "}
            {new Date(applicant.created_at).toLocaleString()}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {STAGES.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={applicant.stage === s ? "default" : "outline"}
                onClick={() => updateStage.mutate(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {applicant.raw_lead_data && (
        <Card>
          <CardHeader>
            <CardTitle>Lead form responses</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(applicant.raw_lead_data).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase text-muted-foreground">{k}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Send message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={channel === "sms" ? "default" : "outline"}
              onClick={() => setChannel("sms")}
            >
              SMS
            </Button>
            <Button
              size="sm"
              variant={channel === "email" ? "default" : "outline"}
              onClick={() => setChannel("email")}
            >
              Email
            </Button>
          </div>
          {channel === "email" && (
            <Input
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          )}
          <Textarea
            placeholder="Message…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
          />
          <Button disabled={!body || sendMsg.isPending} onClick={() => sendMsg.mutate()}>
            {sendMsg.isPending ? "Sending…" : `Send ${channel.toUpperCase()}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
