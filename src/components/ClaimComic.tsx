import { MathText } from './MathText';

/** One speaker in a two-claim comic: a name and the claim they argue. */
export type ClaimSpeaker = { name: string; claim: string };

/**
 * A boy cartoon avatar — a single friendly line-art figure (head, hair, body), drawn from design
 * tokens so it prints crisply in colour, grayscale and forced-colors. `variant` gives the two
 * speakers a slightly different look (hair / shirt) so they read as two different kids.
 */
function BoyAvatar({ variant }: { variant: 0 | 1 }) {
  return (
    <svg className="comic-avatar" viewBox="0 0 64 72" width="64" height="72" role="img" aria-hidden="true" focusable="false">
      {/* shirt */}
      <path className="comic-shirt" d={variant === 0
        ? 'M14 72 v-9 a18 18 0 0 1 36 0 v9 z'
        : 'M14 72 v-8 a18 18 0 0 1 36 0 v8 z'} />
      {/* neck + head */}
      <rect className="comic-skin" x="28" y="38" width="8" height="8" rx="3" />
      <circle className="comic-skin comic-head" cx="32" cy="28" r="15" />
      {/* hair */}
      <path className="comic-hair" d={variant === 0
        ? 'M17 27 a15 15 0 0 1 30 0 q-6 -8 -15 -8 q-9 0 -15 8 z'
        : 'M18 24 q3 -12 14 -12 q11 0 14 12 q-4 -3 -7 -2 q-2 -4 -7 -4 q-5 0 -7 4 q-3 -1 -7 2 z'} />
      {/* eyes + smile */}
      <circle className="comic-face" cx="27" cy="28" r="1.6" />
      <circle className="comic-face" cx="37" cy="28" r="1.6" />
      <path className="comic-smile" d="M27 34 q5 4 10 0" fill="none" />
    </svg>
  );
}

/**
 * A two-boys claim comic (SPEC 8.5): each boy stands beside a speech bubble that holds his claim,
 * so the critical-thinking task reads as an argument between two students. The full claims live
 * here (not in the instruction); the stem sets the scene and asks who is right.
 */
export function ClaimComic({ speakers }: { speakers: readonly [ClaimSpeaker, ClaimSpeaker] }) {
  return (
    <div className="claim-comic" role="group" aria-label="שני תלמידים טוענים">
      {speakers.map((speaker, index) => (
        <div className="comic-speaker" key={speaker.name}>
          <BoyAvatar variant={index === 0 ? 0 : 1} />
          <div className="comic-bubble">
            <p className="comic-claim"><MathText text={speaker.claim} /></p>
            <span className="comic-name">{speaker.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
