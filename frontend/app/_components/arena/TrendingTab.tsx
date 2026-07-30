"use client";

// The feed ranked by heat. Spec: game-theory.md §15

import { useEffect, useRef, useState } from "react";
import ArenaPrimaryCard from "./ArenaPrimaryCard";
import ArenaSecondaryCard from "./ArenaSecondaryCard";
import InviteCard from "./InviteCard";
import { PrimaryCardDataType, SecondaryCardsDataType } from "@/app/types";
import api from "@/app/axios";
import { gsap, useGSAP } from "@/app/_utils/gsap";
import { shouldAnimate } from "@/app/_utils/animateOnce";

const TrendingTab = () => {
	const [primaryCardData, setPrimaryCardData] =
		useState<PrimaryCardDataType | null>(null);
	const [secondaryCardsData, setSecondaryCardsData] = useState<
		SecondaryCardsDataType[]
	>([]);
	const [loading, setLoading] = useState(true);

	const containerRef = useRef<HTMLDivElement>(null);

	useGSAP(
		() => {
			if (!containerRef.current) return;

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
				const primary = primaryResponse.data as PrimaryCardDataType | null;
				setPrimaryCardData(primary?.motionId ? primary : null);
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
				<p className="py-16 text-center font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
					Calling the room to order…
				</p>
			) : primaryCardData || secondaryCardsData.length > 0 ? (
				<div>
					{primaryCardData && (
						<ArenaPrimaryCard
							domain={primaryCardData.domain}
							username={primaryCardData.username}
							avatar={primaryCardData.avatar}
							content={primaryCardData.content}
							count_arguments={primaryCardData.count_arguments}
							affirmative={primaryCardData.affirmative}
							negative={primaryCardData.negative}
							motionId={primaryCardData.motionId}
							status={primaryCardData.status}
							closesAt={primaryCardData.closesAt}
							isMotd={primaryCardData.isMotd}
						/>
					)}

					<div className="mb-5 md:flex md:flex-wrap md:justify-between">
						{secondaryCardsData.map((e) => (
							<ArenaSecondaryCard
								key={e.motionid}
								username={e.username}
								avatar={e.avatar}
								domain={e.domain}
								title={e.title}
								affirmativescore={e.affirmativescore}
								negativescore={e.negativescore}
								motionid={e.motionid}
								status={e.status}
								closesAt={e.closesAt}
								className="md:w-[49%]"
								footerLeft={`${e.active_minds} Active ${
									e.active_minds === 1 ? "Mind" : "Minds"
								}`}
							/>
						))}
					</div>

					<InviteCard />
				</div>
			) : (
				<InviteCard />
			)}
		</div>
	);
};

export default TrendingTab;
