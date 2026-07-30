// 404.
import { LuArrowRight } from "react-icons/lu";
import Button from "./_components/ui/Button";

const NotFound = () => (
  <main className="relative min-h-[70vh] flex items-center justify-center px-6 overflow-hidden">
    <div className="max-w-xl w-full border border-ink-faint bg-band p-10 md:p-14 text-center">
      <span className="font-label text-[10px] uppercase tracking-[0.3em] text-ink-soft block mb-4">
        404 — Signal Lost
      </span>
      <h1 className="display-type text-[clamp(1.9rem,4vw,2.8rem)] text-ink mb-5">
        This Debate Doesn&rsquo;t Exist
      </h1>
      <p className="font-body text-sm text-ink-soft leading-relaxed mb-10">
        The page you&rsquo;re looking for was never argued, or it left the
        arena. Head back and pick a fight that&rsquo;s still live.
      </p>
      <Button size="lg" href="/arena">
        Back to the Arena
        <LuArrowRight className="text-lg" />
      </Button>
    </div>
  </main>
);

export default NotFound;
