import { TOKENS } from "./verdictCard";
import type { CertificateModel } from "./certificate";
import type { AnalysisModel } from "./certificateAnalysis";
import { BODY, MONO, SERIF } from "@/app/_utils/ogFonts";

// The certificate's layout, kept apart from the route that serves it: the route
// owns fetching and headers, this owns the picture. Split so the card can be
// rendered against a hand-built model — a walkover, or a debate whose analyses
// never landed — without needing such a row to exist in the database.

// Portrait: the card carries a verdict AND both sides of the arbiter's reading,
// which will not breathe at link-preview proportions. `opengraph-image.tsx`
// stays 1200×630 for scrapers; this one is for a person to keep and post.
export const CERT_SIZE = { width: 1200, height: 1500 };

// globals.css `.perspective-grid` — a 40px cyan lattice at 5%. satori will not
// tile a repeating gradient, so the lattice is drawn as hairlines.
const GRID_STEP = 40;
const GRID_LINE = "rgba(164, 230, 255, 0.05)";
const PAD = 64;

const SIDES = {
  for: { label: "The Case For", accent: TOKENS.cyan },
  against: { label: "The Case Against", accent: TOKENS.red },
} as const;

/** The site's faint technical lattice, as explicit hairlines. */
function Grid() {
  const columns = Math.ceil(CERT_SIZE.width / GRID_STEP);
  const rows = Math.ceil(CERT_SIZE.height / GRID_STEP);
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: CERT_SIZE.width,
        height: CERT_SIZE.height,
        display: "flex",
      }}
    >
      {Array.from({ length: columns }, (_, i) => (
        <div
          key={`c${i}`}
          style={{
            position: "absolute",
            top: 0,
            left: i * GRID_STEP,
            width: 1,
            height: CERT_SIZE.height,
            backgroundColor: GRID_LINE,
          }}
        />
      ))}
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={`r${i}`}
          style={{
            position: "absolute",
            left: 0,
            top: i * GRID_STEP,
            width: CERT_SIZE.width,
            height: 1,
            backgroundColor: GRID_LINE,
          }}
        />
      ))}
    </div>
  );
}

const Rule = ({ margin = 0 }: { margin?: number }) => (
  <div
    style={{
      height: 1,
      width: "100%",
      backgroundColor: `${TOKENS.outline}33`,
      marginTop: margin,
      marginBottom: margin,
    }}
  />
);

/** The site's section vocabulary: uppercase, widely tracked, in the mono. */
const SectionLabel = ({
  children,
  color = TOKENS.outline,
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

/** One side of the arbiter's reading, behind its own accent rail. */
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
            color: TOKENS.onSurfaceVariant,
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
                color: TOKENS.onSurface,
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

/** The certificate picture. Pure — every input arrives on `model`. */
export function CertificateCard({ model }: { model: CertificateModel }) {
  const { card, analysis } = model;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: TOKENS.bg,
        padding: 28,
        fontFamily: MONO,
      }}
    >
      <Grid />
      {/* The rule frame — what makes it read as a document rather than a
          share image at the same dimensions. */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          border: `1px solid ${TOKENS.outline}55`,
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
            color: TOKENS.outline,
          }}
        >
          <div>CRUX · CERTIFICATE OF VERDICT</div>
          <div>{model.reference}</div>
        </div>

        <Rule margin={34} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <SectionLabel>THE STATEMENT</SectionLabel>
          <div
            style={{
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: 56,
              lineHeight: 1.28,
              color: TOKENS.onSurface,
            }}
          >
            {`“${model.claim}”`}
          </div>
        </div>

        {/* Space is shared between the three blocks rather than dumped at the
            foot, so a short claim or a missing analysis still fills the page
            instead of leaving a void above the footer. */}
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
              <div style={{ fontSize: 26, color: TOKENS.onSurfaceVariant }}>
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
                style={{ flex: card.split.for, backgroundColor: TOKENS.cyan }}
              />
              <div
                style={{
                  flex: card.split.against,
                  backgroundColor: TOKENS.red,
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
                color: TOKENS.onSurfaceVariant,
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
            color: TOKENS.outline,
          }}
        >
          <div
            style={{ color: card.mvpUsername ? TOKENS.amber : TOKENS.outline }}
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
