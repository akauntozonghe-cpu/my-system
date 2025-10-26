{items.length > 0 && (
  <table className="w-full border mt-4">
    <thead>
      <tr>
        <th className="border px-2 py-1">商品</th>
        <th className="border px-2 py-1">予定数量</th>
        <th className="border px-2 py-1">実棚数量</th>
        <th className="border px-2 py-1">差分</th>
      </tr>
    </thead>
    <tbody>
      {items.map((item) => {
        const expected = item.expectedQty ?? 0;
        const counted = item.countedQty ?? null;
        const diff = counted !== null ? counted - expected : null;

        return (
          <tr key={item.id}>
            <td className="border px-2 py-1">{item.name}</td>
            <td className="border px-2 py-1">{expected}</td>
            <td className="border px-2 py-1">
              <input
                type="number"
                className="border p-1 w-20"
                value={counted ?? ""}
                onChange={(e) =>
                  handleCountChange(item.id, Number(e.target.value))
                }
              />
            </td>
            <td className="border px-2 py-1">
              {diff !== null ? (
                <span
                  className={
                    diff === 0
                      ? "text-gray-600"
                      : diff > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {diff > 0 ? "+" : ""}
                  {diff}
                </span>
              ) : (
                "-"
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
)}