// Bare /profile — redirects to the signed-in user's canonical URL.

import { redirect } from "next/navigation";

const Profile = () => {
  redirect("/profile/me");
};

export default Profile;
