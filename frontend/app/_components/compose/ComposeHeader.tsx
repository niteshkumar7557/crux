const ComposeHeader = () => {
  return (
    <div className="mb-14">
      <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
        <span aria-hidden className="h-px w-8 bg-ink-faint" />
        Enter the arena
      </p>
      <h1 className="mt-5 display-type text-[clamp(2.4rem,6vw,4.2rem)] text-ink">
        Issue a Motion
      </h1>
      <p className="mt-5 max-w-xl font-headline text-lg leading-relaxed text-ink-soft">
        One claim. One arena. No neutral ground.
      </p>
    </div>
  );
};

export default ComposeHeader;
