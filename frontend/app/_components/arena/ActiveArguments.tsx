"use client";
import MainTrendingArenaCard from "./MainTrendingArenaCard";
import ThesisCard from "./ThesisCard";
import ActiveArgumentsNavbar from "./ActiveArgumentsNavbar";
import { useRef, useState } from "react";
import NewestTab from "./NewestTab";
import { MainTrendingArenaCardData, TrendingArenaCardData } from "@/app/types";
import ArenaCard from "./ArenaCard";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";

const tabList = ["trending", "newest"]; // for future: "high stakes"

const ActiveArguments = ({
  mainTrendingArenaCardData,
  trendingArenaCardData,
}: {
  mainTrendingArenaCardData: MainTrendingArenaCardData;
  trendingArenaCardData: TrendingArenaCardData;
}) => {
  const [activeTab, setActiveTab] = useState("trending");
  const feedRef = useRef<HTMLDivElement>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);
  const mountedTab = useRef(false);

  const changeActive = (e: string) => {
    setActiveTab(e);
  };

  // Tab switches crossfade + slide the incoming panel; the initial mount is
  // handled by the [data-reveal] stagger below instead.
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

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // Cards start dimmed but always visible — never fully hidden while
        // waiting for their stagger slot.
        gsap.fromTo(
          "[data-reveal]",
          { opacity: 0.25, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.07,
            ease: "power3.out",
            clearProps: "opacity,transform",
          },
        );
      });
    },
    { scope: feedRef },
  );

  return (
    <div ref={feedRef}>
      <ActiveArgumentsNavbar
        tabList={tabList}
        active={activeTab}
        changeActive={changeActive}
      />
      <div ref={tabContentRef}>
      {activeTab === "trending" &&
        (mainTrendingArenaCardData.length > 0 &&
        trendingArenaCardData.length > 0 ? (
          <div>
            {mainTrendingArenaCardData.map((e, i) => (
              <MainTrendingArenaCard
                key={i}
                domain={e.domain}
                username={e.username}
                avatar={e.avatar}
                title={e.title}
                argumentNum={e.argumentNum}
                argumentQuality={e.argumentQuality}
                affirmativeScore={e.affirmativeScore}
                negativeScore={e.negativeScore}
                argumentId={e.argumentId}
              />
            ))}
            <div className="font-label text-[10px] text-tertiary uppercase tracking-[0.25em] mt-6 mb-1">
              Main Stage — Featured Live Matches
            </div>
            <div className="mb-5 md:flex md:flex-wrap md:justify-between">
              {trendingArenaCardData
                .map((e, i) => (
                  <ArenaCard
                    key={i}
                    username={e.username}
                    avatar={e.avatar}
                    domain={e.domain}
                    title={e.title}
                    affirmativescore={e.affirmativescore}
                    negativescore={e.negativescore}
                    argumentid={e.argumentid}
                    status={e.status}
                    closesAt={e.closesAt}
                    winner={e.winner}
                    votes={e.votes}
                    className="md:w-[49%]"
                    footerLeft={`${e.active_minds} Active ${e.active_minds === 1 ? "Mind" : "Minds"}`}
                  />
                ))}
            </div>
            <ThesisCard />
          </div>
        ) : (
          <div>
            <ThesisCard />
          </div>
        ))}
      {activeTab === "newest" && <NewestTab />}
      </div>
    </div>
  );
};

export default ActiveArguments;
