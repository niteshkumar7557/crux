// The certificate layout, rendered by satori.

import { TOKENS } from "./verdictCard";
import type { CertificateModel } from "./certificate";
import type { AnalysisModel } from "./certificateAnalysis";
import { BODY, MONO, SERIF } from "@/app/_utils/ogFonts";

export const CERT_SIZE = { width: 1200, height: 1500 };

const PAD = 64;

const SIDES = {
  for: { label: "The Case For", accent: TOKENS.forSide },
  against: { label: "The Case Against", accent: TOKENS.againstSide },
} as const;

const Rule = ({ margin = 0 }: { margin?: number }) => (
  <div
    style={{
      height: 1,
      width: "100%",
      backgroundColor: `${TOKENS.muted}33`,
      marginTop: margin,
      marginBottom: margin,
    }}
  />
);

const SectionLabel = ({
  children,
  color = TOKENS.muted,
}: {
  children: string;
  color?: string;
}) => (
  <div
    style={{
      fontSize: 16,
      letterSpacing: 4,
      color,
      marginBottom: 18,
    }}
  >
    {children}
  </div>
);

const AnalysisColumn = ({
  side,
  analysis,
}: {
  side: "for" | "against";
  analysis: AnalysisModel;
}) => {
  const { label, accent } = SIDES[side];
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        borderLeft: `2px solid ${accent}66`,
        paddingLeft: 20,
        gap: 14,
      }}
    >
      <div
        style={{
          fontSize: 19,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: accent,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      {analysis.lead && (
        <div
          style={{
            fontFamily: SERIF,
            fontStyle: "italic",
            fontSize: 27,
            lineHeight: 1.38,
            color: TOKENS.muted,
          }}
        >
          {analysis.lead}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {analysis.points.map((point, i) => (
          <div key={i} style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", width: 2, backgroundColor: accent }} />
            <div
              style={{
                flex: 1,
                fontFamily: BODY,
                fontSize: 21,
                lineHeight: 1.45,
                color: TOKENS.ink,
              }}
            >
              {point}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export function CertificateCard({ model }: { model: CertificateModel }) {
  const { card, analysis } = model;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: TOKENS.paper,
        padding: 28,
        fontFamily: MONO,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          border: `1px solid ${TOKENS.muted}55`,
          padding: PAD,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 20,
            letterSpacing: 5,
            color: TOKENS.muted,
          }}
        >
          <div>CRUX · CERTIFICATE OF VERDICT</div>
          <div>{model.reference}</div>
        </div>

        <Rule margin={34} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <SectionLabel>THE MOTION</SectionLabel>
          <div
            style={{
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: 56,
              lineHeight: 1.28,
              color: TOKENS.ink,
            }}
          >
            {`“${model.claim}”`}
          </div>
        </div>

        <div style={{ display: "flex", flexGrow: 1, minHeight: 44 }} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <SectionLabel color={card.accent}>THE VERDICT</SectionLabel>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 26,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontSize: 76,
                fontWeight: 700,
                letterSpacing: 2,
                color: card.accent,
              }}
            >
              {card.label}
            </div>
            {card.score && (
              <div style={{ fontSize: 26, color: TOKENS.muted }}>
                {card.score}
              </div>
            )}
          </div>

          {card.split && (
            <div
              style={{
                display: "flex",
                height: 18,
                width: "100%",
                backgroundColor: TOKENS.track,
                marginTop: 26,
              }}
            >
              <div
                style={{ flex: card.split.for, backgroundColor: TOKENS.forSide }}
              />
              <div
                style={{
                  flex: card.split.against,
                  backgroundColor: TOKENS.againstSide,
                }}
              />
            </div>
          )}

          {card.heroLine && (
            <div
              style={{
                fontFamily: SERIF,
                fontStyle: "italic",
                fontSize: 32,
                lineHeight: 1.45,
                color: TOKENS.muted,
                marginTop: 30,
              }}
            >
              {`“${card.heroLine}”`}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexGrow: 1, minHeight: 44 }} />

        {analysis && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Rule margin={0} />
            <div style={{ marginTop: 26, display: "flex" }}>
              <SectionLabel>CRUX AI ANALYSIS</SectionLabel>
            </div>
            <div style={{ display: "flex", gap: 48, marginTop: 8 }}>
              <AnalysisColumn side="for" analysis={analysis.for} />
              <AnalysisColumn side="against" analysis={analysis.against} />
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexGrow: 1, minHeight: 40 }} />

        <Rule margin={0} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 22,
            fontSize: 19,
            letterSpacing: 2,
            color: TOKENS.muted,
          }}
        >
          <div
            style={{ color: card.mvpUsername ? TOKENS.laurel : TOKENS.muted }}
          >
            {model.footer}
          </div>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 26 }}>
            Crux
          </div>
        </div>
      </div>
      </div>
  );
}
