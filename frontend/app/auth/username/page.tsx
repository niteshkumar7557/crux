"use client";

// The handle step for a brand-new Google account. Nothing exists in the database
// yet — the verified profile is parked in a short-lived signed cookie, and this
// form is what turns it into a row.
//
// It says "creating a new account" and names the address, because the same
// button on /login reaches here: a user who believed they were signing in, or
// who picked the wrong account in Google's chooser, has to be able to see that
// before a row exists. Once two accounts exist there is no self-serve merge.
//
// The handle is asked for rather than derived from the email on purpose (§13):
// it is the profile URL and the name everyone else argues against, so it is not
// something to be assigned. Validated here against _utils/username.ts, which is
// the deliberate frontend copy of the server's rule; the server still decides.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { LuArrowRight, LuGem } from "react-icons/lu";
import api from "@/app/axios";
import Button from "@/app/_components/ui/Button";
import { LogoMark } from "@/app/_components/ui/Logo";
import { normalizeUsername, validateUsername } from "@/app/_utils/username";

const ClaimUsername = () => {
  const [userName, setUserName] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // null = still asking, "" = no ticket (nothing to sign up).
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    api
      .get("/user/auth/google/pending")
      .then(({ data }) => {
        if (alive) setPendingEmail(String(data?.email ?? ""));
      })
      .catch(() => {
        // No ticket, or an expired one. Say so now rather than after they have
        // typed a handle and pressed the button.
        if (alive) setPendingEmail("");
      });
    return () => {
      alive = false;
    };
  }, []);

  async function signInInstead() {
    await api.post("/user/auth/google/abandon").catch(() => {});
    router.replace("/login");
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const handle = validateUsername(userName);
    if (!handle.ok) {
      setFieldError(handle.reason);
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post("/user/auth/google/complete", {
        userName: handle.value,
      });
      localStorage.setItem("access_token", data.accessToken);
      router.replace("/arena");
    } catch (err) {
      // The ticket is 15 minutes old at most. Past that the only honest thing to
      // do is send them back through Google rather than pretend to retry.
      if (isAxiosError(err) && err.response?.status === 401) {
        setError("That took too long. Start again from the sign-in page.");
        return;
      }
      setError(
        (isAxiosError<{ error?: string }>(err) && err.response?.data?.error) ||
          "Something went wrong",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="bg-paper text-ink font-body min-h-screen flex flex-col items-center justify-center py-16 px-6">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center gap-3">
          <LogoMark size={48} className="text-ink" />
          <span className="font-label text-[0.6rem] uppercase tracking-[0.3em] text-ink-soft">
            Creating a new account
          </span>
        </div>

        <div className="border border-ink-faint bg-band p-8 md:p-10">
          <h1 className="display-type text-[clamp(1.7rem,3.4vw,2.4rem)] text-ink">
            Claim your name
          </h1>
          {/* The address, before the row exists. This is the only screen between
              Google's account chooser and a new account, so it is the last place
              a wrong pick can be caught. */}
          {pendingEmail && (
            <p className="mt-3 font-body text-sm text-ink">
              You&rsquo;re signing up as{" "}
              <span className="font-label text-[0.72rem] tracking-[0.06em] text-ink">
                {pendingEmail}
              </span>
              .
            </p>
          )}
          <p className="mt-2 font-body text-sm text-ink-soft">
            This becomes your profile URL and the handle every opponent argues
            against. Choose carefully — it is how the arena knows you.
          </p>

          {/* No ticket, or one that lapsed. Said here rather than after a handle
              has been typed and submitted. */}
          {pendingEmail === "" && (
            <p
              role="alert"
              className="mt-6 border-l-2 border-side-against py-1 pl-4 font-body text-xs leading-relaxed text-ink-soft"
            >
              This sign-up has expired, or there isn&rsquo;t one in progress. Start
              again from the sign-in page.
            </p>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                className="block font-label text-[10px] uppercase tracking-widest text-ink-soft"
                htmlFor="username"
              >
                Username
              </label>
              <div className="relative group">
                <LuGem className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft transition-colors group-focus-within:text-ink text-lg" />
                <input
                  className="w-full border border-ink-faint bg-paper py-3 pl-11 pr-4 font-body text-sm text-ink transition-colors placeholder:text-ink-soft focus:border-ink focus:outline-none"
                  id="username"
                  placeholder="pick_a_username"
                  required
                  autoFocus
                  type="text"
                  autoComplete="username"
                  maxLength={20}
                  aria-invalid={fieldError !== ""}
                  aria-describedby="username-hint"
                  value={userName}
                  onChange={(e) => {
                    const next = normalizeUsername(e.currentTarget.value);
                    setUserName(next);
                    if (next === "") {
                      setFieldError("");
                      return;
                    }
                    const check = validateUsername(next);
                    setFieldError(check.ok ? "" : check.reason);
                  }}
                />
              </div>
              <p
                id="username-hint"
                className={`font-label text-[10px] uppercase tracking-widest ${
                  fieldError ? "text-side-against" : "text-ink-soft"
                }`}
              >
                {fieldError ||
                  "Lowercase letters, numbers and underscores. This becomes your profile URL."}
              </p>
            </div>

            {error && (
              <p className="border-l-2 border-side-against py-1 pl-4 font-body text-xs leading-relaxed text-ink-soft">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={busy || pendingEmail === ""}
            >
              {busy ? "Claiming…" : "Enter the arena"}
              <LuArrowRight className="text-lg" />
            </Button>
          </form>

          <div className="mt-8 border-t border-ink-faint pt-6 text-center">
            <p className="font-body text-sm text-ink-soft">
              Already have an account?
              <button
                type="button"
                onClick={signInInstead}
                className="ml-2 cursor-pointer font-label text-[10px] uppercase tracking-widest text-ink transition-all hover:underline"
              >
                Sign in instead
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ClaimUsername;
