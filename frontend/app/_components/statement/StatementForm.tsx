"use client";
import { DomainClassification } from "@/app/statement/types";
import React, { useState, useRef } from "react";
import {
  MdEditNote,
  MdFilterList,
  MdMemory,
  MdOutlineAnalytics,
  MdSensors,
} from "react-icons/md";

import { TbGavel } from "react-icons/tb";
import { getUser } from "@/app/_utils/getUser";
import { useRouter } from "next/navigation";
import api from "@/app/axios";
import { RiRobot3Line } from "react-icons/ri";
import { jwtPayload } from "@/app/_types/jwt";
import Button from "@/app/_components/ui/Button";

interface FormState {
	text: string;
	allowInput: boolean;
	selectedDomain: string;
	keyword: string;
	loading: boolean;
	eligibility: string;
	domain: string;
	feedback: string;
};

const MINIMUM_CHAR_LIMIT = 35;
const MAXIMUM_CHAR_LIMIT = 120;

const StatementForm = ({ domains }: { domains: DomainClassification }) => {
  const router = useRouter();

	function isTextInLimits() {
		return formState.text.length >= MINIMUM_CHAR_LIMIT && formState.text.length <= MAXIMUM_CHAR_LIMIT;
	}

  const [formState, setFormState] = useState<FormState>({
		loading: false,
		text: "",
		allowInput: true,
		selectedDomain: "AI",
		keyword: "",
		eligibility: "",
		domain: "",
		feedback:
			"Crux AI is analyzing the semantic integrity of your thesis. Ensure your statement is falsifiable and free of ad hominem triggers for optimal Arena placement.",
	});

	function updateFormState(updates: Partial<FormState>) {
		setFormState((pFormState) => ({
			...pFormState,
			...updates,
		}));
	}

	const requestInProccess = useRef<boolean>(false);

  async function checkEligibility() {
		if (!isTextInLimits() || requestInProccess.current)
			return;

		requestInProccess.current = true;
		
		updateFormState({
			loading: true,
			allowInput: false,
			eligibility: "pending",
		});
		
		try {
			const { data } = await api.post("/ai/statement", {
				content: formState.text,
				domain: formState.selectedDomain,
			});

			updateFormState({
				text: data.improved,
				keyword: data.keyword,
				eligibility: data.eligibility,
				domain: data.domain,
				feedback: data.feedback,
			});
		} catch {
			updateFormState({
				eligibility: "unavailable",
				feedback:
					"The Arbiter is unreachable right now. Your claim is untouched — try the eligibility check again in a moment.",
			});
		} finally {
			updateFormState({ loading: false, allowInput: true });
			requestInProccess.current = false;
		}
  }

  async function handleSubmit() {
		if (requestInProccess.current) return;
		requestInProccess.current = true;
		
		updateFormState({ loading: true, allowInput: false });

    const user = await getUser();
		if (!user) {
			updateFormState({
				loading: false,
				allowInput: true,
				eligibility: "unavailable",
				feedback:
					"You need to be logged in to broadcast a statement to the arena.",
			});
			requestInProccess.current = false;
			return;
		}

		try {
			await api.post("/argument", {
				user_id: user.id,
				content: formState.text,
				content_keyword: formState.keyword,
				domain: formState.domain,
			});
		} catch {
			updateFormState({
				loading: false,
				allowInput: true,
				eligibility: "unavailable",
				feedback:
					"Broadcast failed — the arena couldn't be reached. Your statement is still here; try again.",
			});
			requestInProccess.current = false;
			return;
		}

    router.push("/");
  }

	const isEligible = formState.eligibility === "pass";

  return (
    <div className="bg-surface-container-low p-8 relative overflow-hidden">
      <form className="space-y-8 relative z-10">
        {/* <!-- Category Selection --> */}
        <div className="space-y-3">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
            <MdFilterList className="text-sm" />
            SELECT YOUR BATTLEGROUND
          </p>
          <div className=" flex flex-wrap gap-2">
            {domains.map((domainName, i) => (
              <button
                key={i}
                className={`${formState.selectedDomain === domainName ? "border-primary text-primary bg-primary/5" : "border-outline-variant bg-surface-container"} cursor-pointer border px-4 py-2 font-label text-xs uppercase hover:border-primary hover:text-primary transition-colors `}
                type="button"
                onClick={() => updateFormState({ selectedDomain: domainName })}
              >
                {domainName}
              </button>
            ))}
          </div>
        </div>
        {/* <!-- Statement Textarea --> */}
        <div className="space-y-3">
          <label
            className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant flex items-center gap-2"
            htmlFor="claim"
          >
            <MdEditNote className="text-sm" />
            YOUR CLAIM
          </label>
          <textarea
            id="claim"
            className="w-full focus:outline-none bg-surface-container-highest border-0 focus:ring-1 focus:ring-primary min-h-60 p-6 font-headline text-2xl italic placeholder:text-outline text-on-surface resize-none"
            placeholder="Make a claim worth fighting over..."
            value={formState.text}
						maxLength={MAXIMUM_CHAR_LIMIT}
            onChange={(e) => {
							if (formState.allowInput)
								updateFormState({ text: e.target.value, eligibility: "" });
						}}
          ></textarea>
          <div className="flex justify-between items-center text-[10px] font-label text-outline uppercase tracking-tighter">
            <span>THE ARBITER REQUIRES SUBSTANCE — MINIMUM {MINIMUM_CHAR_LIMIT} CHARACTERS</span>
            <span>{formState.text.length} / {MAXIMUM_CHAR_LIMIT}</span>
          </div>
        </div>
        {/* <!-- Action Bar --> */}
        <div className="pt-6 border-t border-outline-variant/30 flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="flex items-center gap-4 text-on-surface-variant">
            <div className="flex">
              <div className="w-8 h-8 bg-surface-container-high border border-outline-variant flex items-center justify-center">
                <TbGavel className="text-xs" />
              </div>
              <div className="w-8 h-8 bg-surface-container-high border border-outline-variant flex items-center justify-center">
                <MdOutlineAnalytics className="text-xs" />
              </div>
            </div>
            <span className="font-label text-[10px] uppercase tracking-widest">
              ARBITER STANDING BY
            </span>
          </div>
          <Button
            type="button"
            size="lg"
            className="w-full md:w-auto"
            disabled={!isTextInLimits()}
            onClick={() => (isEligible ? handleSubmit : checkEligibility)()}
          >
            {isEligible ? "Broadcast Statement" : "Check eligibility"}
            {formState.loading ? (
              <span className="border-t-2 border-on-primary h-4 w-4 rounded-full animate-spin"></span>
            ) : isEligible ? (
              <MdSensors className="text-lg" />
            ) : (
              <RiRobot3Line className="text-lg" />
            )}
          </Button>
        </div>
      </form>
      {formState.eligibility && (
        <div className="bg-surface-container-high border mt-6 border-outline-variant/50 p-6 relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-outline-variant/30 pb-4">
              <h3
                className="font-headline italic text-2xl text-primary"
              >
                CRUX AI Validation
              </h3>
              <div className="flex items-center gap-3 bg-surface-container px-4 py-2 border border-primary/30 shadow-glow-primary">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="font-label text-[10px] uppercase tracking-widest text-primary">
                  Eligibility: {formState.eligibility}
                </span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-5 border-l border-primary/50">
              <div className="flex items-start gap-4">
                <MdMemory className="text-primary text-lg mt-0.5 animate-pulse motion-reduce:animate-none" />
                <p className="font-label text-xs text-on-surface-variant leading-relaxed">
                  {formState.feedback}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatementForm;
