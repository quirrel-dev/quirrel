interface TableRow<T> {
  title: string;
  render: (v: T) => React.ReactChild;
}

interface TableProps<T> {
  items: T[];
  extractKey: (item: T) => string;
  columns: TableRow<T>[];
  endOfRow?: (v: T) => React.ReactChild;
}

export function Table<T>(props: TableProps<T>) {
  const { items, columns, endOfRow, extractKey } = props;
  return (
    <div className="flex flex-col">
      <div className="-my-2 overflow-x-auto lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full md:px-4">
          <div className="shadow overflow-hidden border-b border-gray-200 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  {columns.map(({ title }) => (
                    <th
                      key={title}
                      className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {title}
                    </th>
                  ))}
                  {endOfRow && <th className="px-6 py-3 bg-gray-50"></th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={extractKey(item)}>
                    {columns.map((col) => {
                      let child = col.render(item);

                      if (typeof child === "string") {
                        child = (
                          <div className="text-sm leading-5 text-gray-900">
                            {col.render(item)}
                          </div>
                        );
                      }

                      return (
                        <td key={col.title} className="px-6 py-4 whitespace-no-wrap">
                          {child}
                        </td>
                      );
                    })}

                    {endOfRow && (
                      <td className="px-6 py-4 whitespace-no-wrap text-right text-sm leading-5 font-medium">
                        {endOfRow(item)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
