"use client";

// The Main Stage grid. Spec: game-theory.md §15

import ActiveMotionsNavbar from "./ActiveMotionsNavbar";
import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";
import NewestTab from "./NewestTab";
import TrendingTab from "./TrendingTab";

const tabList = ["trending", "newest"];

export function feedHref(tab: string, page = 1): string {
  if (tab !== "newest") return "/arena";
  return page > 1 ? `/arena?tab=newest&page=${page}` : "/arena?tab=newest";
}

const ActiveMotions = () => {
	const searchParams = useSearchParams();
	const activeTab = searchParams.get("tab") === "newest" ? "newest" : "trending";
	const parsedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
	const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

	const feedRef = useRef<HTMLDivElement>(null);
	const tabContentRef = useRef<HTMLDivElement>(null);
	const mountedTab = useRef(false);

	useGSAP(
		() => {
			if (!mountedTab.current) {
				mountedTab.current = true;
				return;
			}
			const mm = gsap.matchMedia();
			mm.add(MOTION_OK, () => {
				gsap.fromTo(
					tabContentRef.current,
					{ opacity: 0, x: 12 },
					{
						opacity: 1,
						x: 0,
						duration: 0.35,
						ease: "power2.out",
						clearProps: "opacity,transform",
					},
				);
			});
		},
		{ dependencies: [activeTab], scope: feedRef },
	);

	return (
		<div ref={feedRef}>
			<ActiveMotionsNavbar
				tabList={tabList}
				active={activeTab}
				hrefFor={(tab) => feedHref(tab)}
			/>
			<div ref={tabContentRef}>
				{activeTab === "trending" ? <TrendingTab /> : <NewestTab page={page} />}
			</div>
		</div>
	);
};

export default ActiveMotions;
