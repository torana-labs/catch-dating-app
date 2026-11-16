import {
  CatchAvatar,
  CatchBadge,
  CatchBand,
  CatchBandHeader,
  CatchButton,
  CatchField,
  CatchRatingSummary,
  CatchReviewItem,
  CatchStack,
  CatchStarInput,
  CatchSurface,
  CatchText,
} from "@catch/web-ui";
import {useId} from "react";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import type {OrganizerPageController} from "../../useOrganizerPageController";
import {SignInPrompt} from "../../../account/SignInSheet";

/**
 * Reviews on the paper band: the average of verified reviews beside their
 * count and a bar for each star, then the latest reviews, each labelled
 * Booked on Catch or Unverified with the line that explains the labels, and
 * the organiser's reply or why a generated page has none. With reviews but
 * none verified yet, the page says so instead of showing a rating.
 */
export function OrganizerReviewsSection({controller}: {controller: OrganizerPageController}) {
  const {review, view} = controller;
  const {reviews} = view;
  const titleId = `${useId()}-title`;
  if (!reviews.readable) return null;
  return (
    <CatchBand aria-labelledby={titleId} as="section" ground="paper" id="reviews" width="content">
      <CatchStack gap={24}>
        <CatchStack align="end" direction="row" gap={12} justify="between" wrap>
          <CatchBandHeader ground="paper" title={copy.reviewsTitle} titleId={titleId} />
          {review ? <CatchButton label={copy.writeReview} onPressed={review.toggle} size="md" variant="secondary" /> : null}
        </CatchStack>
        {review?.open ? <OrganizerReviewForm review={review} /> : null}
        {reviews.items.length ? (
          <CatchStack collapseBelow="expanded" direction="row" gap={48} railSide="start" railWidth="narrow">
            <CatchStack gap={12}>
              {reviews.average ? (
                <CatchRatingSummary average={reviews.average} countLabel={reviews.countLabel} distribution={reviews.distribution}
                  note={reviews.policy} />
              ) : (
                <>
                  {reviews.unrated ? <CatchText as="p" variant="title-row">{reviews.unrated}</CatchText> : null}
                  <CatchText as="p" tone="secondary" variant="body-small">{reviews.policy}</CatchText>
                </>
              )}
            </CatchStack>
            <CatchStack gap={0}>
              {reviews.items.map((item) => (
                <CatchReviewItem
                  avatar={<CatchAvatar ground={item.ground} initials={item.initials} name={item.name} recipe="monogram" size={36} />}
                  badge={<CatchBadge label={item.verified ? copy.verifiedReview : copy.unverifiedReview} size="sm"
                    tone={item.verified ? "success" : "neutral"} />}
                  body={item.body}
                  footer={item.note ? <CatchText as="p" tone="secondary" variant="body-small">{item.note}</CatchText> : undefined}
                  key={item.key}
                  meta={item.meta}
                  name={item.name}
                  rating={item.rating}
                  ratingLabel={item.ratingLabel}
                  reply={item.reply}
                />
              ))}
            </CatchStack>
          </CatchStack>
        ) : (
          <CatchSurface>
            <CatchText as="p" variant="title-row">{copy.reviewsEmptyTitle}</CatchText>
            <CatchText as="p" tone="secondary" variant="body-small">{`${copy.reviewsEmptyBody} ${reviews.policy}`}</CatchText>
          </CatchSurface>
        )}
      </CatchStack>
    </CatchBand>
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
      <SignInPrompt />
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
