import { Suspense } from "react";
import ActiveMotions from "./_components/arena/ActiveMotions";
import ArenaSidebar from "./_components/arena/ArenaSidebar";

const Home = () => {
	return (
		<div className="px-8 py-6 flex flex-col md:gap-10 md:flex-row">
			<div className="md:w-[70%]">
				{/* The feed reads its tab and page from the URL, so it needs a
				    boundary to be prerendered around. */}
				<Suspense fallback={null}>
					<ActiveMotions />
				</Suspense>
			</div>
			<ArenaSidebar />
		</div>
	);
};

export default Home;
