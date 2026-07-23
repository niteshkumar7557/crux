import { Suspense } from "react";
import ActiveArguments from "./_components/arena/ActiveArguments";
import ArenaSidebar from "./_components/arena/ArenaSidebar";

const Home = () => {
	return (
		<div className="px-8 py-6 flex flex-col md:gap-10 md:flex-row">
			<div className="md:w-[70%]">
				{/* The feed reads its tab and page from the URL, so it needs a
				    boundary to be prerendered around. */}
				<Suspense fallback={null}>
					<ActiveArguments />
				</Suspense>
			</div>
			<ArenaSidebar />
		</div>
	);
};

export default Home;
