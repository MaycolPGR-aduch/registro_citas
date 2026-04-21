"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

type TopNavProps = {
  items: NavItem[];
};

export function TopNav({ items }: TopNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {items.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl border px-3 py-1.5 font-medium transition ${
              isActive
                ? "border-sky-400 bg-sky-500 text-white shadow-sm"
                : "border-slate-300 bg-white/70 text-slate-700 hover:border-sky-300 hover:bg-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
