import {
  CatchButton,
  CatchEmptyState,
  CatchField,
  CatchIndexRow,
  CatchLoadingIndicator,
  CatchPageBody,
  CatchPageTabBar,
  CatchPaneLayout,
  CatchQrCode,
  CatchRoot,
  CatchSection,
  CatchSheet,
  CatchStack,
  CatchStarRating,
  CatchText,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {interpolateContent as fill} from "@content/interpolate";
import {accountPageCopy as copy} from "../../content/account";
import {publicSiteCopy, siteFooterLegalLinks} from "../../content/site";
import {PublicPageFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {Form} from "../../shared/ui/primitives";
import {renderAccountForm} from "./accountForm";
import {
  accountTabs,
  dateTile,
  shortDateLabel,
  splitPlans,
  whenLabel,
  type AccountPlan,
  type AccountTab,
} from "./accountPageModel";
import {SignInButton} from "./SignInSheet";
import {useAccountPageController, type AccountPageController} from "./useAccountPageController";

export type AccountPageViewProps = Omit<AccountPageController, "accountStep"> & {
  /** Details' phone step for an account signed in without a phone. */
  phoneStep?: ReactNode;
};
const titleId = "account-title";

export function AccountPage() {
  const {accountStep, ...controller} = useAccountPageController();
  return <AccountPageView {...controller} phoneStep={renderAccountForm(accountStep, {askBirthDate: false})} />;
}

/**
 * The signed-in guest's /account/ (no board; drawn from the system): the
 * site top bar, the page title, a segmented tab bar for the six sections and
 * each section's rows or its empty state, in the reading lane. Not a dating
 * profile: no matching or preference fields. Signed out, it offers the
 * sign-in sheet; the page itself is private and out of search.
 */
export function AccountPageView(props: AccountPageViewProps) {
  const {phase, account, tab, setTab} = props;
  return (
    <CatchRoot theme="day">
      <PublicSiteHeader />
      <WebsitePageMain aria-labelledby={titleId} id="account">
        <CatchPageBody gutter={false} pb="s0" pt="s4">
          <CatchPaneLayout
            main={
              <CatchStack gap={24}>
                <CatchStack gap={4}>
                  <CatchText as="h1" id={titleId} variant="page-title">{copy.title}</CatchText>
                  {account ? <CatchText tone="secondary" variant="body">
                    {[account.displayName, account.phoneNumber].filter(Boolean).join(" · ")}
                  </CatchText> : null}
                </CatchStack>
                {phase === "loading" ? <CatchStack align="center" gap={8} role="status">
                  <CatchLoadingIndicator />
                  <CatchText tone="secondary" variant="body-small">{copy.loading}</CatchText>
                </CatchStack> : null}
                {phase === "signedOut" ? <CatchEmptyState
                  actions={<SignInButton label={copy.signedOut.action} size="md" variant="primary" />}
                  message={copy.signedOut.message} title={copy.signedOut.title} /> : null}
                {phase === "failed" ? <CatchEmptyState
                  actions={<CatchButton label={copy.retry} onPressed={props.refresh} size="md" variant="secondary" />}
                  message={copy.failed} /> : null}
                {phase === "ready" && account ? <>
                  <CatchPageTabBar label={copy.tabsLabel} onChanged={setTab} selected={tab} size="sm"
                    options={accountTabs.map((value) => ({value, label: copy.tabs[value], count: countFor(props, value)}))} />
                  {props.notice.message ? <CatchText as="p" role="status"
                    tone={props.notice.tone === "is-error" ? "danger" : "secondary"} variant="body-small">{props.notice.message}</CatchText> : null}
                  <AccountTabPanel {...props} />
                </> : null}
              </CatchStack>
            }
            pattern="reading"
          />
        </CatchPageBody>
      </WebsitePageMain>
      <CatchPageBody constrainToContentWidth pb="s8" pt="s6">
        <PublicPageFooter links={[...publicSiteCopy.nav, ...siteFooterLegalLinks]} note={publicSiteCopy.footerOperator} />
      </CatchPageBody>
      <PassSheet {...props} />
    </CatchRoot>
  );
}

function countFor(props: AccountPageViewProps, tab: AccountTab): number | undefined {
  const {account} = props;
  const count = tab === "plans" ? account?.plans?.filter((plan) => plan.timing === "upcoming").length :
    tab === "following" ? account?.follows?.length : tab === "reviews" ? account?.reviews?.length : undefined;
  return count ? count : undefined;
}

function AccountTabPanel(props: AccountPageViewProps) {
  switch (props.tab) {
    case "plans": return <PlansTab {...props} />;
    case "following": return <FollowingTab {...props} />;
    case "reviews": return <ReviewsTab {...props} />;
    case "details": return <DetailsTab {...props} />;
    case "messages": return <MessagesTab {...props} />;
    case "privacy": return <PrivacyTab {...props} />;
  }
}

function PlansTab({account, openPass}: AccountPageViewProps) {
  const {upcoming, past} = splitPlans(account?.plans ?? []);
  if (!upcoming.length && !past.length) {
    return <CatchEmptyState actions={<CatchButton href={copy.plans.exploreHref} label={copy.plans.explore} size="md" variant="secondary" />}
      message={copy.plans.emptyMessage} title={copy.plans.emptyTitle} />;
  }
  return (
    <CatchStack gap={32}>
      <CatchSection count={upcoming.length} dividers="between" title={copy.plans.upcoming}
        empty={<CatchEmptyState message={copy.plans.emptyMessage} title={copy.plans.emptyTitle} variant="inline" />}>
        {upcoming.map((plan) => <PlanRow key={plan.eventId} openPass={openPass} plan={plan} />)}
      </CatchSection>
      <CatchSection count={past.length} dividers="between" title={copy.plans.past}
        empty={<CatchEmptyState title={copy.plans.emptyPastTitle} variant="inline" />}>
        {past.map((plan) => <PlanRow key={plan.eventId} openPass={openPass} plan={plan} />)}
      </CatchSection>
    </CatchStack>
  );
}

function PlanRow({plan, openPass}: {plan: AccountPlan; openPass: AccountPageViewProps["openPass"]}) {
  const status = copy.plans.status[plan.status];
  return (
    <CatchIndexRow
      action={plan.passAvailable ? {label: copy.plans.pass, onPressed: () => void openPass(plan)} : undefined}
      date={dateTile(plan.startsAt)}
      density="regular"
      meta={whenLabel(plan.startsAt)}
      status={status}
      statusTone={plan.status === "cancelled" ? "danger" : plan.status === "waitlisted" ? "warning" : "secondary"}
      subtitle={[plan.organizerName, plan.venue].filter(Boolean).join(" · ")}
      title={plan.eventName}
      wrap
    />
  );
}

function PassSheet({pass, closePass}: AccountPageViewProps) {
  const plan = pass?.plan;
  return (
    <CatchSheet onClose={closePass} open={Boolean(pass)} recipe="standard" subtitle={plan?.organizerName}
      title={plan?.eventName ?? copy.plans.passTitle}>
      {plan ? <CatchStack gap={16}>
        <CatchSection container="tile" dividers="between">
          <CatchIndexRow density="compact" title={copy.plans.when} value={whenLabel(plan.startsAt)} />
          {plan.venue ? <CatchIndexRow density="compact" title={copy.plans.where} value={plan.venue} /> : null}
        </CatchSection>
        {pass?.state === "ready" ? <CatchStack align="center" gap={8}>
          <CatchQrCode label={copy.plans.passLabel} size="l" value={pass.payload} />
          <CatchText tone="secondary" variant="body-small">{copy.plans.passHint}</CatchText>
        </CatchStack> : null}
        {pass?.state === "loading" ? <CatchStack align="center" gap={8} role="status">
          <CatchLoadingIndicator />
          <CatchText tone="secondary" variant="body-small">{copy.plans.passLoading}</CatchText>
        </CatchStack> : null}
        {pass?.state === "failed" ? <CatchText as="p" role="alert" tone="danger" variant="body-small">{copy.plans.passFailed}</CatchText> : null}
      </CatchStack> : null}
    </CatchSheet>
  );
}

function FollowingTab({account, unfollow, busy}: AccountPageViewProps) {
  const follows = account?.follows ?? [];
  return (
    <CatchSection count={follows.length} dividers="between" title={copy.following.title}
      empty={<CatchEmptyState actions={<CatchButton href={copy.plans.exploreHref} label={copy.plans.explore} size="md" variant="secondary" />}
        message={copy.following.emptyMessage} title={copy.following.emptyTitle} />}>
      {follows.map((follow) => (
        <CatchIndexRow
          action={{label: copy.following.unfollow, onPressed: busy ? undefined : () => void unfollow(follow.organizerId)}}
          density="regular"
          key={follow.organizerId}
          subtitle={follow.followedAt ? fill(copy.following.followed, {date: shortDateLabel(follow.followedAt)}) : undefined}
          title={follow.organizerName}
          trailing={follow.path ? <CatchButton href={follow.path} label={copy.following.open} size="sm" variant="quiet" /> : undefined}
        />
      ))}
    </CatchSection>
  );
}

function ReviewsTab({account}: AccountPageViewProps) {
  const reviews = account?.reviews ?? [];
  return (
    <CatchStack gap={12}>
      <CatchSection count={reviews.length} dividers="between" title={copy.reviews.title}
        empty={<CatchEmptyState message={copy.reviews.emptyMessage} title={copy.reviews.emptyTitle} />}>
        {reviews.map((review) => (
          <CatchIndexRow
            body={review.comment}
            density="regular"
            footer={<CatchStarRating label={fill(copy.reviews.rating, {rating: review.rating})} value={review.rating} />}
            key={review.reviewId}
            meta={review.ownerResponse ? `${copy.reviews.reply}: ${review.ownerResponse}` : shortDateLabel(review.createdAt)}
            status={review.moderationStatus === "pending" ? copy.reviews.pending :
              review.moderationStatus === "rejected" ? copy.reviews.rejected :
                review.verified ? copy.reviews.verified : copy.reviews.unverified}
            statusTone={review.moderationStatus === "rejected" ? "danger" : review.verified ? "success" : "secondary"}
            title={review.organizerName}
            wrap
          />
        ))}
      </CatchSection>
      {reviews.length ? <CatchText as="p" tone="secondary" variant="body-small">{copy.reviews.verifiedNote}</CatchText> : null}
    </CatchStack>
  );
}

function DetailsTab({details, phoneStep, signOut}: AccountPageViewProps) {
  if (details.needsPhone) {
    return (
      <CatchStack gap={16}>
        <CatchEmptyState message={copy.details.addPhoneMessage} title={copy.details.addPhone} variant="inline" />
        {phoneStep}
      </CatchStack>
    );
  }
  return (
    <CatchStack gap={16}>
      <Form noValidate onSubmit={details.save}>
        <CatchStack gap={12}>
          <CatchText as="h2" variant="title-row">{copy.details.title}</CatchText>
          <CatchField autoComplete="name" maxLength={80} onChanged={details.setName} recipe="input" title={copy.details.name} value={details.name} />
          <CatchSection container="tile">
            <CatchIndexRow density="compact" status={copy.details.phoneVerified} statusTone="success" title={copy.details.phone}
              value={details.phone ?? ""} />
          </CatchSection>
          <CatchField inputHint={copy.details.birthHint} keyboardType="datetime" onChanged={details.setBirth} recipe="input"
            title={copy.details.birth} value={details.birth} />
          <CatchStack align="start">
            <CatchButton label={copy.details.save} onPressed={noop} size="md" type="submit" />
          </CatchStack>
          <CatchText as="p" role="status" tone={details.status.tone === "is-error" ? "danger" : "secondary"} variant="body-small">
            {details.status.message}
          </CatchText>
        </CatchStack>
      </Form>
      <CatchText as="p" tone="secondary" variant="body-small">{copy.details.notProfile}</CatchText>
      <CatchStack align="start">
        <CatchButton label={copy.details.signOut} onPressed={() => void signOut()} size="md" variant="secondary" />
      </CatchStack>
    </CatchStack>
  );
}

function MessagesTab({account, stopWhatsapp, busy}: AccountPageViewProps) {
  const rows = account?.messages ?? [];
  return (
    <CatchStack gap={12}>
      <CatchSection count={rows.length} dividers="between" title={copy.messages.title}
        empty={<CatchEmptyState message={copy.messages.emptyMessage} title={copy.messages.emptyTitle} />}>
        {rows.map((row) => (
          <CatchIndexRow
            action={row.whatsapp === "optedIn" ?
              {label: copy.messages.stopWhatsapp, onPressed: busy ? undefined : () => void stopWhatsapp(row)} : undefined}
            density="regular"
            key={row.organizerId}
            meta={`${copy.messages.sms}: ${copy.messages.status[row.sms]}`}
            subtitle={`${copy.messages.whatsapp}: ${copy.messages.status[row.whatsapp]}`}
            title={row.organizerName}
          />
        ))}
      </CatchSection>
      {rows.length ? <CatchText as="p" tone="secondary" variant="body-small">{copy.messages.smsNote}</CatchText> : null}
    </CatchStack>
  );
}

function PrivacyTab({download, signOut}: AccountPageViewProps) {
  return (
    <CatchStack gap={24}>
      <CatchStack gap={8}>
        <CatchText as="h2" variant="title-row">{copy.privacy.downloadTitle}</CatchText>
        <CatchText as="p" tone="secondary" variant="body">{copy.privacy.downloadMessage}</CatchText>
        <CatchStack align="start"><CatchButton label={copy.privacy.download} onPressed={download} size="md" variant="secondary" /></CatchStack>
      </CatchStack>
      <CatchStack gap={8}>
        <CatchText as="h2" variant="title-row">{copy.privacy.deleteTitle}</CatchText>
        <CatchText as="p" tone="secondary" variant="body">{copy.privacy.deleteMessage}</CatchText>
        <CatchStack align="start"><CatchButton href={copy.privacy.deleteHref} label={copy.privacy.delete} size="md" variant="secondary" /></CatchStack>
      </CatchStack>
      <CatchStack align="start">
        <CatchButton label={copy.privacy.signOut} onPressed={() => void signOut()} size="md" variant="quiet" />
      </CatchStack>
    </CatchStack>
  );
}

const noop = () => undefined;
