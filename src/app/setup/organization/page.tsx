"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createOrganization } from "@/app/actions/organizations";
import { useSession } from "next-auth/react";

export default function OrganizationSetupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: session, update } = useSession();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    try {
      const name = formData.get("name") as string;

      if (!name || name.trim().length === 0) {
        setError("Organization name is required");
        setLoading(false);
        return;
      }

      const organization = await createOrganization(name.trim());

      // Update session with new organization
      await update({
        currentOrganizationId: organization.id,
      });

      // Redirect to costs page
      window.location.href = "/costs";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Setup Organization</CardTitle>
          <CardDescription>
            Create your organization to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="My Company"
                required
                disabled={loading}
                autoFocus
              />
              <p className="text-xs text-gray-500">
                You can create or join additional organizations later
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-500 text-center p-3 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Organization"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
