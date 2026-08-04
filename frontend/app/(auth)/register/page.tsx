"use client";

// Sign up. Validates the handle client-side against _utils/username.ts before the
// round trip; the server is still the authority. Spec: game-theory.md §13

import api from "@/app/axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  LuArrowRight,
  LuGem,
  LuLockKeyhole,
  LuMail,
  LuScale,
  LuShieldCheck,
  LuTrendingUp,
  LuUser,
} from "react-icons/lu";
import Button from "@/app/_components/ui/Button";
import GoogleButton from "@/app/_components/auth/GoogleButton";
import { useGoogleAvailable } from "@/app/_components/auth/useGoogleAvailable";
import { isAxiosError } from "axios";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";
import { normalizeUsername, validateUsername } from "@/app/_utils/username";

// The real mechanics, with their real numbers — the same disclosure /rules makes,
// at the moment someone decides whether to sign up. Spec: game-theory.md §7, §9,
// §12, §19; design-system.md §10.
const REPUTATION = [
  {
    icon: LuShieldCheck,
    accent: "text-ink",
    title: "Judged on the argument",
    body: "An AI scores every argument 2–10 on how much it moves the debate — never on eloquence, length or grammar. Reply to a named opponent and the full range is open; a standalone point caps at 7.",
  },
  {
    icon: LuScale,
    accent: "text-side-against",
    title: "The argument, never the person",
    body: "Hit the reasoning as hard as you like. Hit the person and the moderator discards it before it reaches the arena — and it costs you 4 logic.",
  },
  {
    icon: LuTrendingUp,
    accent: "text-laurel",
    title: "Your record only goes up",
    body: "A loss costs 5 points from the month's board and nothing else. Your all-time logic has no way down.",
  },
] as const;

