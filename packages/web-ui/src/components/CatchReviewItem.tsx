import {useId, type ReactNode} from "react";
import {CatchStarRating} from "./CatchStarRating";
import {CatchText} from "./CatchText";
import styles from "./CatchReviewItem.module.css";

/** The organiser's reply, shown under the review as "<author> <verb> <text>". */
export interface CatchReviewReply {
  author: string;
  text: string;
  /** Joins the author to the text, such as "replied:". */
  verb: string;
}

/**
 * `row` is the organiser page's list entry, divided by hairlines, with an
 * avatar and an optional reply. `card` is the event page's compact card on
 * paper, with the meta line last.
 */
export type CatchReviewItemVariant = "row" | "card";

export interface CatchReviewItemProps {
  /** Leading identity for the row recipe, such as an avatar or monogram. */
  avatar?: ReactNode;
  /** Verification status beside the stars, such as a "Booked on Catch" badge. */
  badge?: ReactNode;
  body: string;
  /** Actions or a note under the review, such as a Reply button. */
  footer?: ReactNode;
  /** Where and when, such as "Sunday Social Run · 2 weeks ago". */
  meta?: string;
  /** The reviewer's display name; it names the review. */
  name: string;
  /** The name's element, by document outline; defaults to h3. */
  nameElement?: "h3" | "h4" | "span";
  /** Stars out of five. */
  rating: number;
  /** The rating read aloud, such as "5 out of 5". */
  ratingLabel: string;
  reply?: CatchReviewReply;
  /** Defaults to row. */
  variant?: CatchReviewItemVariant;
}

/** One review: who, how many stars, verification, the text and any reply. */
export function CatchReviewItem({
  avatar,
  badge,
  body,
  footer,
  meta,
  name,
  nameElement = "h3",
  rating,
  ratingLabel,
  reply,
  variant = "row",
}: CatchReviewItemProps) {
  const nameId = useId();
  const stars = <CatchStarRating label={ratingLabel} size={variant === "card" ? "m" : "s"} value={rating} />;
  const metaLine = meta ? <CatchText as="span" color="ink2" variant="bodyS">{meta}</CatchText> : null;
  const reviewer = <CatchText as={nameElement} id={nameId} variant="sectionTitle">{name}</CatchText>;
  return (
    <article aria-labelledby={nameId} className={styles.review} data-variant={variant}>
      {variant === "card" ? (
        <>
          <div className={styles.header}>
            {reviewer}
            {badge}
          </div>
          {stars}
        </>
      ) : (
        <div className={styles.header}>
          <div className={styles.identity}>
            {avatar}
            <div className={styles.names}>
              {reviewer}
              {metaLine}
            </div>
          </div>
          <div className={styles.verdict}>
            {stars}
            {badge}
          </div>
        </div>
      )}
      <CatchText variant="bodyL">{body}</CatchText>
      {reply ? (
        <p className={styles.reply}>
          <strong>{reply.author}</strong>
          {` ${reply.verb} ${reply.text}`}
        </p>
      ) : null}
      {variant === "card" ? metaLine : null}
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </article>
  );
}
