import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export default function AccountPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile details and account preferences.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar className="size-16 rounded-xl">
            <AvatarImage src="/avatars/shadcn.jpg" alt="User" />
            <AvatarFallback className="rounded-xl text-lg">CN</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-1">
            <p className="font-medium">shadcn</p>
            <p className="text-sm text-muted-foreground">m@example.com</p>
            <p className="text-xs text-muted-foreground">Fleet Operations Manager</p>
          </div>
          <Button variant="outline" size="sm">
            Change photo
          </Button>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input id="full-name" defaultValue="shadcn" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue="m@example.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" defaultValue="+1 (555) 012-3456" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Input id="role" defaultValue="Fleet Operations Manager" readOnly />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline">Cancel</Button>
          <Button>Save changes</Button>
        </div>
      </div>
    </div>
  )
}
