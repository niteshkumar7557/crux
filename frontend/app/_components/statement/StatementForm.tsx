"use client";
import {
	ArbiterVerdict,
	AUTO_DOMAIN,
	ClaimVersion,
	DomainClassification,
	SimilarStatement,
	Stage,
} from "@/app/statement/types";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LuBot, LuChartColumn, LuGavel } from "react-icons/lu";
import { useRouter } from "next/navigation";
import { getUser } from "@/app/_utils/getUser";
import { jwtPayload } from "@/app/_types/jwt";
import api from "@/app/axios";
import Button from "@/app/_components/ui/Button";
import StageRail from "./StageRail";
import DomainPicker from "./DomainPicker";
import ClaimEditor, { isTextInLimits } from "./ClaimEditor";
import VerdictPanel from "./VerdictPanel";
import BroadcastPreview from "./BroadcastPreview";

const DRAFT_KEY = "crux:statement-draft";
const CHECK_TIMEOUT_MS = 30000;
const CAST_TIMEOUT_MS = 60000;

const StatementForm = ({ domains }: { domains: DomainClassification }) => {
	const router = useRouter();

	const [text, setText] = useState("");
	const [selectedDomain, setSelectedDomain] = useState(AUTO_DOMAIN);
	const [checking, setChecking] = useState(false);
	const [casting, setCasting] = useState(false);
	const [verdict, setVerdict] = useState<ArbiterVerdict | null>(null);
	const [chosenVersion, setChosenVersion] = useState<ClaimVersion>("improved");
	const [similar, setSimilar] = useState<SimilarStatement[]>([]);
	const [composeNotice, setComposeNotice] = useState("");
	const [castNotice, setCastNotice] = useState("");
	// undefined = auth unknown (checking), null = logged out
	const [authUser, setAuthUser] = useState<jwtPayload | null | undefined>(undefined);
	// the JWT doesn't carry the avatar, so fetch it once we know who's here
	const [avatar, setAvatar] = useState<string | null>(null);

	const restored = useRef(false);
	const similarSeq = useRef(0);

	useEffect(() => {
		let active = true;
		getUser()
			.then((user) => {
				if (!active) return;
				setAuthUser(user);
				if (!user) return;
				api
					.get("/user/me")
					.then(({ data }) => {
						if (active) setAvatar(data.user?.avatar ?? null);
					})
					.catch(() => {});
			})
			.catch(() => {
				if (active) setAuthUser(null);
			});
		return () => {
			active = false;
		};
	}, []);

	// Restore draft once, before the save effect may overwrite it. setState
	// calls are deferred into a timer (react-hooks/set-state-in-effect forbids
	// synchronous setState in an effect body); 0ms always precedes the 300ms
	// save-effect debounce below, so no draft is ever clobbered.
	useEffect(() => {
		if (restored.current) return;
		const timer = setTimeout(() => {
			restored.current = true;
			try {
				const raw = localStorage.getItem(DRAFT_KEY);
				if (!raw) return;
				const draft = JSON.parse(raw) as { text?: string; selectedDomain?: string };
				if (draft.text) setText(draft.text);
				if (
					draft.selectedDomain &&
					(draft.selectedDomain === AUTO_DOMAIN ||
						domains.includes(draft.selectedDomain))
				)
					setSelectedDomain(draft.selectedDomain);
			} catch {}
		}, 0);
		return () => clearTimeout(timer);
	}, [domains]);

	// Debounced draft save.
	useEffect(() => {
		if (!restored.current) return;
		const timer = setTimeout(() => {
			try {
				localStorage.setItem(DRAFT_KEY, JSON.stringify({ text, selectedDomain }));
			} catch {}
		}, 300);
		return () => clearTimeout(timer);
	}, [text, selectedDomain]);

	const busy = checking || casting;
	const stage: Stage = !verdict
		? "compose"
		: verdict.status === "pass"
			? "broadcast"
			: "verdict";

	function voidVerdict(notice: string) {
		if (verdict) {
			setVerdict(null);
			similarSeq.current++;
			setSimilar([]);
			setCastNotice("");
			setComposeNotice(notice);
		}
	}

	function handleTextChange(next: string) {
		if (busy) return;
		setText(next);
		voidVerdict("Claim changed — the verdict is void. Re-check eligibility.");
	}

	function handleDomainSelect(domain: string) {
		if (busy) return;
		setSelectedDomain(domain);
		voidVerdict("Battleground changed — the verdict is void. Re-check eligibility.");
	}

	function handleChooseVersion(version: ClaimVersion) {
		if (busy) return;
		setChosenVersion(version);
	}

	function handleTryReframe() {
		if (!verdict || busy) return;
		setText(verdict.improved);
		setVerdict(null);
		similarSeq.current++;
		setSimilar([]);
		setComposeNotice("Reframe loaded — run the eligibility check.");
	}

	async function fetchSimilar(keyword: string) {
		if (!keyword) return;
		const seq = ++similarSeq.current;
		try {
			const { data } = await api.get("/search", { params: { q: keyword } });
			if (seq !== similarSeq.current) return;
			setSimilar(((data.statements ?? []) as SimilarStatement[]).slice(0, 3));
		} catch {
			// Similar fights are a bonus — never block the flow.
		}
	}

	async function handleCheck() {
		if (!isTextInLimits(text) || busy) return;
		setChecking(true);
		setComposeNotice("");
		try {
			const { data } = await api.post(
				"/ai/statement",
				{ content: text, domain: selectedDomain },
				{ timeout: CHECK_TIMEOUT_MS },
			);
			const next: ArbiterVerdict = {
				status: data.eligibility === "pass" ? "pass" : "fail",
				original: text,
				improved: (data.improved ?? text) as string,
				feedback: (data.feedback ?? "") as string,
				keyword: (data.keyword ?? "") as string,
				domain: (data.domain ?? selectedDomain) as string,
			};
			setVerdict(next);
			setChosenVersion(
				next.improved.trim() === next.original.trim() ? "original" : "improved",
			);
			similarSeq.current++;
			setSimilar([]);
			if (next.status === "pass") fetchSimilar(next.keyword);
		} catch {
			setVerdict({
				status: "unavailable",
				original: text,
				improved: text,
				feedback:
					"The Arbiter is unreachable right now. Your claim is untouched — try the eligibility check again in a moment.",
				keyword: "",
				domain: selectedDomain,
			});
		} finally {
			setChecking(false);
		}
	}

	async function handleBroadcast() {
		if (!verdict || verdict.status !== "pass" || busy) return;
		setCasting(true);
		setCastNotice("");
		const user = await getUser().catch(() => null);
		if (!user) {
			setAuthUser(null);
			setCasting(false);
			return;
		}
		const content =
			chosenVersion === "improved" ? verdict.improved : verdict.original;
		try {
			const { data } = await api.post(
				"/argument",
				{
					user_id: user.id,
					content,
					content_keyword: verdict.keyword,
					domain: verdict.domain,
					selected_domain: selectedDomain,
				},
				{ timeout: CAST_TIMEOUT_MS },
			);
			try {
				localStorage.removeItem(DRAFT_KEY);
			} catch {}
			router.push(`/argument/CRX-${data.id}-A`);
			// Keep `casting` true — the redirect is the success state.
		} catch {
			setCastNotice(
				"Broadcast failed — the arena couldn't be reached. Everything is preserved; try again.",
			);
			setCasting(false);
		}
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
			e.preventDefault();
			if (verdict?.status === "pass") handleBroadcast();
			else handleCheck();
		}
	}

	const chosenContent = verdict
		? chosenVersion === "improved"
			? verdict.improved
			: verdict.original
		: text;

	return (
		<div className="bg-surface-container-low p-8 relative overflow-hidden">
			<StageRail stage={stage} />
			{authUser === null && (
				<div className="mb-8 flex items-center justify-between gap-4 border border-tertiary/30 bg-tertiary/5 px-4 py-3">
					<span className="font-label text-[10px] uppercase tracking-widest text-tertiary">
						SPECTATOR MODE — LOG IN TO BROADCAST
					</span>
					<Link
						href="/login?next=/statement"
						className="font-label text-[10px] uppercase tracking-widest text-primary hover:underline whitespace-nowrap"
					>
						LOG IN
					</Link>
				</div>
			)}
			<form
				className="space-y-8 relative z-10"
				onSubmit={(e) => e.preventDefault()}
				onKeyDown={handleKeyDown}
			>
				<DomainPicker
					domains={domains}
					selected={selectedDomain}
					onSelect={handleDomainSelect}
					disabled={busy}
				/>
				<ClaimEditor text={text} onChange={handleTextChange} locked={busy} />
				{composeNotice && (
					<p className="font-label text-[10px] uppercase tracking-widest text-tertiary">
						{composeNotice}
					</p>
				)}
				{/* §14: the author bonus, and the condition attached to it, stated
				    before posting rather than discovered at the verdict. */}
				<p className="font-body text-[11px] text-outline leading-relaxed">
					You earn +5 logic when your statement produces a real debate —
					both sides must argue. If one side is still empty at the deadline it
					concludes unopposed and nobody scores, you included.{" "}
					<Link
						href="/rules"
						className="text-primary underline underline-offset-2 hover:text-white"
					>
						Read the rules
					</Link>
					.
				</p>
				<div className="pt-6 border-t border-outline-variant/30 flex flex-col md:flex-row gap-6 items-center justify-between">
					<div className="flex items-center gap-4 text-on-surface-variant">
						<div className="flex">
							<div className="w-8 h-8 bg-surface-container-high border border-outline-variant flex items-center justify-center">
								<LuGavel className="text-xs" />
							</div>
							<div className="w-8 h-8 bg-surface-container-high border border-outline-variant flex items-center justify-center">
								<LuChartColumn className="text-xs" />
							</div>
						</div>
						<span className="font-label text-[10px] uppercase tracking-widest">
							{checking ? "ARBITER ANALYZING" : "ARBITER STANDING BY"}
						</span>
					</div>
					{stage !== "broadcast" && (
						<Button
							type="button"
							size="lg"
							className="w-full md:w-auto"
							disabled={!isTextInLimits(text) || busy}
							onClick={handleCheck}
						>
							{checking ? "Analyzing…" : "Check eligibility"}
							{checking ? (
								<span className="border-t-2 border-on-primary h-4 w-4 rounded-full animate-spin motion-reduce:animate-none"></span>
							) : (
								<LuBot className="text-lg" />
							)}
						</Button>
					)}
				</div>
			</form>
			{verdict && (
				<VerdictPanel
					verdict={verdict}
					selectedDomain={selectedDomain}
					chosenVersion={chosenVersion}
					onChooseVersion={handleChooseVersion}
					onTryReframe={handleTryReframe}
					similar={similar}
				/>
			)}
			{verdict?.status === "pass" && (
				<BroadcastPreview
					content={chosenContent}
					keyword={verdict.keyword}
					domain={verdict.domain}
					username={authUser?.username ?? null}
					avatar={avatar}
					requiresLogin={authUser === null}
					casting={casting}
					notice={castNotice}
					onBroadcast={handleBroadcast}
				/>
			)}
		</div>
	);
};

export default StatementForm;
