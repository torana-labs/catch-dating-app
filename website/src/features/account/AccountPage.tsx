import {
  CatchAdaptiveSheet,
  CatchButton,
  CatchEmptyState,
  CatchField,
  CatchFlowLayout,
  CatchGroundCard,
  CatchIndexRow,
  CatchLoadingIndicator,
  CatchPageTabBar,
  CatchQrCode,
  CatchRoot,
  CatchSection,
  CatchStack,
  CatchStarRating,
  CatchText,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {interpolateContent as fill} from "@content/interpolate";
import {accountPageCopy as copy, signInCopy} from "../../content/account";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
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

/** One block of the flow's column, as the board's flat cards. */
function Block({children, ground = "white"}: {children: ReactNode; ground?: "white" | "mint"}) {
  return <CatchGroundCard ground={ground} outlined={ground === "white"}>{children}</CatchGroundCard>;
}

export function AccountPage() {
  const {accountStep, ...controller} = useAccountPageController();
  return <AccountPageView {...controller} phoneStep={renderAccountForm(accountStep, {askBirthDate: false})} />;
}

/**
 * The guest's /account/ on the LiveAccount board: the kit's flow, with the
 * six sections as tabs over the column and each section's blocks in it.
 * Signed out, the flow's head asks the guest to sign in and its one block
 * opens the sign-in sheet. Not a public profile: no matching or preference
 * fields. The page is private and out of search.
 */
export function AccountPageView(props: AccountPageViewProps) {
  const {phase, account, tab, setTab} = props;
  const signedOut = phase === "signedOut";
  const ready = phase === "ready" && account;
  return (
    <CatchRoot theme="day">
      <PublicSiteHeader />
      <WebsitePageMain id="account">
        <CatchFlowLayout
          banner={ready && props.notice.message ? <CatchText as="p" role="status"
            tone={props.notice.tone === "is-error" ? "danger" : "secondary"} variant="body-small">{props.notice.message}</CatchText> : undefined}
          kicker={signedOut ? copy.signedOut.kicker : account?.displayName || undefined}
          kickerTone="secondary"
          lead={signedOut ? copy.signedOut.message : account?.phoneNumber || undefined}
          navigation={ready ? (
            <CatchPageTabBar label={copy.tabsLabel} onChanged={setTab} selected={tab} size="sm"
              options={accountTabs.map((value) => ({value, label: copy.tabs[value], count: countFor(props, value)}))} />
          ) : undefined}
          title={signedOut ? copy.signedOut.title : copy.title}
        >
          {phase === "loading" ? <CatchStack align="center" gap={8} role="status">
            <CatchLoadingIndicator />
            <CatchText tone="secondary" variant="body-small">{copy.loading}</CatchText>
          </CatchStack> : null}
          {signedOut ? <Block>
            <CatchStack gap={12}>
              <CatchStack gap={4}>
                <CatchText as="h2" variant="title-row">{signInCopy.title}</CatchText>
                <CatchText as="p" tone="secondary" variant="body-small">{signInCopy.subtitle}</CatchText>
              </CatchStack>
              <CatchStack align="start"><SignInButton label={copy.signedOut.action} size="md" variant="primary" /></CatchStack>
            </CatchStack>
          </Block> : null}
          {phase === "failed" ? <CatchEmptyState
            actions={<CatchButton label={copy.retry} onPressed={props.refresh} size="md" variant="secondary" />}
            message={copy.failed} /> : null}
          {ready ? <AccountTabPanel {...props} /> : null}
        </CatchFlowLayout>
      </WebsitePageMain>
      <PublicSiteFooter />
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
    <>
      <Block>
        <CatchSection count={upcoming.length} dividers="between" title={copy.plans.upcoming}
          empty={<CatchEmptyState message={copy.plans.emptyMessage} title={copy.plans.emptyTitle} variant="inline" />}>
          {upcoming.map((plan) => <PlanRow key={plan.eventId} openPass={openPass} plan={plan} />)}
        </CatchSection>
      </Block>
      <Block>
        <CatchSection count={past.length} dividers="between" title={copy.plans.past}
          empty={<CatchEmptyState title={copy.plans.emptyPastTitle} variant="inline" />}>
          {past.map((plan) => <PlanRow key={plan.eventId} openPass={openPass} plan={plan} />)}
        </CatchSection>
      </Block>
    </>
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
    <CatchAdaptiveSheet closeLabel={copy.plans.passClose} onClose={closePass} open={Boolean(pass)} subtitle={plan?.organizerName}
      title={plan?.eventName ?? copy.plans.passTitle} wide="dialog">
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
    </CatchAdaptiveSheet>
  );
}

function FollowingTab({account, unfollow, busy}: AccountPageViewProps) {
  const follows = account?.follows ?? [];
  return (
    <Block><CatchSection count={follows.length} dividers="between" title={copy.following.title}
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
    </CatchSection></Block>
  );
}

function ReviewsTab({account}: AccountPageViewProps) {
  const reviews = account?.reviews ?? [];
  return (
    <Block><CatchStack gap={12}>
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
    </CatchStack></Block>
  );
}

function DetailsTab({details, phoneStep, signOut}: AccountPageViewProps) {
  if (details.needsPhone) {
    return (
      <Block><CatchStack gap={16}>
        <CatchEmptyState message={copy.details.addPhoneMessage} title={copy.details.addPhone} variant="inline" />
        {phoneStep}
      </CatchStack></Block>
    );
  }
  return (
    <>
      <Block><CatchStack gap={16}><Form noValidate onSubmit={details.save}>
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
      <CatchStack align="start">
        <CatchButton label={copy.details.signOut} onPressed={() => void signOut()} size="md" variant="secondary" />
      </CatchStack></CatchStack></Block>
      <Block ground="mint"><CatchText as="p" variant="body">{copy.details.notProfile}</CatchText></Block>
    </>
  );
}

function MessagesTab({account, stopWhatsapp, busy}: AccountPageViewProps) {
  const rows = account?.messages ?? [];
  return (
    <Block><CatchStack gap={12}>
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
    </CatchStack></Block>
  );
}

function PrivacyTab({download, signOut}: AccountPageViewProps) {
  return (
    <>
      <Block><CatchStack gap={8}>
        <CatchText as="h2" variant="title-row">{copy.privacy.downloadTitle}</CatchText>
        <CatchText as="p" tone="secondary" variant="body">{copy.privacy.downloadMessage}</CatchText>
        <CatchStack align="start"><CatchButton label={copy.privacy.download} onPressed={download} size="md" variant="primary" /></CatchStack>
      </CatchStack></Block>
      <Block><CatchStack gap={8}>
        <CatchText as="h2" variant="title-row">{copy.privacy.deleteTitle}</CatchText>
        <CatchText as="p" tone="secondary" variant="body">{copy.privacy.deleteMessage}</CatchText>
        <CatchStack align="start"><CatchButton href={copy.privacy.deleteHref} label={copy.privacy.delete} size="md" variant="secondary" /></CatchStack>
      </CatchStack></Block>
      <CatchStack align="start">
        <CatchButton label={copy.privacy.signOut} onPressed={() => void signOut()} size="md" variant="quiet" />
      </CatchStack>
    </>
  );
}

const noop = () => undefined;
