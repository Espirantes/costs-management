"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getOrganizations, getCurrentOrganization } from "@/app/actions/organizations";
import { Building2, ChevronDown } from "lucide-react";

type Organization = {
  id: string;
  name: string;
  role: string;
};

export function OrganizationSwitcher() {
  const { data: session, update } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [orgs, current] = await Promise.all([
          getOrganizations(),
          getCurrentOrganization(),
        ]);
        setOrganizations(orgs);
        setCurrentOrg(current);
      } catch (error) {
        console.error("Failed to load organizations:", error);
      } finally {
        setLoading(false);
      }
    }

    if (session?.user?.currentOrganizationId) {
      loadData();
    }
  }, [session?.user?.currentOrganizationId]);

  async function switchOrganization(organizationId: string) {
    try {
      await update({
        currentOrganizationId: organizationId,
      });
      // Force page reload to refresh all data
      window.location.reload();
    } catch (error) {
      console.error("Failed to switch organization:", error);
    }
  }

  if (loading || !currentOrg) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline">{currentOrg.name}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => {
              if (org.id !== currentOrg.id) {
                switchOrganization(org.id);
              }
            }}
            className={org.id === currentOrg.id ? "bg-gray-100" : ""}
          >
            <div className="flex flex-col">
              <span className="font-medium">{org.name}</span>
              <span className="text-xs text-gray-500">{org.role}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
