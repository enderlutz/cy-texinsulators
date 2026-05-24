import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, Applicant, STAGES, Stage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STAGE_LABELS: Record<Stage, string> = {
  new: "New",
  contacted: "Contacted",
  interview: "Interview",
  hired: "Hired",
  rejected: "Rejected",
};

export default function PipelinePage() {
  const qc = useQueryClient();
  const { data: applicants = [], isLoading } = useQuery({
    queryKey: ["applicants"],
    queryFn: () => api.listApplicants(),
  });

  const onDrop = async (stage: Stage, id: string) => {
    await api.updateApplicant(id, { stage });
    qc.invalidateQueries({ queryKey: ["applicants"] });
  };

  const grouped: Record<Stage, Applicant[]> = {
    new: [], contacted: [], interview: [], hired: [], rejected: [],
  };
  for (const a of applicants) grouped[a.stage].push(a);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <span className="text-sm text-muted-foreground">
          {isLoading ? "Loading…" : `${applicants.length} applicants`}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className="rounded-lg bg-muted/40 p-2 min-h-[400px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/applicant-id");
              if (id) onDrop(stage, id);
            }}
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="text-sm font-medium">{STAGE_LABELS[stage]}</span>
              <Badge className="bg-background">{grouped[stage].length}</Badge>
            </div>
            <div className="space-y-2">
              {grouped[stage].map((a) => (
                <ApplicantCard key={a.id} applicant={a} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplicantCard({ applicant }: { applicant: Applicant }) {
  return (
    <Link to={`/applicants/${applicant.id}`}>
      <Card
        draggable
        onDragStart={(e) => e.dataTransfer.setData("text/applicant-id", applicant.id)}
        className="cursor-grab active:cursor-grabbing hover:shadow-md transition"
      >
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-sm">{applicant.full_name || "Unnamed"}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 text-xs text-muted-foreground space-y-1">
          {applicant.phone && <div>{applicant.phone}</div>}
          {applicant.email && <div className="truncate">{applicant.email}</div>}
          <div className="flex items-center justify-between pt-1">
            <Badge className="bg-secondary text-secondary-foreground border-transparent">
              score {applicant.score}
            </Badge>
            <span className="text-[10px]">
              {new Date(applicant.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
