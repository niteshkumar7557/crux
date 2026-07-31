"use client";

// Sign in. Ships its own chrome.

import { LuLockKeyhole, LuMail, LuZap } from "react-icons/lu";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/axios";
import Button from "@/app/_components/ui/Button";
import { LogoMark } from "@/app/_components/ui/Logo";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";

const SUPPORT_EMAIL = "help@cruxdebate.site";

const Login = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [error, setError] = useState("");
  const [showReset, setShowReset] = useState(false);

  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from("[data-auth-brand]", { y: -14, opacity: 0, duration: 0.5 })
          .from(
            "[data-auth-card]",
            {
              y: 28,
              opacity: 0,
              duration: 0.7,
              clearProps: "opacity,transform",
            },
            0.15,
          )
          .from("[data-auth-deco]", { opacity: 0, duration: 0.4 }, 0.55);
      });
    },
    { scope: rootRef },
  );

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const info = {
      email,
      password,
    };

    try {
      const response = await api.post("/user/login", info);
      localStorage.setItem("access_token", response.data.accessToken);
      const next = new URLSearchParams(window.location.search).get("next");
      const dest =
        next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/arena";
      setTimeout(() => {
        router.push(dest);
      }, 1000);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 429) {
        setError(
          err.response.data?.message ??
            "Too many attempts. Try again in a few minutes.",
        );
        return;
      }
      setError(
        (isAxiosError<{ error?: string }>(err) &&
          err.response?.data?.error) ||
          "Something went wrong",
      );
    }
  }

  return (
    <main
      ref={rootRef}
      className="bg-paper text-ink font-body selection:bg-ink/30 min-h-screen flex flex-col items-center justify-center relative py-16"
    >

      <div className="relative z-10 w-full max-w-md px-6">
        <div data-auth-brand className="mb-12 flex flex-col items-center gap-3">
          <LogoMark size={54} className="text-ink" />
          <h1 className="font-headline text-4xl italic tracking-tighter leading-none text-ink">
            Crux
          </h1>
          <span className="font-label text-[0.6rem] uppercase tracking-[0.3em] text-ink-soft">
            Digital Intellectual Arena
          </span>
        </div>
        <div
          data-auth-card
          className="relative border border-ink-faint bg-band p-8 md:p-10"
        >
          <header className="mb-8">
            <h2
              className="display-type text-[clamp(1.7rem,3.4vw,2.4rem)] text-ink"
            >
              Login to the Arena
            </h2>
            <p className="text-ink-soft text-sm mt-2">
              Welcome back. Log in to rejoin the debate.
            </p>
          </header>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                className="block font-label text-[10px] uppercase tracking-widest text-ink-soft"
                htmlFor="email"
              >
                Email
              </label>
              <div className="relative group">
                <LuMail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft group-focus-within:text-ink transition-colors text-lg" />
                <input
                  className="w-full border border-ink-faint bg-paper py-3 pl-11 pr-4 font-body text-sm text-ink transition-colors placeholder:text-ink-soft focus:border-ink focus:outline-none"
                  id="email"
                  placeholder="you@example.com"
                  required={true}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label
                  className="block font-label text-[10px] uppercase tracking-widest text-ink-soft"
                  htmlFor="password"
                >
                  Password
                </label>
              </div>
              <div className="relative group">
                <LuLockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft group-focus-within:text-ink transition-colors text-lg" />
                <input
                  className="w-full border border-ink-faint bg-paper py-3 pl-11 pr-4 font-body text-sm text-ink transition-colors placeholder:text-ink-soft focus:border-ink focus:outline-none"
                  id="password"
                  placeholder="••••••••••••"
                  required={true}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                />
              </div>
              <div className="flex justify-between gap-4">
                <p className="font-label text-[10px] uppercase tracking-widest text-side-against cursor-default">
                  {error}
                </p>
                <button
                  type="button"
                  aria-expanded={showReset}
                  aria-controls="password-reset-help"
                  onClick={() => setShowReset((open) => !open)}
                  className="shrink-0 font-label text-[10px] uppercase tracking-widest text-ink hover:underline transition-all"
                >
                  Forgot Password?
                </button>
              </div>
              {/* No automated reset exists yet, so this says what to do instead
                  rather than pointing at a route that would 404. */}
              {showReset && (
                <p
                  id="password-reset-help"
                  className="border-l-2 border-laurel py-1 pl-4 font-body text-xs leading-relaxed text-ink-soft"
                >
                  There&rsquo;s no automated reset yet. Mail{" "}
                  <a
                    className="text-ink hover:underline"
                    href={`mailto:${SUPPORT_EMAIL}?subject=Password%20reset`}
                  >
                    {SUPPORT_EMAIL}
                  </a>{" "}
                  from the address you registered with and we&rsquo;ll sort it
                  out by hand.
                </p>
              )}
            </div>
            <div className="pt-4">
              <Button type="submit" size="lg" className="w-full group">
                Log in
                <LuZap className="text-lg group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </form>
          <div className="mt-8 pt-8 border-t border-ink-faint text-center">
            <p className="font-body text-sm text-ink-soft">
              New to Crux?
              <Link
                className="font-label text-[10px] uppercase tracking-widest text-ink hover:underline ml-2 transition-all"
                href={"/register"}
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
        <div data-auth-deco className="mt-8 flex items-center gap-4 px-2">
          <span aria-hidden className="h-px grow bg-ink-faint" />
          <span className="font-label text-[0.58rem] uppercase tracking-[0.3em] text-ink-soft">
            Est. 2026
          </span>
          <span aria-hidden className="h-px grow bg-ink-faint" />
        </div>
      </div>

      <div className="absolute bottom-0 w-full p-8 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-ink-faint">
        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-ink-soft">
          © 2026 CRUX DIGITAL ARENA. ALL RIGHTS RESERVED.
        </span>
        <div className="flex gap-8">
          <a
            className="font-label text-[10px] uppercase tracking-widest text-ink-soft hover:text-ink transition-colors"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            CONTACT
          </a>
        </div>
      </div>
    </main>
  );
};

export default Login;
