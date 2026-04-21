"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TopNavItem = {
  href: string;
  label: string;
};

type TopNavProps = {
  items: TopNavItem[];
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav({ items }: TopNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "rounded-xl border px-4 py-2 text-sm font-medium transition",
              active
                ? "border-sky-500 bg-sky-500 text-white shadow-sm"
                : "border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}