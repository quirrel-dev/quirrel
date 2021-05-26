import { useGlobalSearch } from "../hooks/useGlobalSearch";
import clsx from "clsx";

export function SearchBar() {
  const [searchTerm, setSearchTerm] = useGlobalSearch();

  return (
    <div className="relative text-gray-600">
      <input
        className="bg-transparent placeholder-gray-600 border-2 border-orange-300 h-10 pl-4 pr-2 rounded-lg text-sm focus:outline-none"
        type="search"
        name="search"
        placeholder="Search"
        value={searchTerm}
        onChange={(evt) => setSearchTerm(evt.target.value)}
      />

      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        className={clsx(
          "absolute right-0 top-0 mt-3 mr-4 text-gray-600 h-4 w-4",
          !!searchTerm && "hidden"
        )}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
  );
}
