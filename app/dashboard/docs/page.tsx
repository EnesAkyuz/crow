"use client";

import { useState } from "react";
import { Copy, Check, Lock, Key, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function CodeBlock({
  code,
  language = "bash",
}: {
  code: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-zinc-950 text-zinc-100 p-4 text-sm overflow-x-auto border border-border/50">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Documentation</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Integrate Crow into your AI agents and workflows
        </p>
      </div>

      {/* Security Overview */}
      <Card className="border-border/50 rounded-none shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Shield className="h-4 w-4" />
            End-to-End Encryption
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Crow uses <strong>AES-256-GCM</strong> encryption. Your API key
            serves dual purposes:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 border border-border/50">
              <Key className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">
                  Authentication
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Hash stored server-side. Key never saved.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border border-border/50">
              <Lock className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">
                  Encryption Key
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Derived via SHA-256 to decrypt your data.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border border-border/50">
              <Zap className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">
                  Zero Knowledge
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  We can&apos;t decrypt without your key.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card className="border-border/50 rounded-none shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">
            Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All API requests require a Bearer token in the Authorization header:
          </p>
          <CodeBlock
            code={`curl -H "Authorization: Bearer crow_your_api_key_here" \\
  https://your-domain.com/api/agent/extract?latest=true`}
          />
          <p className="text-xs text-muted-foreground">
            Generate your API key from the tenant settings page. The key is
            shown only once—store it securely.
          </p>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Card className="border-border/50 rounded-none shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">
            Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="extract" className="w-full">
            <TabsList className="rounded-none border border-border/50 bg-transparent p-0 h-auto">
              <TabsTrigger
                value="extract"
                className="rounded-none data-[state=active]:bg-muted text-xs uppercase tracking-wider px-4 py-2"
              >
                Get Extraction
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="rounded-none data-[state=active]:bg-muted text-xs uppercase tracking-wider px-4 py-2"
              >
                List Extractions
              </TabsTrigger>
              <TabsTrigger
                value="schemas"
                className="rounded-none data-[state=active]:bg-muted text-xs uppercase tracking-wider px-4 py-2"
              >
                List Schemas
              </TabsTrigger>
              <TabsTrigger
                value="sessions"
                className="rounded-none data-[state=active]:bg-muted text-xs uppercase tracking-wider px-4 py-2"
              >
                Session Status
              </TabsTrigger>
            </TabsList>

            <TabsContent value="extract" className="mt-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-green-600">
                  GET /api/agent/extract
                </p>
                <p className="text-sm text-muted-foreground">
                  Retrieve and decrypt extraction data.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider">
                  Query Parameters
                </p>
                <div className="text-sm space-y-1">
                  <p>
                    <code className="bg-muted px-1">extractionId</code> -
                    Specific extraction UUID
                  </p>
                  <p>
                    <code className="bg-muted px-1">schemaId</code> - Get latest
                    extraction for a schema
                  </p>
                  <p>
                    <code className="bg-muted px-1">latest=true</code> - Get the
                    most recent extraction
                  </p>
                </div>
              </div>

              <CodeBlock
                code={`# Get latest extraction
curl -H "Authorization: Bearer crow_xxx" \\
  "https://your-domain.com/api/agent/extract?latest=true"

# Get by schema ID
curl -H "Authorization: Bearer crow_xxx" \\
  "https://your-domain.com/api/agent/extract?schemaId=uuid-here"

# Get specific extraction
curl -H "Authorization: Bearer crow_xxx" \\
  "https://your-domain.com/api/agent/extract?extractionId=uuid-here"`}
              />

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider">
                  Response
                </p>
                <CodeBlock
                  language="json"
                  code={`{
  "success": true,
  "extraction": {
    "id": "uuid",
    "schemaId": "uuid",
    "source": "document.pdf",
    "sourceType": "document",
    "sourceUrl": null,
    "extractedAt": "2026-01-31T12:00:00Z",
    "fields": ["invoice_total", "vendor_name"]
  },
  "data": {
    "invoice_total": "$1,234.56",
    "vendor_name": "Acme Corp"
  }
}`}
                />
              </div>
            </TabsContent>

            <TabsContent value="list" className="mt-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-green-600">
                  GET /api/agent/extractions
                </p>
                <p className="text-sm text-muted-foreground">
                  List all extractions for your tenant (metadata only, no
                  decrypted data).
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider">
                  Query Parameters
                </p>
                <div className="text-sm space-y-1">
                  <p>
                    <code className="bg-muted px-1">schemaId</code> - Filter by
                    schema (optional)
                  </p>
                  <p>
                    <code className="bg-muted px-1">limit</code> - Max results
                    (default: 50)
                  </p>
                  <p>
                    <code className="bg-muted px-1">offset</code> - Pagination
                    offset
                  </p>
                </div>
              </div>

              <CodeBlock
                code={`curl -H "Authorization: Bearer crow_xxx" \\
  "https://your-domain.com/api/agent/extractions?limit=10"`}
              />
            </TabsContent>

            <TabsContent value="schemas" className="mt-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-green-600">
                  GET /api/agent/schemas
                </p>
                <p className="text-sm text-muted-foreground">
                  List all extraction schemas defined for your tenant.
                </p>
              </div>

              <CodeBlock
                code={`curl -H "Authorization: Bearer crow_xxx" \\
  "https://your-domain.com/api/agent/schemas"`}
              />

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider">
                  Response
                </p>
                <CodeBlock
                  language="json"
                  code={`{
  "success": true,
  "schemas": [
    {
      "id": "uuid",
      "name": "Invoice Schema",
      "fields": {
        "invoice_total": "string",
        "vendor_name": "string"
      },
      "extractionCount": 12
    }
  ]
}`}
                />
              </div>
            </TabsContent>

            <TabsContent value="sessions" className="mt-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-green-600">
                  GET /api/agent/sessions
                </p>
                <p className="text-sm text-muted-foreground">
                  Check the status of vault sessions (no sensitive data
                  returned).
                </p>
              </div>

              <CodeBlock
                code={`curl -H "Authorization: Bearer crow_xxx" \\
  "https://your-domain.com/api/agent/sessions"`}
              />

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider">
                  Response
                </p>
                <CodeBlock
                  language="json"
                  code={`{
  "success": true,
  "sessions": [
    {
      "id": "uuid",
      "name": "Production Login",
      "description": "Session for scraping portal",
      "status": "active",
      "expiresAt": "2026-02-15T00:00:00Z",
      "lastUsedAt": "2026-01-30T12:00:00Z",
      "isExpiringSoon": false,
      "isExpired": false
    }
  ]
}`}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* SDK Examples */}
      <Card className="border-border/50 rounded-none shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">
            SDK Examples
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="python" className="w-full">
            <TabsList className="rounded-none border border-border/50 bg-transparent p-0 h-auto">
              <TabsTrigger
                value="python"
                className="rounded-none data-[state=active]:bg-muted text-xs uppercase tracking-wider px-4 py-2"
              >
                Python
              </TabsTrigger>
              <TabsTrigger
                value="typescript"
                className="rounded-none data-[state=active]:bg-muted text-xs uppercase tracking-wider px-4 py-2"
              >
                TypeScript
              </TabsTrigger>
              <TabsTrigger
                value="curl"
                className="rounded-none data-[state=active]:bg-muted text-xs uppercase tracking-wider px-4 py-2"
              >
                cURL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="python" className="mt-4">
              <CodeBlock
                language="python"
                code={`import requests

CROW_API_KEY = "crow_your_key_here"
BASE_URL = "https://your-domain.com"

def get_latest_extraction():
    response = requests.get(
        f"{BASE_URL}/api/agent/extract",
        params={"latest": "true"},
        headers={"Authorization": f"Bearer {CROW_API_KEY}"}
    )
    response.raise_for_status()
    return response.json()

def get_extraction_by_schema(schema_id: str):
    response = requests.get(
        f"{BASE_URL}/api/agent/extract",
        params={"schemaId": schema_id},
        headers={"Authorization": f"Bearer {CROW_API_KEY}"}
    )
    response.raise_for_status()
    return response.json()

# Usage in your agent
data = get_latest_extraction()
print(f"Extracted: {data['data']}")`}
              />
            </TabsContent>

            <TabsContent value="typescript" className="mt-4">
              <CodeBlock
                language="typescript"
                code={`const CROW_API_KEY = "crow_your_key_here";
const BASE_URL = "https://your-domain.com";

async function getLatestExtraction() {
  const response = await fetch(
    \`\${BASE_URL}/api/agent/extract?latest=true\`,
    {
      headers: {
        Authorization: \`Bearer \${CROW_API_KEY}\`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(\`API error: \${response.status}\`);
  }
  
  return response.json();
}

async function getExtractionBySchema(schemaId: string) {
  const response = await fetch(
    \`\${BASE_URL}/api/agent/extract?schemaId=\${schemaId}\`,
    {
      headers: {
        Authorization: \`Bearer \${CROW_API_KEY}\`,
      },
    }
  );
  
  return response.json();
}

// Usage in your agent
const data = await getLatestExtraction();
console.log("Extracted:", data.data);`}
              />
            </TabsContent>

            <TabsContent value="curl" className="mt-4">
              <CodeBlock
                code={`# Set your API key
export CROW_API_KEY="crow_your_key_here"

# Get latest extraction
curl -s -H "Authorization: Bearer $CROW_API_KEY" \\
  "https://your-domain.com/api/agent/extract?latest=true" | jq

# List all extractions
curl -s -H "Authorization: Bearer $CROW_API_KEY" \\
  "https://your-domain.com/api/agent/extractions" | jq

# Get schemas
curl -s -H "Authorization: Bearer $CROW_API_KEY" \\
  "https://your-domain.com/api/agent/schemas" | jq`}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card className="border-border/50 rounded-none shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">
            Rate Limits & Errors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2">
                Rate Limits
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 100 requests per minute per API key</li>
                <li>• 10,000 requests per day per tenant</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2">
                Error Codes
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  <code className="bg-muted px-1">401</code> - Invalid or
                  missing API key
                </li>
                <li>
                  <code className="bg-muted px-1">404</code> - Extraction not
                  found
                </li>
                <li>
                  <code className="bg-muted px-1">429</code> - Rate limit
                  exceeded
                </li>
                <li>
                  <code className="bg-muted px-1">500</code> - Decryption failed
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
