import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listInvites } from "./actions";
import { InviteForm } from "./invite-form";
import { InviteRow } from "./invite-row";

export default async function ConvitesPage() {
  const invites = await listInvites();

  return (
    <>
      <PageHeader
        title="Convites"
        description="Gere códigos de convite pra novos usuários cadastrarem-se. Sem código válido, ninguém consegue criar conta."
        actions={<InviteForm />}
      />

      <Card>
        <CardContent className="p-0">
          {invites.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum convite gerado. Clique em &quot;Gerar convite&quot; acima.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/30">
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Código</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Email lock</th>
                    <th className="px-3 py-2 font-medium">Nota</th>
                    <th className="px-3 py-2 font-medium">Criado</th>
                    <th className="px-3 py-2 font-medium">Usado em</th>
                    <th className="px-3 py-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((i) => (
                    <InviteRow key={i.id} invite={i} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
