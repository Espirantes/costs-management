import { getUsers } from "@/app/actions/users";
import { UsersTable } from "./users-table";
import { CreateUserDialog } from "./create-user-dialog";

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-gray-600">Manage user accounts and roles</p>
        </div>
        <CreateUserDialog />
      </div>
      <UsersTable users={users} />
    </div>
  );
}
