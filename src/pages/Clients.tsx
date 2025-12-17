import { MainLayout } from "@/components/layout/MainLayout";
import { Header } from "@/components/layout/Header";
import { ClientsTable } from "@/components/clients/ClientsTable";

export default function Clients() {
  return (
    <MainLayout>
      <Header
        title="Clients"
        subtitle="Manage your client database"
        action={{ label: "Add Client", onClick: () => {} }}
      />

      <div className="p-6">
        <ClientsTable />
      </div>
    </MainLayout>
  );
}
