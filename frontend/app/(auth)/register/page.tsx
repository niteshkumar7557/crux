"use client";
import api from "@/app/axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DiRuby } from "react-icons/di";
import { FaBalanceScale } from "react-icons/fa";
import { IoIosArrowRoundForward } from "react-icons/io";
import { LuLockKeyhole, LuUser } from "react-icons/lu";
import { MdOutlineEmail, MdOutlineVerifiedUser } from "react-icons/md";
import Button from "@/app/_components/ui/Button";

const Register = () => {
  const [name, setName] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [error, setError] = useState("");

  const router = useRouter();

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const info = {
      name,
      userName,
      email,
      password,
    };
    try {
      const response = await api.post("/user/register", info);
      localStorage.setItem("access_token", response.data.accessToken);
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  }

  return (
    <>
      <main className="relative min-h-screen grow flex items-center justify-center pt-14 pb-12 px-6">
        {/* <!-- Background Technical Layer --> */}
        <div className="absolute inset-0 technical-grid -z-5"></div>
        <div className="absolute inset-0 bg-radial-at-c from-primary/5 via-transparent to-transparent -z-5"></div>

        <div className="w-full max-w-5xl grid md:grid-cols-12 gap-0 border border-outline-variant/15 shadow-2xl shadow-primary/5 bg-surface-container-lowest">
          <div className="md:col-span-7 p-10 md:p-16 flex flex-col justify-center">
            <div className="mb-12">
              <span className="font-label text-[10px] tracking-[0.3em] text-primary uppercase mb-4 block">
                ENLISTMENT PROTOCOL
              </span>
              <h1 className="font-headline text-5xl md:text-6xl text-on-surface italic leading-none">
                Join the Intellectual Fray
              </h1>
            </div>
            <form className="space-y-8" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label
                  className="block font-label text-[10px] uppercase tracking-widest text-outline"
                  htmlFor="name"
                >
                  Nom de Guerre / Full Name
                </label>
                <div className="relative group">
                  <LuUser className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-lg" />
                  <input
                    className="w-full bg-surface-container-highest border-none text-on-surface py-3 pl-11 pr-4 focus:ring-1 focus:ring-primary placeholder:text-outline transition-all font-body text-sm"
                    id="name"
                    placeholder="Enter Identity..."
                    required={true}
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label
                  className="block font-label text-[10px] uppercase tracking-widest text-outline"
                  htmlFor="username"
                >
                  Unique Identity / Username
                </label>
                <div className="relative group">
                  <DiRuby className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-lg" />
                  <input
                    className="w-full bg-surface-container-highest border-none text-on-surface py-3 pl-11 pr-4 focus:ring-1 focus:ring-primary placeholder:text-outline transition-all font-body text-sm"
                    id="username"
                    placeholder="Enter Identity..."
                    required={true}
                    type="text"
                    autoComplete="username"
                    value={userName}
                    onChange={(e) => setUserName(e.currentTarget.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label
                  className="block font-label text-[10px] uppercase tracking-widest text-outline"
                  htmlFor="email"
                >
                  Secure Communication / Email
                </label>
                <div className="relative group">
                  <MdOutlineEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-lg" />
                  <input
                    className="w-full bg-surface-container-highest border-none text-on-surface py-3 pl-11 pr-4 focus:ring-1 focus:ring-primary placeholder:text-outline transition-all font-body text-sm"
                    id="email"
                    placeholder="user@crux-protocol.io"
                    required={true}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.currentTarget.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label
                    className="block font-label text-[10px] uppercase tracking-widest text-outline"
                    htmlFor="password"
                  >
                    Access Key / Password
                  </label>
                </div>
                <div className="relative group">
                  <LuLockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-lg" />
                  <input
                    className="w-full bg-surface-container-highest border-none text-on-surface py-3 pl-11 pr-4 focus:ring-1 focus:ring-primary placeholder:text-outline transition-all font-body text-sm"
                    id="password"
                    placeholder="••••••••••••"
                    required={true}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                  />
                </div>
                <div className="flex justify-between">
                  <p className="font-label text-[10px] uppercase tracking-widest text-secondary cursor-default">
                    {error}
                  </p>
                  <a
                    className="font-label text-[10px] uppercase tracking-widest text-primary hover:underline decoration-primary transition-all"
                    href="#"
                  >
                    Forgot Password?
                  </a>
                </div>
              </div>

              <div className="pt-6">
                <Button type="submit" size="lg" className="w-full">
                  JOIN THE FRAY
                  <IoIosArrowRoundForward className="text-lg" />
                </Button>
              </div>
            </form>
            <p className="mt-8 text-outline text-xs font-body">
              By entering the arena, you agree to the{" "}
              <a className="text-primary hover:underline" href="#">
                CONSTITUTION
              </a>{" "}
              and{" "}
              <a className="text-primary hover:underline" href="#">
                PROTOCOL
              </a>
              .
            </p>
          </div>
          <div className="md:col-span-5 bg-surface-container border-l border-outline-variant/15 flex flex-col">
            <div className="relative h-48 md:h-64 overflow-hidden">
              <img
                className="w-full h-full object-cover grayscale opacity-60"
                alt=""
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkgpIew1fdUvf7p8_I1gPEDxnhI_AYhnwLdKCpkD23uyKJgPUQ717z1NwADtWDqvfFny8RKu8LKuyuG9nt5_VOP6ZiKTro5FR8GunuEeSud_Z2guVkXj-4i9PNK3kxHM7K6XW08rKWTGGicMwzlwTy9GYmgw16EysO40rELyN2DszfgnmKb5ku7tpatCyP-oqRnJNY2Dltz_fKntlJem8TqwDmjhUJNYbJmP15gA67-0e5wz_dgxpXC89UuXzKT9hENHk3IV2Xetpb"
              />
              <div className="absolute inset-0 bg-linear-to-t from-surface-container to-transparent"></div>
              <div className="absolute bottom-6 left-10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary animate-pulse motion-reduce:animate-none"></div>
                  <span className="font-label text-[10px] tracking-widest text-primary font-bold">
                    STATUS: RECRUITMENT OPEN
                  </span>
                </div>
              </div>
            </div>
            <div className="p-10 grow">
              <h2 className="font-headline text-2xl text-on-surface italic mb-6">
                Crux Reputation
              </h2>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-surface-container-high flex items-center justify-center">
                    <MdOutlineVerifiedUser className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-label text-xs tracking-widest text-primary uppercase mb-1">
                      EVIDENCE-BASED SCORING
                    </h3>
                    <p className="text-on-surface-variant text-sm leading-relaxed">
                      Your standing is determined by the rigor of your sources
                      and the logical consistency of your arguments.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-surface-container-high flex items-center justify-center">
                    <FaBalanceScale className="text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-label text-xs tracking-widest text-secondary uppercase mb-1">
                      CIVILITY MULTIPLIER
                    </h3>
                    <p className="text-on-surface-variant text-sm leading-relaxed">
                      Passive aggression or logical fallacies deplete your
                      weight. Steel-manning opponents increases your Crux Rank.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Register;
