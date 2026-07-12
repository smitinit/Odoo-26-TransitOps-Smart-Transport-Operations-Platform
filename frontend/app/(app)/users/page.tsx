"use client"

import * as React from "react"
import { toast } from "sonner"
import { PlusIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { AdminGuard } from "@/components/auth/admin-guard"
import { useAuth } from "@/components/auth/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ApiError,
  createUser,
  deleteUser,
  listRoles,
  listUsers,
  updateUser,
  type Role,
  type User,
} from "@/lib/api"

type FormState = {
  email: string
  first_name: string
  last_name: string
  password: string
  role_id: string
  is_active: boolean
  is_superuser: boolean
}

const emptyForm: FormState = {
  email: "",
  first_name: "",
  last_name: "",
  password: "",
  role_id: "",
  is_active: true,
  is_superuser: false,
}

function UsersManagementPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = React.useState<User[]>([])
  const [roles, setRoles] = React.useState<Role[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<User | null>(null)
  const [form, setForm] = React.useState<FormState>(emptyForm)

  const roleNameById = new Map(roles.map((role) => [role.id, role.name]))
  const roleItems = [
    { label: "No role", value: "none" },
    ...roles.map((role) => ({ label: role.name, value: role.id })),
  ]

  async function loadData() {
    setLoading(true)
    try {
      const [usersData, rolesData] = await Promise.all([listUsers(), listRoles()])
      setUsers(usersData)
      setRoles(rolesData)
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to load users"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void loadData()
  }, [])

  function openCreate() {
    setEditingUser(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(user: User) {
    setEditingUser(user)
    setForm({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      password: "",
      role_id: user.role_id ?? "none",
      is_active: user.is_active,
      is_superuser: user.is_superuser,
    })
    setSheetOpen(true)
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const roleId =
        form.role_id && form.role_id !== "none" ? form.role_id : null

      if (editingUser) {
        const payload: Parameters<typeof updateUser>[1] = {
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          is_active: form.is_active,
          is_superuser: form.is_superuser,
          role_id: roleId,
        }
        if (form.password.trim()) {
          payload.password = form.password
        }
        await updateUser(editingUser.id, payload)
        toast.success("User updated")
      } else {
        if (form.password.length < 8) {
          toast.error("Password must be at least 8 characters")
          setSaving(false)
          return
        }
        await createUser({
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          password: form.password,
          is_active: form.is_active,
          is_superuser: form.is_superuser,
          role_id: roleId,
        })
        toast.success("User created")
      }

      setSheetOpen(false)
      await loadData()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to save user"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(user: User) {
    try {
      await updateUser(user.id, { is_active: !user.is_active })
      toast.success(user.is_active ? "User deactivated" : "User activated")
      await loadData()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to update user"
      toast.error(message)
    }
  }

  async function handleDelete(user: User) {
    if (user.id === currentUser?.id) {
      toast.error("You cannot delete your own account")
      return
    }
    const confirmed = window.confirm(
      `Delete ${user.first_name} ${user.last_name}? This cannot be undone from the UI.`
    )
    if (!confirmed) return

    try {
      await deleteUser(user.id)
      toast.success("User deleted")
      await loadData()
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to delete user"
      toast.error(message)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            User management
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, update, and manage accounts. Admin access only.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon />
          Add user
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading users...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">
                      {user.first_name} {user.last_name}
                    </div>
                    {user.is_superuser ? (
                      <Badge variant="secondary" className="mt-1">
                        Superuser
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    {user.role_id
                      ? (roleNameById.get(user.role_id) ?? "Unknown")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "default" : "outline"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(user)}
                      >
                        <PencilIcon />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleToggleActive(user)}
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={user.id === currentUser?.id}
                        onClick={() => void handleDelete(user)}
                        aria-label={`Delete ${user.email}`}
                      >
                        <Trash2Icon className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingUser ? "Edit user" : "Create user"}
            </SheetTitle>
            <SheetDescription>
              {editingUser
                ? "Update profile, role, and access settings."
                : "Add a new account and optionally assign a role."}
            </SheetDescription>
          </SheetHeader>

          <form
            id="user-form"
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <div className="grid gap-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                required
                value={form.first_name}
                onChange={(e) => updateField("first_name", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                required
                value={form.last_name}
                onChange={(e) => updateField("last_name", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">
                Password
                {editingUser ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    (leave blank to keep)
                  </span>
                ) : null}
              </Label>
              <Input
                id="password"
                type="password"
                minLength={editingUser ? undefined : 8}
                required={!editingUser}
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={form.role_id || "none"}
                onValueChange={(value) =>
                  updateField("role_id", value ?? "none")
                }
                items={roleItems}
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">No role</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="is_active"
                type="checkbox"
                className="size-4 rounded border"
                checked={form.is_active}
                onChange={(e) => updateField("is_active", e.target.checked)}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="is_superuser"
                type="checkbox"
                className="size-4 rounded border"
                checked={form.is_superuser}
                onChange={(e) => updateField("is_superuser", e.target.checked)}
              />
              <Label htmlFor="is_superuser">Superuser (admin)</Label>
            </div>
          </form>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" form="user-form" disabled={saving}>
              {saving
                ? "Saving..."
                : editingUser
                  ? "Save changes"
                  : "Create user"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default function UsersPage() {
  return (
    <AdminGuard>
      <UsersManagementPage />
    </AdminGuard>
  )
}
