"use client";
import TopDebaters from "./TopDebaters";
import SystemHealth from "./SystemHealth";
import TrendingTopics from "./TrendingTopics";
import {
  SystemHealthData,
  TopDebatersCardData,
  TrendingTopicsCardData,
} from "@/app/types";
import { useEffect, useState } from "react";
import api from "@/app/axios";

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

  return (
    <div className="py-10 md:w-[30%]">
      <TrendingTopics data={trendingTopicsData} />
      <TopDebaters data={topDebatersData} />
      <SystemHealth data={systemHealthData} />
    </div>
  );
};

export default ArenaSidebar;
