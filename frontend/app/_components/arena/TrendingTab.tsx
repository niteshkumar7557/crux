"use client";
import { useEffect, useRef, useState } from "react";
import ArenaPrimaryCard from "./ArenaPrimaryCard";
import ArenaSecondaryCard from "./ArenaSecondaryCard";
import ThesisCard from "./ThesisCard";
import { PrimaryCardDataType, SecondaryCardsDataType } from "@/app/types";
import api from "@/app/axios";
import { gsap, useGSAP } from "@/app/_utils/gsap";

const TrendingTab = () => {
	const [primaryCardData, setPrimaryCardData] = useState<
		PrimaryCardDataType[]
	>([]);
	const [secondaryCardsData, setSecondaryCardsData] = useState<
		SecondaryCardsDataType[]
	>([]);
	const [loading, setLoading] = useState(true);

	const containerRef = useRef<HTMLDivElement>(null);

	useGSAP(
		() => {
			if (!primaryCardData.length) return;

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
			dependencies: [primaryCardData],
		},
	);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [primaryResponse, secondaryResponse] = await Promise.all([
					api.get("/arena/active/primary"),
					api.get("/arena/active/secondary"),
				]);
				setPrimaryCardData(primaryResponse.data ?? []);
				setSecondaryCardsData(secondaryResponse.data ?? []);
			} catch (error) {
				console.error("Failed to load homepage arena data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	if (loading) {
		return <div>Loading...</div>;
	}

	return (
		<div ref={containerRef}>
			{primaryCardData.length > 0 && secondaryCardsData.length > 0 ? (
				<div>
					{primaryCardData.map((e) => (
						<ArenaPrimaryCard
							key={e.argumentId}
							domain={e.domain}
							username={e.username}
							avatar={e.avatar}
							content={e.content}
							count_comments={e.count_comments}
							affirmative={e.affirmative}
							negative={e.negative}
							argumentId={e.argumentId}
                            status={e.status}
                            closesAt={e.closesAt}
                            isDotd={e.isDotd}
						/>
					))}

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
								votes={e.votes}
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
