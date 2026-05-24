import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, Lang } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const T = {
  en: {
    headerHiring: "Now hiring",
    apply: "Apply now — 2 minutes",
    fullName: "Full name",
    phone: "Phone",
    phonePlaceholder: "(713) 555-1234",
    email: "Email",
    submit: "Submit application",
    submitting: "Submitting…",
    successTitle: "Application received ✓",
    successThanks: (title: string) => (
      <>Thanks for applying to <strong>{title}</strong>.</>
    ),
    successFollowUp:
      "We'll review your information and reach out by phone or text within one business day. Watch your phone for a message shortly.",
    loading: "Loading…",
    closedTitle: "Position no longer available",
    closedBody: "This job posting may have been closed. Please check back later.",
    submitError: "Something went wrong. Please try again.",
    yes: "Yes",
    no: "No",
    legal: "By submitting you agree to be contacted about this position.",
    hintYesNo: "yes / no",
    hintNumber: "number",
    required: "required",
  },
  es: {
    headerHiring: "Estamos contratando",
    apply: "Aplica ahora — 2 minutos",
    fullName: "Nombre completo",
    phone: "Teléfono",
    phonePlaceholder: "(713) 555-1234",
    email: "Correo electrónico",
    submit: "Enviar solicitud",
    submitting: "Enviando…",
    successTitle: "Solicitud recibida ✓",
    successThanks: (title: string) => (
      <>Gracias por aplicar al puesto de <strong>{title}</strong>.</>
    ),
    successFollowUp:
      "Revisaremos tu información y nos comunicaremos por teléfono o mensaje de texto en un día hábil. Pronto recibirás un mensaje en tu teléfono.",
    loading: "Cargando…",
    closedTitle: "Esta posición ya no está disponible",
    closedBody:
      "Esta oferta de trabajo puede haber cerrado. Por favor regresa más tarde.",
    submitError: "Algo salió mal. Inténtalo de nuevo.",
    yes: "Sí",
    no: "No",
    legal: "Al enviar aceptas ser contactado sobre esta posición.",
    hintYesNo: "sí / no",
    hintNumber: "número",
    required: "obligatorio",
  },
};

function detectInitialLang(qsLang: string | null): Lang {
  if (qsLang === "es" || qsLang === "en") return qsLang;
  const browser = (navigator.language || "en").toLowerCase();
  return browser.startsWith("es") ? "es" : "en";
}

export default function ApplyPage() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [lang, setLang] = useState<Lang>(detectInitialLang(searchParams.get("lang")));
  const t = T[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLanguage = (next: Lang) => {
    setLang(next);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("lang", next);
      return params;
    });
  };

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
      api.submitApplication({
        job_id: id,
        full_name,
        phone,
        email,
        answers,
        lang,
      }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {t.loading}
      </div>
    );
  }
  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>{t.closedTitle}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t.closedBody}
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
            <CardTitle>{t.successTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{t.successThanks(job.title)}</p>
            <p className="text-muted-foreground">{t.successFollowUp}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="flex justify-end gap-1">
          <LangBtn active={lang === "en"} onClick={() => setLanguage("en")}>
            EN
          </LangBtn>
          <LangBtn active={lang === "es"} onClick={() => setLanguage("es")}>
            ES
          </LangBtn>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {t.headerHiring}
            </div>
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
            <CardTitle>{t.apply}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label={t.fullName} required requiredLabel={t.required}>
              <Input value={full_name} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label={t.phone}>
              <Input
                type="tel"
                placeholder={t.phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label={t.email}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            {job.questions.length > 0 && (
              <div className="space-y-3 pt-2 border-t mt-3">
                {job.questions.map((q) => {
                  const label =
                    lang === "es" && q.question_es ? q.question_es : q.question;
                  const hint =
                    q.criteria_type === "equals"
                      ? t.hintYesNo
                      : q.criteria_type === "min" || q.criteria_type === "max"
                      ? t.hintNumber
                      : undefined;
                  return (
                    <Field key={q.id} label={label} hint={hint}>
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
                          {(["yes", "no"] as const).map((v) => (
                            <Button
                              key={v}
                              type="button"
                              size="sm"
                              variant={answers[q.field_key] === v ? "default" : "outline"}
                              onClick={() =>
                                setAnswers({ ...answers, [q.field_key]: v })
                              }
                            >
                              {v === "yes" ? t.yes : t.no}
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
                  );
                })}
              </div>
            )}

            {submit.isError && (
              <div className="text-sm text-destructive">{t.submitError}</div>
            )}
            <Button
              className="w-full"
              size="lg"
              disabled={!full_name || submit.isPending}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? t.submitting : t.submit}
            </Button>
            <p className="text-xs text-muted-foreground text-center">{t.legal}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LangBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "text-xs px-3 py-1 rounded-md border transition " +
        (active
          ? "bg-foreground text-background border-foreground"
          : "bg-background text-foreground hover:bg-accent")
      }
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  required,
  requiredLabel,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  requiredLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label}{" "}
        {required && (
          <span className="text-destructive">
            * {requiredLabel && <span className="text-xs">({requiredLabel})</span>}
          </span>
        )}
        {hint && (
          <span className="text-xs text-muted-foreground ml-1">({hint})</span>
        )}
      </label>
      {children}
    </div>
  );
}
