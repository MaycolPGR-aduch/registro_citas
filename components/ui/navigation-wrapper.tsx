"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

interface NavigationWrapperProps {
  items: NavItem[];
}

export function NavigationWrapper({ items }: NavigationWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <Sidebar 
      items={items} 
      isOpen={isOpen} 
      setIsOpen={setIsOpen} 
    />
  );
}
