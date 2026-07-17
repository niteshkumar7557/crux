"use client";
import { LuLockKeyhole, LuMail, LuZap } from "react-icons/lu";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/axios";
import Button from "@/app/_components/ui/Button";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";

const Login = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [error, setError] = useState("");

  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);

  // Entrance: brand drops in, the card rises, then the status strip fades.
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
        next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
      setTimeout(() => {
        router.push(dest);
      }, 1000);
    } catch (err) {
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
      className="bg-background text-on-surface font-body selection:bg-primary/30 min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
    >
      {/* <!-- Background Technical Layer --> */}
      <div className="absolute inset-0 technical-grid z-0"></div>
      <div className="absolute inset-0 bg-radial-at-c from-primary/5 via-transparent to-transparent z-0"></div>

      {/* <!-- Login Container --> */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* <!-- Brand Header (Simplified for Login) --> */}
        <div data-auth-brand className="text-center mb-12">
          <h1
            className="text-4xl font-headline italic tracking-tighter text-primary"
          >
            CRUX
          </h1>
          <div className="mt-2 inline-block">
            <span className="font-label text-[10px] uppercase tracking-[0.3em] text-outline">
              Digital Intellectual Arena
            </span>
          </div>
        </div>
        {/* <!-- Login Card --> */}
        <div
          data-auth-card
          className="bg-surface-container-low border-l-2 border-primary p-8 md:p-10 shadow-2xl relative"
        >
          <header className="mb-8">
            <h2
              className="text-3xl font-headline italic text-on-surface leading-tight"
            >
              Login to the Arena
            </h2>
            <p className="text-on-surface-variant text-sm mt-2">
              Welcome back. Log in to rejoin the debate.
            </p>
          </header>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* <!-- Email Field --> */}
            <div className="space-y-2">
              <label
                className="block font-label text-[10px] uppercase tracking-widest text-outline"
                htmlFor="email"
              >
                Email
              </label>
              <div className="relative group">
                <LuMail className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-lg" />
                <input
                  className="w-full bg-surface-container-highest border-none text-on-surface py-3 pl-11 pr-4 focus:ring-1 focus:ring-primary placeholder:text-outline transition-all font-body text-sm"
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
            {/* <!-- Password Field --> */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label
                  className="block font-label text-[10px] uppercase tracking-widest text-outline"
                  htmlFor="password"
                >
                  Password
                </label>
              </div>
              <div className="relative group">
                <LuLockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-lg" />
                <input
                  className="w-full bg-surface-container-highest border-none text-on-surface py-3 pl-11 pr-4 focus:ring-1 focus:ring-primary placeholder:text-outline transition-all font-body text-sm"
                  id="password"
                  placeholder="••••••••••••"
                  required={true}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                />
              </div>
              <div className="flex justify-between">
                <p className="font-label text-[10px] uppercase tracking-widest text-secondary cursor-default">
                  {error}
                </p>
                <a
                  className="font-label text-[10px] uppercase tracking-widest text-primary hover:underline decoration-primary transition-all"
                  href="#"
                >
                  Forgot Password?
                </a>
              </div>
            </div>
            {/* <!-- Action Button --> */}
            <div className="pt-4">
              <Button type="submit" size="lg" className="w-full group">
                Log in
                <LuZap className="text-lg group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </form>
          {/* <!-- Secondary Actions --> */}
          <div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
            <p className="font-body text-sm text-on-surface-variant">
              New to Crux?
              <Link
                className="font-label text-[10px] uppercase tracking-widest text-primary hover:underline decoration-primary ml-2 transition-all"
                href={"/register"}
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
        {/* <!-- Visual Decorative Element --> */}
        <div data-auth-deco className="mt-6 flex justify-between items-center px-2">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-primary/40"></div>
            <div className="w-1.5 h-1.5 bg-primary/20"></div>
            <div className="w-1.5 h-1.5 bg-primary/10"></div>
          </div>
          <div className="h-px grow mx-4 bg-linear-to-r from-primary/20 via-primary/5 to-transparent"></div>
          <span className="font-label text-[9px] text-outline uppercase tracking-widest">
            System_Ready
          </span>
        </div>
      </div>

      {/* <!-- Global Footer (Suppressed for transactional focus per mandate, but keeping branding) --> */}
      <div className="absolute bottom-0 w-full p-8 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-outline-variant/5">
        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline">
          © 2026 CRUX DIGITAL ARENA. ALL RIGHTS RESERVED.
        </span>
        <div className="flex gap-8">
          <a
            className="font-label text-[10px] uppercase tracking-widest text-outline hover:text-primary transition-colors"
            href="#"
          >
            TERMS
          </a>
          <a
            className="font-label text-[10px] uppercase tracking-widest text-outline hover:text-primary transition-colors"
            href="#"
          >
            CONTACT
          </a>
        </div>
      </div>
    </main>
  );
};

export default Login;
