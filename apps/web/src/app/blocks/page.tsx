import { prisma } from "@tetsuo-pool/database";
import { formatTetsuo } from "@tetsuo-pool/shared";

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
        <h1 className="text-2xl md:text-3xl font-bold">Pool Blocks</h1>
        <span className="text-gray-400 text-sm">Total: {total} blocks</span>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-xs md:text-sm min-w-[600px]">
          <thead>
            <tr className="text-gray-400 bg-gray-900">
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
              <tr
                key={block.id}
                className="border-t border-gray-700 hover:bg-gray-700/30"
              >
                <td className="px-3 md:px-4 py-2 md:py-3 font-mono">{block.height}</td>
                <td className="px-3 md:px-4 py-2 md:py-3 font-mono text-xs">
                  <a
                    href={`/blocks/${block.hash}`}
                    className="text-blue-400 hover:underline"
                  >
                    {block.hash.slice(0, 12)}...
                  </a>
                </td>
                <td className="px-3 md:px-4 py-2 md:py-3 whitespace-nowrap">{formatTetsuo(block.reward)}</td>
                <td className="px-3 md:px-4 py-2 md:py-3 font-mono text-xs hidden md:table-cell">
                  {block.foundByUser?.address.slice(0, 12)}...
                </td>
                <td className="px-3 md:px-4 py-2 md:py-3 hidden md:table-cell">{block._count.rewards}</td>
                <td className="px-3 md:px-4 py-2 md:py-3">{block.confirmations}</td>
                <td className="px-3 md:px-4 py-2 md:py-3">
                  <span
                    className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs ${
                      block.status === "CONFIRMED"
                        ? "bg-green-900 text-green-300"
                        : block.status === "PENDING"
                        ? "bg-yellow-900 text-yellow-300"
                        : "bg-red-900 text-red-300"
                    }`}
                  >
                    {block.status.slice(0, 4)}
                  </span>
                </td>
                <td className="px-3 md:px-4 py-2 md:py-3 text-gray-400 hidden md:table-cell">
                  {block.foundAt.toLocaleString()}
                </td>
              </tr>
            ))}
            {blocks.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
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
              className="px-3 md:px-4 py-2 bg-gray-800 rounded hover:bg-gray-700"
            >
              Prev
            </a>
          )}
          <span className="px-3 md:px-4 py-2 text-gray-400">
            {page}/{pages}
          </span>
          {page < pages && (
            <a
              href={`/blocks?page=${page + 1}`}
              className="px-3 md:px-4 py-2 bg-gray-800 rounded hover:bg-gray-700"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
