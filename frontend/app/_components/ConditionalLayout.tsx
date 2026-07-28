"use client";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { usePathname } from "next/navigation";
import React from "react";

const noNavRoutes = ["/login", "/register"];

const ConditionalLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const showNav = !noNavRoutes.includes(pathname);
  return (
    <>
      {showNav && (
        <a
          href="#main-content"
          className="fixed top-3 left-3 z-100 -translate-y-24 focus:translate-y-0 bg-primary text-on-primary px-4 py-2 font-label text-xs uppercase tracking-widest"
        >
          Skip to content
        </a>
      )}
      {showNav && <Navbar />}
      {/* `grow` takes the slack under a short page so the footer lands at the
          bottom of the viewport; the inner column lets a page hand that slack
          to one of its own sections (see DebateView). */}
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
