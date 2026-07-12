export function PagePlaceholder({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
      <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-16 text-center">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
        <p className="mt-6 text-xs text-muted-foreground">
          Dummy content — this page will be connected to live data soon.
        </p>
      </div>
    </div>
  )
}
