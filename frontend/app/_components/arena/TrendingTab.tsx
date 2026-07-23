"use client";
import { useEffect, useRef, useState } from "react";
import ArenaPrimaryCard from "./ArenaPrimaryCard";
import ArenaSecondaryCard from "./ArenaSecondaryCard";
import ThesisCard from "./ThesisCard";
import { PrimaryCardDataType, SecondaryCardsDataType } from "@/app/types";
import api from "@/app/axios";
import { gsap, useGSAP } from "@/app/_utils/gsap";
import { shouldAnimate } from "@/app/_utils/animateOnce";

const TrendingTab = () => {
	// The hero is ONE debate (§11's Debate of the Day), so the API returns a
	// single object -- and an empty {} when nothing is crowned.
	const [primaryCardData, setPrimaryCardData] =
		useState<PrimaryCardDataType | null>(null);
	const [secondaryCardsData, setSecondaryCardsData] = useState<
		SecondaryCardsDataType[]
	>([]);
	const [loading, setLoading] = useState(true);

	const containerRef = useRef<HTMLDivElement>(null);

	useGSAP(
		() => {
			// The container is always mounted (the loading state renders inside
			// it), but bail defensively -- a null scope makes gsap fall back to
			// the context selector and warn "Invalid scope".
			if (!containerRef.current) return;

			// Client-fetched, and re-mounted on every tab switch, so it owns its
			// key. The tab-switch crossfade in ActiveArguments is NOT gated —
			// that one answers a click and has to fire every time.
			if (!shouldAnimate("/#trending")) return;

			const cards = gsap.utils.toArray(
				"[data-reveal]",
				containerRef.current,
			);

			if (!cards.length) return;

			gsap.fromTo(
				cards,
				{
					opacity: 0.25,
				},
				{
					opacity: 1,
					stagger: 0.07,
					duration: 0.7,
					ease: "power3.out",
					clearProps: "opacity,transform",
				},
			);
		},
		{
			scope: containerRef,
			// `loading` matters too: when the fetch fails the data deps never
			// change, so without it the reveal would never fire.
			dependencies: [loading, primaryCardData, secondaryCardsData],
		},
	);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [primaryResponse, secondaryResponse] = await Promise.all([
					api.get("/arena/active/primary"),
					api.get("/arena/active/secondary"),
				]);
				// Both endpoints answer with a bare {} when the stage is empty.
				const primary = primaryResponse.data as PrimaryCardDataType | null;
				setPrimaryCardData(primary?.argumentId ? primary : null);
				setSecondaryCardsData(
					Array.isArray(secondaryResponse.data)
						? secondaryResponse.data
						: [],
				);
			} catch (error) {
				console.error("Failed to load homepage arena data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	return (
		<div ref={containerRef}>
			{loading ? (
				<div>Loading...</div>
			) : primaryCardData || secondaryCardsData.length > 0 ? (
				<div>
					{primaryCardData && (
						<ArenaPrimaryCard
							domain={primaryCardData.domain}
							username={primaryCardData.username}
							avatar={primaryCardData.avatar}
							content={primaryCardData.content}
							count_comments={primaryCardData.count_comments}
							affirmative={primaryCardData.affirmative}
							negative={primaryCardData.negative}
							argumentId={primaryCardData.argumentId}
							status={primaryCardData.status}
							closesAt={primaryCardData.closesAt}
							isDotd={primaryCardData.isDotd}
						/>
					)}

					<div className="mb-5 md:flex md:flex-wrap md:justify-between">
						{secondaryCardsData.map((e) => (
							<ArenaSecondaryCard
								key={e.argumentid}
								username={e.username}
								avatar={e.avatar}
								domain={e.domain}
								title={e.title}
								affirmativescore={e.affirmativescore}
								negativescore={e.negativescore}
								argumentid={e.argumentid}
								status={e.status}
								closesAt={e.closesAt}
								className="md:w-[49%]"
								footerLeft={`${e.active_minds} Active ${
									e.active_minds === 1 ? "Mind" : "Minds"
								}`}
							/>
						))}
					</div>

					<ThesisCard />
				</div>
			) : (
				<ThesisCard />
			)}
		</div>
	);
};

export default TrendingTab;
