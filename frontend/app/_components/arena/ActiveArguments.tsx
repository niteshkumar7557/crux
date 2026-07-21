"use client";
import ActiveArgumentsNavbar from "./ActiveArgumentsNavbar";
import { useRef, useState } from "react";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";
import NewestTab from "./NewestTab";
import TrendingTab from "./TrendingTab";

const tabList = ["trending", "newest"];

const ActiveArguments = () => {
	const [activeTab, setActiveTab] = useState("trending");
	const feedRef = useRef<HTMLDivElement>(null);
	const tabContentRef = useRef<HTMLDivElement>(null);
	const mountedTab = useRef(false);

	const changeActive = (e: string) => {
		setActiveTab(e);
	};

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
				changeActive={changeActive}
			/>
			<div ref={tabContentRef}>
				{activeTab === "trending" && <TrendingTab />}
				{activeTab === "newest" && <NewestTab />}
			</div>
		</div>
	);
};

export default ActiveArguments;
