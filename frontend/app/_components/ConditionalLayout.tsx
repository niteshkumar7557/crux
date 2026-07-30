"use client";

// The shared chrome. noNavRoutes are the pages that ship their own — the landing and
// the two auth pages.

import Navbar from "./Navbar";
import Footer from "./Footer";
import { usePathname } from "next/navigation";
import React from "react";

const noNavRoutes = ["/login", "/register", "/"];

const ConditionalLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const showNav = !noNavRoutes.includes(pathname);
  return (
    <>
      {showNav && (
        <a
          href="#main-content"
          className="fixed top-3 left-3 z-100 -translate-y-24 focus:translate-y-0 bg-ink text-paper px-4 py-2 font-label text-xs uppercase tracking-widest"
        >
          Skip to content
        </a>
      )}
      {showNav && <Navbar />}
      {showNav ? (
        <main id="main-content" className="grow flex flex-col">
          {children}
        </main>
      ) : (
        children
      )}
      {showNav && <Footer />}
    </>
  );
};

export default ConditionalLayout;
