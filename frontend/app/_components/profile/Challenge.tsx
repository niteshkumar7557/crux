import Button from "@/app/_components/ui/Button";

const Challenge = () => {
  return (
    <section className="mt-18 bg-surface-bright/40 backdrop-blur-xl border border-outline-variant/20 p-12 text-center relative">
      <h2 className="font-headline text-5xl font-bold italic mb-6">
        Your knowledge is the only currency here.
      </h2>
      <p className="font-body text-outline mb-10 max-w-2xl mx-auto">
        Step into the arena and validate your claims against the global
        intellectual collective.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-6">
        <Button href="/" size="lg">
          Enter The Arena
        </Button>
        <Button href="/leaderboard" variant="outline-neutral" size="lg">
          View Leaderboard
        </Button>
      </div>
    </section>
  );
};

export default Challenge;