const Register = () => {
  const [name, setName] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [error, setError] = useState("");
  const [userNameError, setUserNameError] = useState("");
  const googleAvailable = useGoogleAvailable();

  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from("[data-auth-form]", { y: 28, opacity: 0, duration: 0.7 })
          .from(
            "[data-auth-field]",
            { y: 14, opacity: 0, duration: 0.5, stagger: 0.07 },
            0.25,
          )
          .from(
            "[data-auth-panel]",
            {
              x: 32,
              opacity: 0,
              duration: 0.7,
              clearProps: "opacity,transform",
            },
            0.2,
          );
      });
    },
    { scope: rootRef },
  );

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const handle = validateUsername(userName);
    if (!handle.ok) {
      setUserNameError(handle.reason);
      return;
    }
    const info = {
      name,
      userName: handle.value,
      email,
      password,
    };
    try {
      const response = await api.post("/user/register", info);
      localStorage.setItem("access_token", response.data.accessToken);
      setTimeout(() => {
        router.push("/arena");
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
    <>
      <main
        ref={rootRef}
        className="relative min-h-screen grow flex items-center justify-center pt-14 pb-12 px-4 sm:px-6"
      >

        <div className="w-full max-w-5xl grid md:grid-cols-12 gap-0 border border-ink-faint bg-paper overflow-hidden">
          <div
            data-auth-form
            className="md:col-span-7 p-6 sm:p-10 md:p-16 flex flex-col justify-center"
          >
            <div className="mb-12">
              <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
                <span aria-hidden className="h-px w-8 bg-ink-faint" />
                Create your account
              </p>
              <h1 className="mt-5 display-type text-[clamp(2.2rem,4.6vw,3.4rem)] text-ink">
                Join the Intellectual Fray
              </h1>
            </div>

            {/* Google first: it is three fields shorter, and the handle it still
                has to ask for is asked on its own screen afterwards.
                The label matches /login's exactly, because the endpoint does:
                it signs an existing user in and creates an account for a new
                one, whichever page it was pressed from. "Sign up with Google"
                here would promise a distinction that does not exist. */}
            {googleAvailable && (
              <div className="mb-10">
                <GoogleButton href="/api/user/auth/google" />
                <div className="mt-8 flex items-center gap-4">
                  <span aria-hidden className="h-px grow bg-ink-faint" />
                  <span className="font-label text-[0.58rem] uppercase tracking-[0.3em] text-ink-soft">
                    or
                  </span>
                  <span aria-hidden className="h-px grow bg-ink-faint" />
                </div>
              </div>
            )}

            <form className="space-y-8" onSubmit={handleSubmit}>
              <div data-auth-field className="space-y-2">
                <label
                  className="block font-label text-[10px] uppercase tracking-widest text-ink-soft"
                  htmlFor="name"
                >
                  Full name
                </label>
                <div className="relative group">
                  <LuUser className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft group-focus-within:text-ink transition-colors text-lg" />
                  <input
                    className="w-full border border-ink-faint bg-paper py-3 pl-11 pr-4 font-body text-sm text-ink transition-colors placeholder:text-ink-soft focus:border-ink focus:outline-none"
                    id="name"
                    placeholder="Your name"
                    required={true}
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                  />
                </div>
              </div>
              <div data-auth-field className="space-y-2">
                <label
                  className="block font-label text-[10px] uppercase tracking-widest text-ink-soft"
                  htmlFor="username"
                >
                  Username
                </label>
                <div className="relative group">
                  <LuGem className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft group-focus-within:text-ink transition-colors text-lg" />
                  <input
                    className="w-full border border-ink-faint bg-paper py-3 pl-11 pr-4 font-body text-sm text-ink transition-colors placeholder:text-ink-soft focus:border-ink focus:outline-none"
                    id="username"
                    placeholder="pick_a_username"
                    required={true}
                    type="text"
                    autoComplete="username"
                    maxLength={20}
                    aria-invalid={userNameError !== ""}
                    aria-describedby="username-hint"
                    value={userName}
                    onChange={(e) => {
                      const next = normalizeUsername(e.currentTarget.value);
                      setUserName(next);
                      if (next === "") {
                        setUserNameError("");
                        return;
                      }
                      const check = validateUsername(next);
                      setUserNameError(check.ok ? "" : check.reason);
                    }}
                  />
                </div>
                <p
                  id="username-hint"
                  className={`font-label text-[10px] uppercase tracking-widest ${
                    userNameError ? "text-side-against" : "text-ink-soft"
                  }`}
                >
                  {userNameError || "Lowercase letters, numbers and underscores. This becomes your profile URL."}
                </p>
              </div>
              <div data-auth-field className="space-y-2">
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
              <div data-auth-field className="space-y-2">
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
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                  />
                </div>
                <p className="font-label text-[10px] uppercase tracking-widest text-side-against cursor-default">
                  {error}
                </p>
              </div>

              <div data-auth-field className="pt-6">
                <Button type="submit" size="lg" className="w-full">
                  CREATE ACCOUNT
                  <LuArrowRight className="text-lg" />
                </Button>
              </div>
            </form>
            <p className="mt-8 text-ink-soft text-xs font-body">
              By entering the arena, you agree to the{" "}
              <Link className="text-ink hover:underline" href="/rules">
                ARENA RULES
              </Link>
              .
            </p>
          </div>
          <div
            data-auth-panel
            className="md:col-span-5 bg-band border-l border-ink-faint flex flex-col"
          >
            {/* A plate, per design-system §4: the engraving multiplies its cream
                into `bg-plate`, which stays cream in dark mode. The status line
                sits BELOW it as a caption strip rather than over the image —
                the hall is dense green ink corner to corner, and any type laid
                on it disappears into the benches. */}
            <div className="relative h-48 md:h-64 overflow-hidden border-b border-ink-faint bg-plate">
              <Image
                className="engraving object-cover object-[50%_40%]"
                alt=""
                src="/landing/amphitheater-hall.jpeg"
                fill
                priority
                sizes="(min-width: 768px) 40vw, 100vw"
              />
            </div>
            <div className="flex items-center gap-2.5 border-b border-ink-faint px-6 sm:px-10 py-3.5">
              <span
                aria-hidden
                className="h-1.5 w-1.5 bg-ink animate-pulse motion-reduce:animate-none"
              />
              <span className="font-label text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                Status: recruitment open
              </span>
            </div>
            <div className="p-6 sm:p-10 grow">
              <h2 className="font-headline text-2xl text-ink italic mb-6">
                Crux Reputation
              </h2>
              <div className="space-y-8">
                {REPUTATION.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="shrink-0 w-10 h-10 bg-raised flex items-center justify-center">
                      <item.icon className={item.accent} />
                    </div>
                    <div>
                      <h3
                        className={`font-label text-xs tracking-widest uppercase mb-1 ${item.accent}`}
                      >
                        {item.title}
                      </h3>
                      <p className="text-ink-soft text-sm leading-relaxed">
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Register;
