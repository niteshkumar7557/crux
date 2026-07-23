"use client";
import ActiveArgumentsNavbar from "./ActiveArgumentsNavbar";
import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";
import NewestTab from "./NewestTab";
import TrendingTab from "./TrendingTab";

const tabList = ["trending", "newest"];

// The active tab and the newest feed's page both live in the URL, so a pager
// link can say which tab it belongs to and a refresh lands where you were.
// Tab links are soft navigations, so this component stays mounted and the
// crossfade below still reads as a tab switch rather than a page load.
export function feedHref(tab: string, page = 1): string {
  if (tab !== "newest") return "/";
  return page > 1 ? `/?tab=newest&page=${page}` : "/?tab=newest";
}

const ActiveArguments = () => {
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
			<ActiveArgumentsNavbar
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

export default ActiveArguments;
