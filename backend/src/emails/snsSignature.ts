// Verifies that an SNS message really came from AWS, by checking its X.509
// signature against the certificate SNS names — with that certificate's URL
// restricted to AWS's own SNS hosts.
//
// Node's crypto does the cryptography; this file only assembles the inputs and
// caches the certificate. See snsSignature.logic.ts for why the topic ARN alone
// was never sufficient.

import crypto from "crypto";
import logger from "../lib/logger.js";
import {
  canonicalString,
  digestFor,
  isSigningCertUrl,
} from "./snsSignature.logic.js";

const CERT_TIMEOUT_MS = 5_000;
const CERT_CACHE_MAX = 8;

// SNS rotates its signing certificate rarely, so this saves a fetch per message
// without hiding a rotation for long. Keyed by URL, which is what changes.
const certCache = new Map<string, string>();

async function fetchCertificate(url: string): Promise<string | null> {
  const cached = certCache.get(url);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CERT_TIMEOUT_MS);
  try {
    // redirect: "error" — a redirect off an sns.amazonaws.com host would walk
    // straight past the host check above it.
    const res = await fetch(url, { signal: controller.signal, redirect: "error" });
    if (!res.ok) return null;
    const pem = await res.text();
    if (!pem.includes("BEGIN CERTIFICATE")) return null;

    if (certCache.size >= CERT_CACHE_MAX) {
      const oldest = certCache.keys().next().value;
      if (oldest !== undefined) certCache.delete(oldest);
    }
    certCache.set(url, pem);
    return pem;
  } catch (err) {
    logger.error({ err }, "could not fetch the SNS signing certificate");
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// True only if AWS signed this exact message. Every failure path returns false —
// there is no "probably fine".
export async function verifySnsSignature(
  message: Record<string, unknown>,
): Promise<boolean> {
  const certUrl = message.SigningCertURL ?? message.SigningCertUrl;
  if (typeof certUrl !== "string" || !isSigningCertUrl(certUrl)) {
    logger.warn("SNS message rejected: signing certificate URL is not an SNS URL");
    return false;
  }

  const signature = message.Signature;
  if (typeof signature !== "string" || signature === "") return false;

  const digest = digestFor(message.SignatureVersion);
  if (digest === null) {
    logger.warn({ version: message.SignatureVersion }, "SNS message rejected: unknown signature version");
    return false;
  }

  const canonical = canonicalString(message);
  if (canonical === null) return false;

  const pem = await fetchCertificate(certUrl);
  if (pem === null) return false;

  try {
    const publicKey = new crypto.X509Certificate(pem).publicKey;
    return crypto
      .createVerify(digest)
      .update(canonical, "utf8")
      .verify(publicKey, signature, "base64");
  } catch (err) {
    logger.error({ err }, "SNS signature verification threw");
    return false;
  }
}
