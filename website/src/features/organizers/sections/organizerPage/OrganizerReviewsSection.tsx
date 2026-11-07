import {
  CatchButton,
  CatchField,
  CatchIndexRow,
  CatchSection,
  CatchStack,
  CatchStarInput,
  CatchStarRating,
  CatchSurface,
  CatchText,
} from "@catch/web-ui";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import type {OrganizerPageController} from "../../useOrganizerPageController";

/**
 * Reviews: the average beside its stars, a bar for each star, the policy,
 * then the latest reviews, each marked as booked on Catch or unverified,
 * with the organiser's reply or why a generated page has none.
 */
export function OrganizerReviewsSection({controller}: {controller: OrganizerPageController}) {
  const {review, view} = controller;
  const {reviews} = view;
  if (!reviews.readable) return null;
  const total = Math.max(1, reviews.distribution.reduce((sum, row) => sum + row.count, 0));
  return (
    <CatchStack gap={0} id="reviews">
      <CatchSection
        action={review ? {label: copy.writeReview, onPressed: review.toggle} : undefined}
        dividers="none"
        title={copy.reviewsTitle}
      >
        <CatchStack gap={16}>
          {review?.open ? <OrganizerReviewForm review={review} /> : null}
          {reviews.items.length ? (
            <>
              <CatchStack align="center" direction="row" gap={16}>
                <CatchText numeric variant="display-xl">{reviews.average}</CatchText>
                <CatchStack gap={4}>
                  <CatchStarRating label={copy.ratingLabel(Math.round(Number(reviews.average)))} value={Number(reviews.average)} />
                  <CatchText tone="secondary" variant="body-small">{reviews.countLabel}</CatchText>
                </CatchStack>
              </CatchStack>
              <CatchSection dividers="none">
                {reviews.distribution.map((row) => (
                  <CatchIndexRow density="compact" key={row.stars} progress={{label: row.label, max: total, value: row.count}}
                    title={copy.starsShort(row.stars)} value={String(row.count)} />
                ))}
              </CatchSection>
              <CatchText as="p" tone="secondary" variant="body-small">{reviews.policy}</CatchText>
              <CatchSection>
                {reviews.items.map((item) => (
                  <CatchIndexRow
                    body={item.body}
                    density="roomy"
                    key={item.key}
                    meta={item.reply ? `${item.reply.author} ${item.reply.verb} ${item.reply.text}` : item.note}
                    status={item.verified ? copy.verifiedReview : copy.unverifiedReview}
                    statusTone={item.verified ? "success" : "secondary"}
                    subtitle={item.meta}
                    title={item.name}
                    trailing={<CatchStarRating label={item.ratingLabel} value={item.rating} />}
                    wrap
                  />
                ))}
              </CatchSection>
            </>
          ) : (
            <CatchSurface>
              <CatchText as="p" variant="title-row">{copy.reviewsEmptyTitle}</CatchText>
              <CatchText as="p" tone="secondary" variant="body-small">{`${copy.reviewsEmptyBody} ${reviews.policy}`}</CatchText>
            </CatchSurface>
          )}
        </CatchStack>
      </CatchSection>
    </CatchStack>
  );
}

type ReviewForm = NonNullable<OrganizerPageController["review"]>;

/** Anyone's review, posted unverified (CAT-169). Hidden until its backend lands. */
function OrganizerReviewForm({review}: {review: ReviewForm}) {
  const form = copy.reviewForm;
  if (review.done) {
    return <CatchSurface role="status"><CatchText as="p" variant="body">{form.done(review.name.trim())}</CatchText></CatchSurface>;
  }
  return (
    <CatchSurface>
      <CatchStack gap={8}>
        <CatchText as="p" id="organizer-review-stars" variant="title-row">{form.starsLabel}</CatchText>
        <CatchStarInput labelledBy="organizer-review-stars" onChanged={review.setStars}
          optionLabel={(stars) => copy.ratingLabel(stars)} value={review.stars} />
      </CatchStack>
      <CatchField inputHint={form.textPlaceholder} maxLines={null} minLines={4} onChanged={review.setText}
        recipe="input" title={form.textLabel} value={review.text} />
      <CatchField autoComplete="given-name" onChanged={review.setName} recipe="input" title={form.nameLabel} value={review.name} />
      {review.error ? <CatchText as="p" role="alert" tone="danger" variant="body-small">{review.error}</CatchText> : null}
      <CatchStack align="start">
        <CatchButton label={form.submit} onPressed={review.submit} status={review.pending ? "loading" : "idle"} />
      </CatchStack>
    </CatchSurface>
  );
}
