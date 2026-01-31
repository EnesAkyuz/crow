"use client";

import { useState } from "react";
import { Key, Copy, RefreshCw, Trash2, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { generateTenantApiKey, revokeTenantApiKey } from "@/app/actions";
import { toast } from "sonner";

interface ApiKeyManagerProps {
  tenantId: string;
  tenantName: string;
  apiKeyPrefix: string | null;
  apiKeyCreatedAt: string | null;
}

export function ApiKeyManager({
  tenantId,
  tenantName,
  apiKeyPrefix,
  apiKeyCreatedAt,
}: ApiKeyManagerProps) {
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.set("tenantId", tenantId);

    const result = await generateTenantApiKey(formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.apiKey) {
      setNewKey(result.apiKey);
      setShowKey(true);
      toast.success("API key generated! Save it now.");
    }
  };

  const handleRevoke = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.set("tenantId", tenantId);

    const result = await revokeTenantApiKey(formData);
    setLoading(false);
    setConfirmRevoke(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("API key revoked");
    }
  };

  const handleCopy = async () => {
    if (newKey) {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard");
    }
  };

  const handleCloseNewKey = () => {
    setNewKey(null);
    setShowKey(false);
  };

  return (
    <div className="border border-border/50 bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Agent API Key
          </h3>
        </div>
      </div>

      <div className="p-4">
        {apiKeyPrefix ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-sm">
                  {apiKeyPrefix}••••••••••••••••
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                  Created{" "}
                  {apiKeyCreatedAt
                    ? new Date(apiKeyCreatedAt).toLocaleDateString()
                    : "Unknown"}
                </div>
              </div>
              <Badge
                variant="secondary"
                className="text-[9px] uppercase bg-green-500/10 text-green-600"
              >
                Active
              </Badge>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={loading}
                className="text-[10px] uppercase tracking-widest font-bold"
              >
                <RefreshCw className="w-3 h-3 mr-2" />
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmRevoke(true)}
                disabled={loading}
                className="text-[10px] uppercase tracking-widest font-bold text-red-500 hover:text-red-600"
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Revoke
              </Button>
            </div>

            <div className="text-[10px] text-muted-foreground bg-muted/50 p-3">
              <div className="font-bold uppercase tracking-widest mb-1">
                Endpoint
              </div>
              <code className="text-[9px]">
                GET /api/agent/extract?extractionId=xxx
              </code>
              <div className="mt-2 font-bold uppercase tracking-widest mb-1">
                Header
              </div>
              <code className="text-[9px]">
                Authorization: Bearer {apiKeyPrefix}...
              </code>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Key className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground mb-4">
              No API key generated yet
            </p>
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="text-[10px] uppercase tracking-widest font-bold"
            >
              <Key className="w-3 h-3 mr-2" />
              Generate API Key
            </Button>
          </div>
        )}
      </div>

      {/* New Key Dialog */}
      <Dialog open={!!newKey} onOpenChange={handleCloseNewKey}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest text-sm font-bold flex items-center gap-2">
              <Key className="w-4 h-4 text-green-500" />
              API Key Generated
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase tracking-widest text-red-500 font-bold">
              ⚠️ Save this key now! It cannot be retrieved again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <div className="font-mono text-xs bg-muted p-3 pr-20 break-all">
                {showKey ? newKey : "••••••••••••••••••••••••••••••••••••••••"}
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? (
                    <EyeOff className="w-3 h-3" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground space-y-2">
              <p>
                <strong>This key provides:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Authentication to the Agent API</li>
                <li>Decryption of extracted data (E2EE)</li>
                <li>Access to all extractions for {tenantName}</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCloseNewKey}
              className="text-[10px] uppercase tracking-widest font-bold"
            >
              I've Saved the Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Revoke Dialog */}
      <Dialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest text-sm font-bold text-red-500">
              Revoke API Key?
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase tracking-widest">
              This will immediately invalidate the API key. Any agents using it
              will lose access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmRevoke(false)}
              className="text-[10px] uppercase tracking-widest font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={loading}
              className="text-[10px] uppercase tracking-widest font-bold"
            >
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
