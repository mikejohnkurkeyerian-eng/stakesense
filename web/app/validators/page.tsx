import { listValidators } from "@/lib/api";

import ValidatorsTable from "./ValidatorsTable";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; limit?: string; offset?: string }>;
}) {
  const sp = await searchParams;
  const sort = sp.sort ?? "composite";
  const limit = Number(sp.limit ?? 200);
  const offset = Number(sp.offset ?? 0);
  const data = await listValidators({ sort, limit, offset });

  return (
    <main className="container mx-auto p-6">
      <ValidatorsTable rows={data.results} total={data.total} sort={sort} />
    </main>
  );
}
