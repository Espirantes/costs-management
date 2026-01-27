"use client";

import { useState } from "react";
import { Role } from "@prisma/client";
import { updateUser, resetPassword, deleteUser } from "@/app/actions/users";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
};

export function UsersTable({ users }: { users: User[] }) {
  return (
    <div className="border rounded-lg bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function UserRow({ user }: { user: User }) {
  const [loading, setLoading] = useState(false);

  async function handleRoleChange(role: Role) {
    setLoading(true);
    try {
      await updateUser(user.id, { role });
      toast.success("Role updated");
    } catch (error) {
      toast.error("Failed to update role");
    }
    setLoading(false);
  }

  async function handleToggleActive() {
    setLoading(true);
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      toast.success(user.isActive ? "User deactivated" : "User activated");
    } catch (error) {
      toast.error("Failed to update user");
    }
    setLoading(false);
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{user.email}</TableCell>
      <TableCell>{user.name || "-"}</TableCell>
      <TableCell>
        <Select
          value={user.role}
          onValueChange={(value) => handleRoleChange(value as Role)}
          disabled={loading}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="USER">User</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Badge variant={user.isActive ? "default" : "secondary"}>
          {user.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>{user.createdAt.toLocaleDateString()}</TableCell>
      <TableCell className="text-right space-x-2">
        <ResetPasswordDialog userId={user.id} userEmail={user.email} />
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleActive}
          disabled={loading}
        >
          {user.isActive ? "Deactivate" : "Activate"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ResetPasswordDialog({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(userId, password);
      toast.success("Password reset successfully");
      setOpen(false);
      setPassword("");
    } catch (error) {
      toast.error("Failed to reset password");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Reset Password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password for {userEmail}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
