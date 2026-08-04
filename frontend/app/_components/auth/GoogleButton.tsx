"use client";

// The "Continue with Google" control, shared by /login, /register and the link
// prompt so the three cannot drift.
//
// It is a plain <a>, not a Link and not a fetch: the target 302s to
// accounts.google.com, which needs a real top-level navigation. Next's client
// router would try to route it internally.
//
// design-system.md §8 allows one brand mark, GitHub, drawn in Phosphor's outline
// cut rather than the official logo. This is the documented second: a sign-in
// button is a control whose whole job is to be recognised as Google's, and the
// colour G is what people scan for. It is the only coloured mark in the product.

import { FcGoogle } from "react-icons/fc";

const CLASSES =
  "inline-flex w-full items-center justify-center gap-3 rounded-full border border-ink-faint bg-paper px-6 py-3.5 font-label text-[0.7rem] uppercase tracking-[0.18em] text-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-ink-wash disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0";

const GoogleButton = ({
  label = "Continue with Google",
  href,
  onClick,
  busy = false,
}: {
  label?: string;
  href?: string;
  onClick?: () => void;
  busy?: boolean;
}) => {
  const inner = (
    <>
      <FcGoogle aria-hidden className="text-xl" />
      {busy ? "Redirecting…" : label}
    </>
  );

  if (href) {
    return (
      <a href={href} className={CLASSES}>
        {inner}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={busy} className={CLASSES}>
      {inner}
    </button>
  );
};

export default GoogleButton;
