import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Facebook, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: status } = useQuery({
    queryKey: ["fb-status"],
    queryFn: api.fbStatus,
  });

  const [pageId, setPageId] = useState("");
  const [token, setToken] = useState("");

  const connect = useMutation({
    mutationFn: () => api.fbConnect(pageId.trim(), token.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fb-status"] });
      setPageId("");
      setToken("");
    },
  });

  const test = useMutation({
    mutationFn: api.fbTest,
  });

  const disconnect = useMutation({
    mutationFn: api.fbDisconnect,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fb-status"] });
      test.reset();
    },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook size={18} /> Facebook Page
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            {status?.connected ? (
              <Badge className="bg-green-100 text-green-800 border-transparent gap-1">
                <CheckCircle2 size={12} /> Connected
              </Badge>
            ) : (
              <Badge className="bg-secondary text-secondary-foreground border-transparent gap-1">
                <XCircle size={12} /> Not connected
              </Badge>
            )}
            {status?.source === "env" && (
              <Badge className="bg-amber-100 text-amber-800 border-transparent">
                via env var
              </Badge>
            )}
          </div>

          {status?.connected && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Page:</span>{" "}
                <strong>{status.page_name || "—"}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Page ID:</span>{" "}
                <code className="text-xs">{status.page_id}</code>
              </div>
              {status.connected_at && (
                <div className="text-xs text-muted-foreground">
                  Connected{" "}
                  {new Date(status.connected_at).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {status?.connected && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => test.mutate()}
                disabled={test.isPending}
              >
                {test.isPending ? "Testing…" : "Test connection"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
              </Button>
            </div>
          )}

          {test.data && (
            <div
              className={`text-sm rounded-md p-2 ${
                test.data.ok
                  ? "bg-green-50 text-green-800"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {test.data.ok
                ? `✓ Token still valid for ${test.data.page_name}`
                : `✗ ${test.data.error || "Token invalid"}`}
            </div>
          )}

          <div className="border-t pt-4 space-y-3">
            <div className="text-sm font-medium">
              {status?.connected ? "Update credentials" : "Connect a Facebook Page"}
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Page ID</label>
              <Input
                placeholder="123456789012345"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Page Access Token (long-lived)
              </label>
              <Textarea
                rows={4}
                placeholder="EAAB... (paste here)"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            {connect.isError && (
              <div className="text-sm text-destructive rounded-md bg-destructive/10 p-2">
                ✗ {(connect.error as Error)?.message || "Validation failed"}
              </div>
            )}

            <Button
              onClick={() => connect.mutate()}
              disabled={!pageId.trim() || !token.trim() || connect.isPending}
            >
              {connect.isPending
                ? "Validating…"
                : status?.connected
                ? "Update connection"
                : "Connect Page"}
            </Button>

            <div className="text-xs text-muted-foreground pt-2 space-y-1">
              <p>How to generate a Page Access Token:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>
                  Open{" "}
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 underline inline-flex items-center gap-0.5"
                  >
                    Graph API Explorer <ExternalLink size={10} />
                  </a>
                </li>
                <li>Select your Meta App + click "Get User Access Token"</li>
                <li>
                  Check: <code>pages_show_list</code>,{" "}
                  <code>pages_read_engagement</code>,{" "}
                  <code>pages_manage_posts</code>
                </li>
                <li>Log in as the Page admin → approve → swap dropdown to the Page</li>
                <li>Copy that token, exchange for long-lived (curl), paste here</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
