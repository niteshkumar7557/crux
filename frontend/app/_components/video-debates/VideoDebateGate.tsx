"use client";

// The password wall. It says as little as possible: someone who reaches this page
// by accident should learn nothing about what is behind it.

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/_components/ui/Button";

const VideoDebateGate = () => {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [rejected, setRejected] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setRejected(false);
    // Through the /api rewrite, not the API host: Set-Cookie has to land on this
    // origin or the browser will never send it back.
    const response = await fetch("/api/video-debates/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSubmitting(false);
    if (response.ok) router.refresh();
    else setRejected(true);
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-6 py-16">
      <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
        <span aria-hidden className="h-px w-8 bg-ink-faint" />
        Not yet public
      </p>
      <h1 className="mt-5 font-headline text-3xl leading-tight text-ink">
        This programme is being shown privately.
      </h1>
      <p className="mt-4 font-body text-sm leading-relaxed text-ink-soft">
        Enter the password you were given.
      </p>

      <form onSubmit={submit} className="mt-8">
        <label
          htmlFor="video-pass"
          className="font-label text-[0.6rem] uppercase tracking-[0.25em] text-ink-soft"
        >
          Password
        </label>
        <input
          id="video-pass"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          className="mt-2 block w-full border border-ink-faint bg-band px-4 py-3 font-body text-ink"
        />
        {rejected && (
          <p role="alert" className="mt-3 font-body text-sm text-side-against">
            That password was not accepted.
          </p>
        )}
        <Button type="submit" disabled={submitting || password === ""} className="mt-6">
          {submitting ? "Checking" : "Enter"}
        </Button>
      </form>
    </div>
  );
};

export default VideoDebateGate;
