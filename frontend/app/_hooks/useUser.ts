import { useEffect, useState } from "react";
import { getUser } from "../_utils/getUser";
import { jwtPayload } from "../_types/jwt";

export function useUser() {
  const [user, setUser] = useState<jwtPayload | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const userInfo = await getUser();
      setUser(userInfo);
    }
    fetchUser();
  }, []);

  return user;
}
