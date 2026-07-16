import Link from "next/link";
import { LuArrowLeft, LuArrowRight } from "react-icons/lu";

type PaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  itemLabel: string;
  hrefFor: (page: number) => string;
};

const pad = (n: number) => String(n).padStart(2, "0");

// Window: first + last + current ±1; null marks a collapsed gap.
function pageWindow(page: number, totalPages: number): (number | null)[] {
  const pages: (number | null)[] = [];
  let last = 0;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      if (last && p - last > 1) pages.push(null);
      pages.push(p);
      last = p;
    }
  }
  return pages;
}

const CELL =
  "min-w-9 h-9 px-2 inline-flex items-center justify-center font-label text-xs uppercase tracking-widest";
const IDLE =
  "border border-outline-variant bg-surface-container text-on-surface-variant hover:border-primary hover:text-primary transition-colors";
const ACTIVE = "border border-primary text-primary bg-primary/5";
const DISABLED = "border border-outline-variant/40 text-outline-variant";

const Pagination = ({
  page,
  totalPages,
  totalItems,
  itemLabel,
  hrefFor,
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-12 border-t border-outline-variant/50 pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-label text-[10px] uppercase tracking-widest text-outline">
        Page {pad(page)} / {pad(totalPages)} · {totalItems} {itemLabel}
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={`${CELL} gap-2 ${IDLE}`}>
            <LuArrowLeft aria-hidden />
            <span className="hidden sm:inline">Prev</span>
          </Link>
        ) : (
          <span aria-disabled="true" className={`${CELL} gap-2 ${DISABLED}`}>
            <LuArrowLeft aria-hidden />
            <span className="hidden sm:inline">Prev</span>
          </span>
        )}
        {pageWindow(page, totalPages).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className={`${CELL} text-outline-variant`}>
              …
            </span>
          ) : p === page ? (
            <span key={p} aria-current="page" className={`${CELL} ${ACTIVE}`}>
              {pad(p)}
            </span>
          ) : (
            <Link key={p} href={hrefFor(p)} className={`${CELL} ${IDLE}`}>
              {pad(p)}
            </Link>
          ),
        )}
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className={`${CELL} gap-2 ${IDLE}`}>
            <span className="hidden sm:inline">Next</span>
            <LuArrowRight aria-hidden />
          </Link>
        ) : (
          <span aria-disabled="true" className={`${CELL} gap-2 ${DISABLED}`}>
            <span className="hidden sm:inline">Next</span>
            <LuArrowRight aria-hidden />
          </span>
        )}
      </nav>
    </div>
  );
};

export default Pagination;
