import { Card } from "@zoracore/ui";

const widgets = [
  {
    title: "Deploy status",
    description: "CI/CD signals from GitHub Actions, Terraform, and Vercel/Workers."
  },
  {
    title: "Tenant overview",
    description: "Monitor tenant quotas, region placement, and SLA compliance."
  },
  {
    title: "Security center",
    description: "Surface CSP reports, passkey enrollment, and audit anomalies."
  }
];

export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-8 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Operations console</h1>
        <p className="text-sm text-slate-300">
          Configure tenants, monitor deployments, and review localization workflows.
        </p>
      </header>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {widgets.map((widget) => (
          <Card key={widget.title} className="bg-slate-900/60 p-6">
            <h2 className="text-xl font-semibold">{widget.title}</h2>
            <p className="mt-2 text-sm text-slate-300">{widget.description}</p>
          </Card>
        ))}
      </section>
    </main>
  );
}
