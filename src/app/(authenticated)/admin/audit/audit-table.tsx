"use client";

import { useState } from "react";
import { getAuditLogs } from "@/app/actions/audit";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type AuditLog = {
  id: string;
  userId: string;
  user: {
    email: string;
    name: string | null;
  };
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: Date;
};

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  LOGIN: "bg-purple-100 text-purple-800",
  LOGIN_FAILED: "bg-red-100 text-red-800",
  LOGOUT: "bg-gray-100 text-gray-800",
};

const entityColors: Record<string, string> = {
  User: "bg-indigo-100 text-indigo-800",
  Category: "bg-yellow-100 text-yellow-800",
  CostItem: "bg-orange-100 text-orange-800",
  CostEntry: "bg-cyan-100 text-cyan-800",
  Session: "bg-pink-100 text-pink-800",
};

export function AuditTable({
  initialLogs,
  total,
}: {
  initialLogs: AuditLog[];
  total: number;
}) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(initialLogs.length < total);
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");

  async function loadMore() {
    setLoading(true);
    const newOffset = offset + 50;
    const result = await getAuditLogs({
      limit: 50,
      offset: newOffset,
      entity: filterEntity !== "all" ? filterEntity : undefined,
      action: filterAction !== "all" ? filterAction : undefined,
    });
    setLogs([...logs, ...result.logs]);
    setOffset(newOffset);
    setHasMore(result.hasMore);
    setLoading(false);
  }

  async function applyFilters() {
    setLoading(true);
    setOffset(0);
    const result = await getAuditLogs({
      limit: 50,
      offset: 0,
      entity: filterEntity !== "all" ? filterEntity : undefined,
      action: filterAction !== "all" ? filterAction : undefined,
    });
    setLogs(result.logs);
    setHasMore(result.hasMore);
    setLoading(false);
  }

  function formatValue(value: unknown): string {
    if (!value) return "-";
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleString("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium">Entity</label>
          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="User">User</SelectItem>
              <SelectItem value="Category">Category</SelectItem>
              <SelectItem value="CostItem">CostItem</SelectItem>
              <SelectItem value="CostEntry">CostEntry</SelectItem>
              <SelectItem value="Session">Session</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Action</label>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="CREATE">Create</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
              <SelectItem value="LOGIN">Login</SelectItem>
              <SelectItem value="LOGIN_FAILED">Login Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={applyFilters} disabled={loading}>
          Apply Filters
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Date</TableHead>
              <TableHead className="w-48">User</TableHead>
              <TableHead className="w-28">Action</TableHead>
              <TableHead className="w-28">Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm text-gray-600">
                  {formatDate(log.createdAt)}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{log.user.name || "-"}</p>
                    <p className="text-xs text-gray-500">{log.user.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={actionColors[log.action] || "bg-gray-100"}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={entityColors[log.entity] || ""}>
                    {log.entity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-gray-600 max-w-md">
                    {log.oldValue ? (
                      <div className="mb-1">
                        <span className="font-medium text-red-600">Old: </span>
                        <code className="bg-gray-100 px-1 rounded">
                          {formatValue(log.oldValue)}
                        </code>
                      </div>
                    ) : null}
                    {log.newValue ? (
                      <div>
                        <span className="font-medium text-green-600">New: </span>
                        <code className="bg-gray-100 px-1 rounded">
                          {formatValue(log.newValue)}
                        </code>
                      </div>
                    ) : null}
                    {!log.oldValue && !log.newValue ? (
                      <span className="text-gray-400">-</span>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No audit logs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="text-center">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
