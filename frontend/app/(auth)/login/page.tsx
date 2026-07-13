"use client";
import { HiOutlineBolt } from "react-icons/hi2";
import { LuLockKeyhole } from "react-icons/lu";
import { MdOutlineEmail } from "react-icons/md";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/axios";
import Button from "@/app/_components/ui/Button";

const Login = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [error, setError] = useState("");

  const router = useRouter();

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
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  }

  return (
    <main className="bg-background text-on-surface font-body selection:bg-primary/30 min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* <!-- Background Technical Layer --> */}
      <div className="absolute inset-0 technical-grid z-0"></div>
      <div className="absolute inset-0 bg-radial-at-c from-primary/5 via-transparent to-transparent z-0"></div>

      {/* <!-- Login Container --> */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* <!-- Brand Header (Simplified for Login) --> */}
        <div className="text-center mb-12">
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
        <div className="bg-surface-container-low border-l-2 border-primary p-8 md:p-10 shadow-2xl relative">
          <header className="mb-8">
            <h2
              className="text-3xl font-headline italic text-on-surface leading-tight"
            >
              Login to the Arena
            </h2>
            <p className="text-on-surface-variant text-sm mt-2">
              Enter your credentials to access the fray.
            </p>
          </header>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* <!-- Email Field --> */}
            <div className="space-y-2">
              <label
                className="block font-label text-[10px] uppercase tracking-widest text-outline"
                htmlFor="email"
              >
                Identify Your Interface (Email)
              </label>
              <div className="relative group">
                <MdOutlineEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-lg" />
                <input
                  className="w-full bg-surface-container-highest border-none text-on-surface py-3 pl-11 pr-4 focus:ring-1 focus:ring-primary placeholder:text-outline transition-all font-body text-sm"
                  id="email"
                  placeholder="user@crux-protocol.io"
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
                  Encryption Key (Password)
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
                Enter the Fray
                <HiOutlineBolt className="text-lg group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </form>
          {/* <!-- Secondary Actions --> */}
          <div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
            <p className="font-body text-sm text-on-surface-variant">
              New to the protocol?
              <Link
                className="font-label text-[10px] uppercase tracking-widest text-primary hover:underline decoration-primary ml-2 transition-all"
                href={"/register"}
              >
                Join the Fray
              </Link>
            </p>
          </div>
        </div>
        {/* <!-- Visual Decorative Element --> */}
        <div className="mt-6 flex justify-between items-center px-2">
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
            PROTOCOL
          </a>
          <a
            className="font-label text-[10px] uppercase tracking-widest text-outline hover:text-primary transition-colors"
            href="#"
          >
            ENCRYPTED CONTACT
          </a>
        </div>
      </div>
    </main>
  );
};

export default Login;
