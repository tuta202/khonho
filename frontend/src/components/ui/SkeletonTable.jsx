export default function SkeletonTable({ cols = 5, rows = 5 }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="skeleton h-3 w-24 rounded" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, ri) => (
            <tr key={ri} className="border-t">
              {Array.from({ length: cols }).map((_, ci) => (
                <td key={ci} className="px-4 py-3">
                  <div className="skeleton h-3 rounded" style={{ width: `${60 + (ci * 17) % 40}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
