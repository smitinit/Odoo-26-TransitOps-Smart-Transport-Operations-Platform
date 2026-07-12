import { BellIcon, TruckIcon, WrenchIcon, FuelIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const notifications = [
  {
    id: 1,
    title: "Trip TR-2041 completed",
    body: "Driver Amit completed the Mumbai → Pune route. Delivery confirmed.",
    time: "12 min ago",
    unread: true,
    icon: TruckIcon,
  },
  {
    id: 2,
    title: "Maintenance due: MH-12-AB-4410",
    body: "Oil change scheduled for tomorrow at 10:00 AM.",
    time: "1 hour ago",
    unread: true,
    icon: WrenchIcon,
  },
  {
    id: 3,
    title: "Fuel expense submitted",
    body: "₹4,850 logged for vehicle GJ-01-CD-2291 pending approval.",
    time: "3 hours ago",
    unread: false,
    icon: FuelIcon,
  },
  {
    id: 4,
    title: "Driver license expiring",
    body: "Priya Shah’s license expires in 14 days. Reminder sent.",
    time: "Yesterday",
    unread: false,
    icon: BellIcon,
  },
]

export default function NotificationsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stay on top of trips, maintenance, and expense alerts.
          </p>
        </div>
        <Button variant="outline" size="sm">
          Mark all as read
        </Button>
      </div>

      <div className="divide-y rounded-xl border bg-card">
        {notifications.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.id}
              className="flex gap-4 px-4 py-4 sm:px-6"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  {item.unread && <Badge variant="secondary">New</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">{item.time}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
