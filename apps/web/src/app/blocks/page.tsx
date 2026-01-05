import { prisma } from "@tetsuo-pool/database";
import { formatTetsuo } from "@tetsuo-pool/shared";
import { AddressLink } from "../components/AddressLink";

// Force dynamic rendering - don't cache this page
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getBlocks(page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [blocks, total] = await Promise.all([
    prisma.block.findMany({
      skip,
      take: limit,
      orderBy: { foundAt: "desc" },
      include: {
        foundByUser: true,
        _count: { select: { rewards: true } },
      },
    }),
    prisma.block.count(),
  ]);

  return { blocks, total, pages: Math.ceil(total / limit) };
}

export default async function BlocksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const { blocks, total, pages } = await getBlocks(page);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Pool Blocks</h1>
        <span className="text-[--text-muted] text-sm uppercase tracking-wide font-bold">Total: {total} blocks</span>
      </div>

      <div className="manga-card overflow-hidden overflow-x-auto">
        <table className="w-full text-xs md:text-sm min-w-[600px] manga-table">
          <thead>
            <tr>
              <th className="text-left px-3 md:px-4 py-2 md:py-3">Height</th>
              <th className="text-left px-3 md:px-4 py-2 md:py-3">Hash</th>
              <th className="text-left px-3 md:px-4 py-2 md:py-3">Reward</th>
              <th className="text-left px-3 md:px-4 py-2 md:py-3 hidden md:table-cell">Found By</th>
              <th className="text-left px-3 md:px-4 py-2 md:py-3 hidden md:table-cell">Miners</th>
              <th className="text-left px-3 md:px-4 py-2 md:py-3">Conf</th>
              <th className="text-left px-3 md:px-4 py-2 md:py-3">Status</th>
              <th className="text-left px-3 md:px-4 py-2 md:py-3 hidden md:table-cell">Time</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) => (
              <tr key={block.id}>
                <td className="px-3 md:px-4 py-2 md:py-3 font-mono font-bold">{block.height}</td>
                <td className="px-3 md:px-4 py-2 md:py-3 font-mono text-xs">
                  <a
                    href={`/blocks/${block.hash}`}
                    className="hover:underline font-bold"
                  >
                    {block.hash.slice(0, 12)}...
                  </a>
                </td>
                <td className="px-3 md:px-4 py-2 md:py-3 whitespace-nowrap font-bold">{formatTetsuo(block.reward)}</td>
                <td className="px-3 md:px-4 py-2 md:py-3 hidden md:table-cell">
                  {block.foundByUser && <AddressLink address={block.foundByUser.address} />}
                </td>
                <td className="px-3 md:px-4 py-2 md:py-3 hidden md:table-cell font-bold">{block._count.rewards}</td>
                <td className="px-3 md:px-4 py-2 md:py-3 font-bold">{block.confirmations}</td>
                <td className="px-3 md:px-4 py-2 md:py-3">
                  <span
                    className={`px-2 py-1 text-xs font-bold uppercase ${
                      block.status === "CONFIRMED"
                        ? "badge-confirmed"
                        : block.status === "PENDING"
                        ? "badge-pending"
                        : "badge-orphaned"
                    }`}
                  >
                    {block.status.slice(0, 4)}
                  </span>
                </td>
                <td className="px-3 md:px-4 py-2 md:py-3 text-[--text-muted] hidden md:table-cell">
                  {block.foundAt.toLocaleString()}
                </td>
              </tr>
            ))}
            {blocks.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[--text-muted] uppercase font-bold">
                  No blocks found yet. Keep mining!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center items-center gap-2 text-sm">
          {page > 1 && (
            <a
              href={`/blocks?page=${page - 1}`}
              className="px-4 py-2 border-2 border-[--border] font-bold uppercase hover:bg-[--bg-secondary] transition-colors"
            >
              Prev
            </a>
          )}
          <span className="px-4 py-2 text-[--text-muted] font-bold">
            {page}/{pages}
          </span>
          {page < pages && (
            <a
              href={`/blocks?page=${page + 1}`}
              className="px-4 py-2 border-2 border-[--border] font-bold uppercase hover:bg-[--bg-secondary] transition-colors"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
