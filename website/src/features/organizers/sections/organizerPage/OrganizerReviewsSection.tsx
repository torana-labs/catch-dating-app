import {
  CatchAvatar,
  CatchButton,
  CatchField,
  CatchGap,
  CatchGroundCard,
  CatchRatingSummary,
  CatchReviewItem,
  CatchSplit,
  CatchStarInput,
  CatchText,
} from "@catch/web-ui";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import type {OrganizerPageController} from "../../useOrganizerPageController";
import {organizerSectionHeading} from "./organizerSectionHeading";

/** The rating over its distribution, then the latest reviews, each marked verified or unverified. */
export function OrganizerReviewsSection({controller}: {controller: OrganizerPageController}) {
  const {review, view} = controller;
  const {reviews} = view;
  if (!reviews.readable) return null;
  return (
    <CatchGap aria-labelledby="organizer-reviews-title" as="section" id="reviews" size="formField">
      {organizerSectionHeading({
        action: review ? <CatchButton label={copy.writeReview} onPressed={review.toggle} size="md" variant="secondary" /> : undefined,
        id: "organizer-reviews-title",
        title: copy.reviewsTitle,
      })}
      {review?.open ? <OrganizerReviewForm review={review} /> : null}
      {reviews.items.length ? (
        <CatchSplit
          end={(
            <CatchGap size="headerTitleToSubtitle">
              {reviews.items.map((item) => (
                <CatchReviewItem
                  avatar={<CatchAvatar ground={item.ground} initials={item.initials} name={item.name} recipe="monogram" size={36} />}
                  badge={(
                    <CatchText as="span" color={item.verified ? "mint" : "ink2"} variant="statusLabel">
                      {item.verified ? copy.verifiedReview : copy.unverifiedReview}
                    </CatchText>
                  )}
                  body={item.body}
                  footer={item.note ? <CatchText color="ink2" variant="bodyS">{item.note}</CatchText> : undefined}
                  key={item.key}
                  meta={item.meta}
                  name={item.name}
                  rating={item.rating}
                  ratingLabel={item.ratingLabel}
                  reply={item.reply}
                />
              ))}
            </CatchGap>
          )}
          gap="compact"
          ratio="even"
          start={(
            <CatchRatingSummary
              average={reviews.average}
              countLabel={reviews.countLabel}
              distribution={reviews.distribution}
              note={reviews.policy}
            />
          )}
        />
      ) : (
        <CatchGroundCard>
          <CatchGap size="headerTitleToSubtitle">
            <CatchText variant="sectionTitle">{copy.reviewsEmptyTitle}</CatchText>
            <CatchText color="ink2" variant="bodyM">{`${copy.reviewsEmptyBody} ${reviews.policy}`}</CatchText>
          </CatchGap>
        </CatchGroundCard>
      )}
    </CatchGap>
  );
}

type ReviewForm = NonNullable<OrganizerPageController["review"]>;

/** Anyone's review, posted unverified (CAT-169). Hidden until its backend lands. */
function OrganizerReviewForm({review}: {review: ReviewForm}) {
  const form = copy.reviewForm;
  if (review.done) {
    return (
      <CatchGroundCard>
        <CatchText role="status" variant="bodyL">{form.done(review.name.trim())}</CatchText>
      </CatchGroundCard>
    );
  }
  return (
    <CatchGroundCard>
      <CatchGap size="formField">
        <CatchGap size="inline">
          <CatchText id="organizer-review-stars" variant="sectionTitle">{form.starsLabel}</CatchText>
          <CatchStarInput labelledBy="organizer-review-stars" onChanged={review.setStars}
            optionLabel={(stars) => copy.ratingLabel(stars)} value={review.stars} />
        </CatchGap>
        <CatchField inputHint={form.textPlaceholder} maxLines={null} minLines={4} onChanged={review.setText}
          recipe="input" title={form.textLabel} value={review.text} />
        <CatchField autoComplete="given-name" onChanged={review.setName} recipe="input" title={form.nameLabel} value={review.name} />
        {review.error ? <CatchText color="danger" role="alert" variant="bodyS">{review.error}</CatchText> : null}
        <CatchGap crossAxisAlignment="start" size="inline">
          <CatchButton label={form.submit} onPressed={review.submit} status={review.pending ? "loading" : "idle"} />
        </CatchGap>
      </CatchGap>
    </CatchGroundCard>
  );
}
