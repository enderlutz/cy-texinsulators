import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ApplyPage() {
  const { id = "" } = useParams();
  const { data: job, isLoading, error } = useQuery({
    queryKey: ["public-job", id],
    queryFn: () => api.publicJob(id),
    enabled: !!id,
    retry: false,
  });

  const [full_name, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const submit = useMutation({
    mutationFn: () =>
      api.submitApplication({ job_id: id, full_name, phone, email, answers }),
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }
  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Position no longer available</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This job posting may have been closed. Please check back later.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submit.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Application received ✓</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Thanks for applying to <strong>{job.title}</strong>.</p>
            <p className="text-muted-foreground">
              We'll review your information and reach out by phone or email within
              one business day. Check for a text shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{job.title}</CardTitle>
            <div className="text-sm text-muted-foreground space-y-0.5 pt-1">
              {job.location && <div>📍 {job.location}</div>}
              {job.pay_range && <div>💰 {job.pay_range}</div>}
            </div>
          </CardHeader>
          {job.description && (
            <CardContent className="text-sm whitespace-pre-wrap">
              {job.description}
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Apply now — 2 minutes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Full name" required>
              <Input value={full_name} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                placeholder="(713) 555-1234"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            {job.questions.length > 0 && (
              <div className="space-y-3 pt-2 border-t mt-3">
                {job.questions.map((q) => (
                  <Field key={q.id} label={q.question} hint={hintFor(q.criteria_type)}>
                    {q.criteria_type === "min" || q.criteria_type === "max" ? (
                      <Input
                        type="number"
                        value={answers[q.field_key] || ""}
                        onChange={(e) =>
                          setAnswers({ ...answers, [q.field_key]: e.target.value })
                        }
                      />
                    ) : q.criteria_type === "equals" ? (
                      <div className="flex gap-2">
                        {["yes", "no"].map((v) => (
                          <Button
                            key={v}
                            type="button"
                            size="sm"
                            variant={answers[q.field_key] === v ? "default" : "outline"}
                            onClick={() =>
                              setAnswers({ ...answers, [q.field_key]: v })
                            }
                          >
                            {v}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <Textarea
                        rows={2}
                        value={answers[q.field_key] || ""}
                        onChange={(e) =>
                          setAnswers({ ...answers, [q.field_key]: e.target.value })
                        }
                      />
                    )}
                  </Field>
                ))}
              </div>
            )}

            {submit.isError && (
              <div className="text-sm text-destructive">
                Something went wrong. Please try again.
              </div>
            )}
            <Button
              className="w-full"
              size="lg"
              disabled={!full_name || submit.isPending}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? "Submitting…" : "Submit application"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              By submitting you agree to be contacted about this position.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
        {hint && <span className="text-xs text-muted-foreground ml-1">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function hintFor(ctype: string): string | undefined {
  if (ctype === "equals") return "yes / no";
  if (ctype === "min" || ctype === "max") return "number";
  return undefined;
}
