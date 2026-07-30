// The structured data a debate page publishes, and which schema.org type it is.
//
// A debate changes type when it ends. While it runs it is a forum thread — a claim
// two sides are still arguing, with no answer to offer. Once the Verdict Judge rules,
// the verdict IS the answer, so it becomes a QAPage. Emitting QAPage while the debate
// is live is what the previous version did, and Google rejects a QAPage whose
// answerCount is 0: it advertised a rich result the page could never earn.
//
// A walkover concludes with no verdict text (§11), so it stays a forum thread.
// Spec: game-theory.md §11

export interface DebateJsonLdInput {
  claim: string;
  url: string;
  status: string;
  verdictText: string | null;
  authorUsername: string | null;
  authorUrl: string | null;
  createdAt: string | null;
  argumentCount: number;
}

/** ISO 8601, or null if the timestamp is missing or unparseable. */
function isoDate(value: string | null): string | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

export function debateJsonLd(
  input: DebateJsonLdInput,
): Record<string, unknown> {
  const { claim, url, status, verdictText, argumentCount } = input;
  const verdict = verdictText?.trim() ?? "";

  // Concluded WITH a ruling: the claim is the question, the verdict is the answer.
  if (status === "concluded" && verdict) {
    return {
      "@context": "https://schema.org",
      "@type": "QAPage",
      url,
      mainEntity: {
        "@type": "Question",
        name: claim,
        text: claim,
        answerCount: 1,
        acceptedAnswer: {
          "@type": "Answer",
          text: verdict,
          url,
        },
      },
    };
  }

  // Live, or a walkover that never produced a ruling.
  const published = isoDate(input.createdAt);
  const author = input.authorUsername;

  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": url,
    url,
    headline: claim,
    text: claim,
    ...(published ? { datePublished: published } : {}),
    ...(author
      ? {
          author: {
            "@type": "Person",
            name: author,
            ...(input.authorUrl ? { url: input.authorUrl } : {}),
          },
        }
      : {}),
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: Math.max(0, argumentCount),
    },
  };
}
