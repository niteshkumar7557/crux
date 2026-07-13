"use client";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, SplitText);

// All decorative motion must run inside gsap.matchMedia().add(MOTION_OK, ...)
// so users with prefers-reduced-motion get the server-rendered end state.
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export { gsap, useGSAP, SplitText };
