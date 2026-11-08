import {CatchButton, CatchField, CatchIndexRow, CatchSection, CatchStack, CatchStarRating, CatchText} from "@catch/web-ui";
import {organizerPageCopy} from "../../../content/organizerPage";
import {ownerViewCopy} from "../../../content/ownerView";
import {renderOwnerNotice} from "./OwnerInsightsPanel";
import type {OwnerViewController} from "./useOwnerViewController";

const copy = ownerViewCopy;

/**
 * Review replies (setReviewResponse, the Host app's reply command) and
 * "Message followers" (a follower update, at most twice a calendar month,
 * enforced by manageOrganizerOwnerPage).
 */
export function OwnerAudiencePanel({controller}: {controller: OwnerViewController}) {
  const {reviews, followers, can} = controller;
  const what = controller.notice?.what;
  return (
    <CatchStack gap={24}>
      {can("messageFollowers") ? (
        <CatchSection dividers="none" note={copy.followers.note} title={copy.followers.title}>
          <CatchStack gap={12}>
            <CatchField helperText={copy.followers.allowance(followers.used, followers.limit)}
              inputHint={copy.followers.hint} maxLength={500}
              maxLines={null} minLines={3} onChanged={followers.change} recipe="input" title={copy.followers.field}
              value={followers.text} />
            {followers.usedUp ? <CatchText as="p" tone="secondary" variant="body-small">{copy.followers.usedUp}</CatchText> : null}
            <CatchStack align="start">
              <CatchButton label={copy.followers.send}
                onPressed={followers.usedUp || !followers.text.trim() ? null : followers.send}
                status={followers.busy ? "loading" : "idle"} />
            </CatchStack>
            {what === "message" ?
              renderOwnerNotice({controller, failed: copy.followers.failed, panel: "audience", saved: copy.followers.sent}) :
              null}
          </CatchStack>
        </CatchSection>
      ) : null}
      {can("reviews") ? (
        <CatchSection dividers="between" note={copy.reviews.note} title={copy.reviews.title}>
          {reviews.ready && !reviews.items.length ?
            <CatchText as="p" tone="secondary" variant="body-small">{copy.reviews.empty}</CatchText> : null}
          {reviews.items.map((review) => (
            <CatchIndexRow
              body={review.comment}
              density="roomy"
              footer={reviews.replyTo === review.id ? (
                <CatchStack gap={8}>
                  <CatchField maxLength={1000} maxLines={null} minLines={3} onChanged={reviews.changeReply} recipe="input"
                    title={copy.reviews.replyField(review.reviewerName)} value={reviews.replyText} />
                  <CatchStack direction="row" gap={8}>
                    <CatchButton label={copy.reviews.send} onPressed={reviews.replyText.trim() ? reviews.send : null} size="sm"
                      status={reviews.busy ? "loading" : "idle"} />
                    <CatchButton label={copy.reviews.cancel} onPressed={reviews.cancel} size="sm" variant="quiet" />
                  </CatchStack>
                </CatchStack>
              ) : (
                <CatchStack align="start">
                  <CatchButton label={review.ownerResponse ? copy.reviews.editReply : copy.reviews.reply}
                    onPressed={() => reviews.start(review.id, review.ownerResponse?.message ?? "")} size="sm" variant="secondary" />
                </CatchStack>
              )}
              key={review.id}
              meta={review.ownerResponse ? copy.reviews.yourReply(review.ownerResponse.message) : undefined}
              status={review.verificationStatus === "verified" ? copy.reviews.verified : copy.reviews.unverified}
              statusTone={review.verificationStatus === "verified" ? "success" : "secondary"}
              title={review.reviewerName}
              trailing={<CatchStarRating label={organizerPageCopy.ratingLabel(Math.round(review.rating))} value={review.rating} />}
              wrap
            />
          ))}
          {what === "reply" ?
            renderOwnerNotice({controller, failed: copy.reviews.failed, panel: "audience", saved: copy.reviews.sent}) :
            null}
        </CatchSection>
      ) : null}
    </CatchStack>
  );
}
