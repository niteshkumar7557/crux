"use client";

// The shared chrome. noNavRoutes are the pages that ship their own — the landing and
// the two auth pages.

import Navbar from "./Navbar";
import Footer from "./Footer";
import GoogleLinkPrompt from "./auth/GoogleLinkPrompt";
import { usePathname } from "next/navigation";
import React from "react";

// The two /auth pages join the list for the same reason login and register are
// on it: they are read once, mid-flow, and a navbar offering somewhere else to
// go is the wrong thing to put in front of someone halfway through signing in.
const noNavRoutes = [
  "/login",
  "/register",
  "/",
  "/auth/complete",
  "/auth/username",
];

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
      {/* Rides with the chrome, so it can never appear over the landing page or
          over a page someone is mid-sign-in on. */}
      {showNav && <GoogleLinkPrompt />}
    </>
  );
};

export default ConditionalLayout;
