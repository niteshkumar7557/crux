import { LuArrowRight } from "react-icons/lu";
import Button from "./_components/ui/Button";

const NotFound = () => (
  <main className="relative min-h-[70vh] flex items-center justify-center px-6 overflow-hidden">
    <div className="absolute inset-0 technical-grid -z-10 pointer-events-none"></div>
    <div className="max-w-xl w-full border-l-2 border-primary bg-surface-container-low p-10 md:p-14 text-center">
      <span className="font-label text-[10px] uppercase tracking-[0.3em] text-primary block mb-4">
        404 — Signal Lost
      </span>
      <h1 className="font-headline italic text-4xl md:text-5xl text-on-surface leading-tight mb-4">
        This Debate Doesn&rsquo;t Exist
      </h1>
      <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-10">
        The page you&rsquo;re looking for was never argued, or it left the
        arena. Head back and pick a fight that&rsquo;s still live.
      </p>
      <Button size="lg" href="/">
        Back to the Arena
        <LuArrowRight className="text-lg" />
      </Button>
    </div>
  </main>
);

export default NotFound;
