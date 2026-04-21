"use client";

import React, { useEffect, useRef, type PropsWithChildren } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaBars,
  FaTimes,
  FaChevronRight,
} from "react-icons/fa";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

interface SidebarProps extends PropsWithChildren {
  items: NavItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ items, isOpen, setIsOpen }: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  
  
  useEffect(() => {
    if (isOpen) setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        const toggleButton = document.getElementById("sidebar-toggle");
        if (toggleButton && !toggleButton.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  return (
    <>
      {/* Botón Flotante */}
      <button
        id="sidebar-toggle"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed left-4 bottom-8 z-50 flex h-14 w-14 items-center justify-center rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] transition-all duration-500 ${
          isOpen 
            ? "bg-slate-900 text-white rotate-90" 
            : "bg-sky-600 text-white hover:bg-sky-700 hover:scale-105 active:scale-95"
        }`}
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {isOpen ? (
          <FaTimes className="text-xl" />
        ) : (
          <FaBars className="text-xl" />
        )}
      </button>

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed left-4 top-24 bottom-24 z-40 w-72 transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isOpen ? "translate-x-0 opacity-100" : "-translate-x-[110%] opacity-0"
        }`}
      >
        <div className="h-full overflow-hidden rounded-[2.5rem] bg-white/90 border border-white/20 shadow-[0_30px_60px_rgba(0,0,0,0.12)] backdrop-blur-2xl">
          <nav className="h-full overflow-y-auto overflow-x-hidden p-4 custom-scrollbar">
            <style jsx>{`
              .custom-scrollbar::-webkit-scrollbar { width: 5px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: transparent; margin: 20px 0; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>

            <div className="mb-6 px-4 pt-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 opacity-80">Navegación Principal</h2>
            </div>

            <ul className="space-y-1.5">
              {items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`group relative flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-300 ${
                        isActive
                          ? "bg-sky-600 text-white shadow-lg shadow-sky-200 translate-x-1"
                          : "text-slate-600 hover:bg-slate-50 hover:text-sky-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-lg transition-all duration-300 ${
                          isActive ? "text-white scale-110" : "text-slate-400 group-hover:text-sky-600 group-hover:scale-110"
                        }`}>
                          {item.icon}
                        </span>
                        <span className="tracking-tight">{item.label}</span>
                      </div>
                      <FaChevronRight className={`text-[10px] transition-all duration-300 ${
                        isActive ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                      }`} />
                      <div className={`absolute left-0 h-6 w-1 rounded-r-full bg-sky-600 transition-all duration-300 ${
                        isActive ? "opacity-100" : "opacity-0 scale-y-0 group-hover:opacity-40 group-hover:scale-y-100"
                      }`} />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 px-4 py-5 rounded-[1.5rem] bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 mx-1">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <div className="absolute inset-0 h-3 w-3 rounded-full bg-emerald-500 animate-ping opacity-75" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistema</p>
                  <p className="text-xs font-bold text-slate-700">Operativo</p>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/10 backdrop-blur-md transition-all duration-500"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
