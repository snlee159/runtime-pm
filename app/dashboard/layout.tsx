import { Navigation } from "@/components/navigation";
import { ClientDateProvider } from "./client-date-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <ClientDateProvider>{children}</ClientDateProvider>
      </main>
    </div>
  );
}

