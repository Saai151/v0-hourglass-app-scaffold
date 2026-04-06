export function SettingsHeader() {
  return (
    <header className="border-b border-border bg-card px-8 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account and meeting preferences
          </p>
        </div>
      </div>
    </header>
  )
}
