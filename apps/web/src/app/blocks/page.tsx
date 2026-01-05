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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Pool Blocks</h1>
        <span className="text-gray-400">Total: {total} blocks</span>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 bg-gray-900">
              <th className="text-left px-4 py-3">Height</th>
              <th className="text-left px-4 py-3">Hash</th>
              <th className="text-left px-4 py-3">Reward</th>
              <th className="text-left px-4 py-3">Found By</th>
              <th className="text-left px-4 py-3">Miners Paid</th>
              <th className="text-left px-4 py-3">Confirmations</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) => (
              <tr
                key={block.id}
                className="border-t border-gray-700 hover:bg-gray-700/30"
              >
                <td className="px-4 py-3 font-mono">{block.height}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  <a
                    href={`/blocks/${block.hash}`}
                    className="text-blue-400 hover:underline"
                  >
                    {block.hash.slice(0, 20)}...
                  </a>
                </td>
                <td className="px-4 py-3">{formatTetsuo(block.reward)} TETSUO</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {block.foundByUser?.address.slice(0, 12)}...
                </td>
                <td className="px-4 py-3">{block._count.rewards}</td>
                <td className="px-4 py-3">{block.confirmations}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      block.status === "CONFIRMED"
                        ? "bg-green-900 text-green-300"
                        : block.status === "PENDING"
                        ? "bg-yellow-900 text-yellow-300"
                        : "bg-red-900 text-red-300"
                    }`}
                  >
                    {block.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">
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
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <a
              href={`/blocks?page=${page - 1}`}
              className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700"
            >
              Previous
            </a>
          )}
          <span className="px-4 py-2">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <a
              href={`/blocks?page=${page + 1}`}
              className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
