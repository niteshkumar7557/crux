"use client";
import TopDebaters from "./TopDebaters";
import SystemHealth from "./SystemHealth";
import TrendingTopics from "./TrendingTopics";
import {
  SystemHealthData,
  TopDebatersCardData,
  TrendingTopicsCardData,
} from "@/app/types";
import { useEffect, useRef, useState } from "react";
import api from "@/app/axios";
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";

const ArenaSidebar = () => {
  const [trendingTopicsData, setTrendingTopicsData] =
    useState<TrendingTopicsCardData>([]);
  const [topDebatersData, setTopDebatersData] = useState<TopDebatersCardData>(
    [],
  );
  const [systemHealthData, setSystemHealthData] = useState<SystemHealthData>({
    logicStacked: 0,
    activeArenas: 0,
  });

  useEffect(() => {
    async function getData() {
      try {
        const { data } = await api.get("/arena/sidebar");
        if (data.length !== 0) {
          setTrendingTopicsData(data.data1);
          setTopDebatersData(data.data2);
          setSystemHealthData(data.data3[0]);
        }
      } catch (error) {
        console.error("Failed to load arena sidebar data:", error);
      }
    }
    getData();
  }, []);

  const sidebarRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          sidebarRef.current!.children,
          { opacity: 0.25, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.12,
            delay: 0.25,
            ease: "power3.out",
            clearProps: "opacity,transform",
          },
        );
      });
    },
    { scope: sidebarRef },
  );

  return (
    <div ref={sidebarRef} className="py-10 md:w-[30%]">
      <TrendingTopics data={trendingTopicsData} />
      <TopDebaters data={topDebatersData} />
      <SystemHealth data={systemHealthData} />
    </div>
  );
};

export default ArenaSidebar;
