// Renders skeleton rows that preserve table layout while data loads.
// Widths vary per column so it reads as content, not a flat block.
export default function TableSkeleton({ rows = 6, widths }: { rows?: number; widths: (number | string)[] }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} aria-hidden="true">
          {widths.map((w, c) => (
            <td key={c}>
              <span
                className="skeleton skel-line"
                style={{ width: typeof w === 'number' ? `${w}%` : w }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
