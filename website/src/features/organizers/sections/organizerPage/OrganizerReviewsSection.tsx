import {
  CatchAvatar,
  CatchBadge,
  CatchBandHeader,
  CatchButton,
  CatchField,
  CatchGroundCard,
  CatchRatingSummary,
  CatchReviewItem,
  CatchStack,
  CatchStarInput,
  CatchText,
} from "@catch/web-ui";
import {useId} from "react";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import type {OrganizerPageController} from "../../useOrganizerPageController";
import {SignInPrompt} from "../../../account/SignInSheet";

/**
 * Reviews, as the board lays them out: the average of verified reviews in
 * display figures over a bar for each star and the line that explains the
 * labels, beside the latest reviews, each labelled Booked on Catch or
 * Unverified, with the organiser's reply or why a generated page has none.
 * Until there is a verified review the page says why there is no rating
 * instead of showing one.
 */
export function OrganizerReviewsSection({controller}: {controller: OrganizerPageController}) {
  const {review, view} = controller;
  const {reviews} = view;
  const titleId = `${useId()}-title`;
  if (!reviews.readable) return null;
  const summary = reviews.average ? (
    <CatchRatingSummary average={reviews.average} countLabel={reviews.countLabel} distribution={reviews.distribution}
      note={reviews.policy} />
  ) : (
    <CatchStack gap={8}>
      {reviews.unrated ? <CatchText as="p" variant="title-row">{reviews.unrated}</CatchText> : null}
      <CatchText as="p" tone="secondary" variant="body-small">{reviews.policy}</CatchText>
    </CatchStack>
  );
  return (
    <CatchStack aria-labelledby={titleId} as="section" gap={16} id="reviews">
      <CatchStack align="end" direction="row" gap={12} justify="between" wrap>
        <CatchBandHeader size="profile" title={copy.reviewsTitle} titleId={titleId} />
        {review ? <CatchButton label={copy.writeReview} onPressed={review.toggle} size="md" variant="secondary" /> : null}
      </CatchStack>
      {review?.open ? <OrganizerReviewForm review={review} /> : null}
      {reviews.items.length ? (
        <CatchStack collapseBelow="expanded" direction="row" gap={32} railSide="start" railWidth="sidebar">
          {summary}
          <CatchStack gap={0}>
            {reviews.items.map((item) => (
              <CatchReviewItem
                avatar={<CatchAvatar ground={item.ground} initials={item.initials} name={item.name} recipe="monogram" size={36} />}
                badge={<CatchBadge label={item.verified ? copy.verifiedReview : copy.unverifiedReview} size="sm"
                  tone={item.verified ? "success" : "neutral"} />}
                body={item.body}
                footer={item.note ? <CatchText as="p" tone="secondary" variant="body-meta">{item.note}</CatchText> : undefined}
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
        <CatchGroundCard>
          <CatchStack gap={4}>
            <CatchText as="p" variant="title-row">{copy.reviewsEmptyTitle}</CatchText>
            <CatchText as="p" tone="secondary" variant="body-small">{copy.reviewsEmptyBody}</CatchText>
            {reviews.unrated ? <CatchText as="p" tone="secondary" variant="body-small">{reviews.unrated}</CatchText> : null}
          </CatchStack>
        </CatchGroundCard>
      )}
    </CatchStack>
  );
}

type ReviewForm = NonNullable<OrganizerPageController["review"]>;

/** Anyone's review, posted unverified (CAT-169), on an unclaimed page once an event has passed. */
function OrganizerReviewForm({review}: {review: ReviewForm}) {
  const form = copy.reviewForm;
  if (review.done) {
    const thanks = review.done === "published" ? form.done : form.pending;
    return <CatchGroundCard role="status"><CatchText as="p" variant="body">{thanks(review.name.trim())}</CatchText></CatchGroundCard>;
  }
  return (
    <CatchGroundCard>
      <CatchStack gap={12}>
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
      </CatchStack>
    </CatchGroundCard>
  );
}
