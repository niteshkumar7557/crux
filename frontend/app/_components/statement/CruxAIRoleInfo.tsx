import { MdOutlineGroup, MdOutlinePsychology } from "react-icons/md";

const CruxAIRoleInfo = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-surface-container p-6 border-l border-tertiary/30">
        <h4 className="font-label text-[10px] uppercase tracking-[0.2em] text-tertiary mb-3 flex items-center gap-2">
          <MdOutlinePsychology className="text-sm" />
          Autonomous Adjudication
        </h4>
        <p className="font-body text-xs text-on-surface-variant leading-relaxed">
          The Crux Engine dissects your statement for argumentative integrity —
          flagging logical fallacies, measuring controversy potential, and
          issuing a verdict before anything reaches the arena. Weak claims don't
          survive.
        </p>
      </div>
      <div className="bg-surface-container p-6 border-l border-primary/30">
        <h4 className="font-label text-[10px] uppercase tracking-[0.2em] text-primary mb-3 flex items-center gap-2">
          <MdOutlineGroup className="text-sm" />
          Matchmaking Logic
        </h4>
        <p className="font-body text-xs text-on-surface-variant leading-relaxed">
          Once live, Crux scans its debater pool for opponents with
          contradicting historical positions and high Logic Scores in your
          domain. The arena doesn't do friendly debates.
        </p>
      </div>
    </div>
  );
};

export default CruxAIRoleInfo;
