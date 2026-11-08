import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, within} from "storybook/test";
import {accountPageCopy, signInCopy} from "../content/account";
import {interpolateContent as fill} from "@content/interpolate";
import {AccountPageView, type AccountPageViewProps} from "../features/account/AccountPage";
import {renderAccountForm} from "../features/account/accountForm";
import type {WebsiteAccountController} from "../features/account/useWebsiteAccountController";
import {SignInSheetView} from "../features/account/SignInSheet";
import type {SignInSheetController, SignInStage} from "../features/account/useSignInSheetController";
import type {AccountTab} from "../features/account/accountPageModel";
import type {WebsiteAccount} from "../firebase";

// The signed-in guest's /account/ and the one sign-in sheet. No board exists
// for these pages: they are drawn from the system and reviewed as captures at
// the phone's 390 and a desktop's 1280. Every name and number is synthetic.
const noop = () => undefined;
const asyncNoop = async () => undefined;
const quiet = {message: "", tone: "" as const};

const account: WebsiteAccount = {
  uid: "fixture-guest", accountReady: true, displayName: "Asha Rao", phoneNumber: "+919876543210",
  dateOfBirth: "1994-03-12", profileRevision: 3, following: null, eventAge: null,
  plans: [
    {eventId: "sunday-10k", eventName: "Sunday 10K along the sea face", organizerId: "harbour-runners", organizerName: "Harbour Runners",
      startsAt: "2026-11-15T00:30:00.000Z", endsAt: "2026-11-15T02:30:00.000Z", venue: "Carter Road promenade", status: "signedUp",
      timing: "upcoming", passAvailable: true},
    {eventId: "supper-club", eventName: "Long-table supper club", organizerId: "table-for-ten", organizerName: "Table for Ten",
      startsAt: "2026-11-21T14:00:00.000Z", endsAt: "2026-11-21T17:00:00.000Z", venue: "Bandra West", status: "waitlisted",
      timing: "upcoming", passAvailable: false},
    {eventId: "quiz-night", eventName: "Thursday quiz night", organizerId: "quiz-collective", organizerName: "Quiz Collective",
      startsAt: "2026-10-30T14:30:00.000Z", endsAt: "2026-10-30T17:00:00.000Z", venue: "Khar Social", status: "attended",
      timing: "past", passAvailable: false},
    {eventId: "padel-social", eventName: "Beginners padel social", organizerId: "court-club", organizerName: "Court Club",
      startsAt: "2026-10-12T03:00:00.000Z", endsAt: "2026-10-12T05:00:00.000Z", venue: null, status: "cancelled",
      timing: "past", passAvailable: false},
  ],
  follows: [
    {organizerId: "harbour-runners", organizerName: "Harbour Runners", path: "/organizers/harbour-runners/", followedAt: "2026-10-02T09:00:00.000Z"},
    {organizerId: "table-for-ten", organizerName: "Table for Ten", path: "/organizers/table-for-ten/", followedAt: "2026-09-18T09:00:00.000Z"},
    {organizerId: "quiz-collective", organizerName: "Quiz Collective", path: null, followedAt: "2026-08-30T09:00:00.000Z"},
  ],
  reviews: [
    {reviewId: "r-quiz", organizerId: "quiz-collective", organizerName: "Quiz Collective", eventId: "quiz-night", rating: 5,
      comment: "Teams were mixed at the door, so I met five new people before the first round.", verified: true,
      moderationStatus: "published", createdAt: "2026-10-31T08:00:00.000Z", ownerResponse: "Thank you, Asha. See you next Thursday."},
    {reviewId: "r-runners", organizerId: "harbour-runners", organizerName: "Harbour Runners", eventId: null, rating: 4,
      comment: "Friendly pacers and a good chai stop after.", verified: false, moderationStatus: "pending",
      createdAt: "2026-10-05T08:00:00.000Z", ownerResponse: null},
  ],
  messages: [
    {organizerId: "harbour-runners", organizerName: "Harbour Runners", whatsapp: "optedIn", sms: "optedIn", whatsappReceiptId: "receipt-1"},
    {organizerId: "table-for-ten", organizerName: "Table for Ten", whatsapp: "optedOut", sms: "unknown", whatsappReceiptId: "receipt-2"},
  ],
};
const empty: WebsiteAccount = {...account, plans: [], follows: [], reviews: [], messages: []};

const base: AccountPageViewProps = {
  phase: "ready", account, tab: "plans", setTab: noop, notice: quiet, busy: null, refresh: noop,
  unfollow: asyncNoop, stopWhatsapp: asyncNoop, pass: null, openPass: asyncNoop, closePass: noop,
  details: {name: account.displayName, setName: noop, birth: account.dateOfBirth ?? "", setBirth: noop,
    phone: account.phoneNumber, needsPhone: false, status: quiet, save: asyncNoop},
  download: noop, signOut: asyncNoop,
};
const on = (tab: AccountTab, extra: Partial<AccountPageViewProps> = {}): AccountPageViewProps => ({...base, tab, ...extra});

const viewports = {
  accountPhone: {name: "Account · phone 390", styles: {width: "390px", height: "900px"}, type: "mobile"},
  accountDesktop: {name: "Account · desktop 1280", styles: {width: "1280px", height: "900px"}, type: "desktop"},
} as const;
const desktop = {globals: {viewport: {value: "accountDesktop", isRotated: false}}};

const meta = {
  title: "Marketing Website/Account",
  component: AccountPageView,
  parameters: {viewport: {options: viewports}},
  globals: {viewport: {value: "accountPhone", isRotated: false}},
  args: base,
} satisfies Meta<typeof AccountPageView>;
export default meta;
type Story = StoryObj<typeof meta>;

const states = ["signed-out", "loading", "plans", "plans-empty", "pass", "following", "following-empty", "reviews", "reviews-empty",
  "details", "details-add-phone", "messages", "messages-empty", "privacy", "sign-in-sheet"];

/** Upcoming plans with a pass, then past ones. */
export const Plans: Story = {
  parameters: {catchRoute: {id: "account", path: "/account/", reviewStates: states, stateCoverage: {storybook: states, manual: []}}},
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", {level: 1, name: accountPageCopy.title})).toBeVisible();
    await expect(canvas.getByRole("button", {name: accountPageCopy.plans.pass})).toBeEnabled();
  },
};
export const PlansDesktop: Story = {...desktop};
export const PlansEmpty: Story = {args: {account: empty}};
export const PlansEmptyDesktop: Story = {...desktop, args: {account: empty}};
export const Pass: Story = {args: {pass: {plan: account.plans![0], state: "ready",
  payload: JSON.stringify({kind: "catch:event-ticket", v: 1, eventId: "sunday-10k", ticketCode: `${"a".repeat(52)}.${"b".repeat(43)}`})}}};
export const PassDesktop: Story = {...desktop, args: Pass.args};
export const PassLoading: Story = {args: {pass: {plan: account.plans![0], state: "loading"}}};
export const PassUnavailable: Story = {args: {pass: {plan: account.plans![0], state: "failed"}}};

export const Following: Story = {args: on("following")};
export const FollowingDesktop: Story = {...desktop, args: on("following")};
export const FollowingEmpty: Story = {args: on("following", {account: empty})};
export const FollowingEmptyDesktop: Story = {...desktop, args: on("following", {account: empty})};

export const Reviews: Story = {args: on("reviews")};
export const ReviewsDesktop: Story = {...desktop, args: on("reviews")};
export const ReviewsEmpty: Story = {args: on("reviews", {account: empty})};
export const ReviewsEmptyDesktop: Story = {...desktop, args: on("reviews", {account: empty})};

export const Details: Story = {args: on("details")};
export const DetailsDesktop: Story = {...desktop, args: on("details")};
export const DetailsSaved: Story = {args: on("details", {details: {...base.details, status: {message: accountPageCopy.details.saved, tone: "is-success"}}})};
/** The inline phone step for a Google or email-link account; signed in, so it offers no other sign-in. */
const phoneStep: WebsiteAccountController = {
  id: "story-account-phone", uid: "fixture-guest", account: {...empty, phoneNumber: null, accountReady: false}, ready: false,
  loading: false, pending: false, status: quiet, displayName: "Asha Rao", setDisplayName: noop, phoneNumber: "", setPhoneNumber: noop,
  dateOfBirth: "", setDateOfBirth: noop, code: "", setCode: noop, stage: "details", recaptchaId: "story-account-recaptcha",
  verified: false, ageRequired: false, ageIneligible: false, handleSubmit: async (event) => event.preventDefault(),
  restartVerification: noop, refresh: async () => {throw new Error("Storybook has no account backend.");},
};
/** Signed in with Google or an email link and no phone yet: the inline phone step finishes the account. */
export const DetailsAddPhone: Story = {args: on("details", {account: {...account, phoneNumber: null, accountReady: false},
  details: {...base.details, phone: null, needsPhone: true}, phoneStep: renderAccountForm(phoneStep, {askBirthDate: false})})};
export const DetailsAddPhoneDesktop: Story = {...desktop, args: DetailsAddPhone.args};

export const Messages: Story = {args: on("messages")};
export const MessagesDesktop: Story = {...desktop, args: on("messages")};
export const MessagesStopped: Story = {args: on("messages", {notice: {message: fill(accountPageCopy.messages.stopped, {organizer: "Harbour Runners"}), tone: "is-success"}})};
export const MessagesEmpty: Story = {args: on("messages", {account: empty})};
export const MessagesEmptyDesktop: Story = {...desktop, args: on("messages", {account: empty})};

export const Privacy: Story = {args: on("privacy")};
export const PrivacyDesktop: Story = {...desktop, args: on("privacy")};

export const SignedOut: Story = {args: {phase: "signedOut", account: undefined}};
export const SignedOutDesktop: Story = {...desktop, args: {phase: "signedOut", account: undefined}};
export const Loading: Story = {args: {phase: "loading", account: undefined}};
export const Unavailable: Story = {args: {phase: "failed", account: undefined}};

const sheet = (stage: SignInStage, extra: Partial<SignInSheetController> = {}): SignInSheetController => ({
  recaptchaId: "preview-sign-in", stage, phone: stage === "start" ? "" : "+91 98765 43210", setPhone: noop, code: "", setCode: noop,
  email: stage === "linkSent" ? "asha@example.com" : "", setEmail: noop, status: quiet, pending: false,
  sendCode: asyncNoop, verify: asyncNoop, changePhone: noop, google: asyncNoop, sendLink: asyncNoop, finishEmail: asyncNoop,
  confirmEmail: noop, reset: noop, ...extra,
});
const sheetStory = (controller: SignInSheetController, wide = false): Story => ({
  ...(wide ? desktop : {}),
  args: {phase: "signedOut", account: undefined},
  render: (args) => <><AccountPageView {...args} /><SignInSheetView onClose={noop} open sheet={controller} /></>,
});

/** The sheet as it opens: phone code first, then Google and an email link. */
export const SignInSheet: Story = {...sheetStory(sheet("start")),
  play: async ({canvasElement}) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.getByRole("button", {name: signInCopy.google})).toBeVisible();
  }};
export const SignInSheetDesktop: Story = sheetStory(sheet("start"), true);
export const SignInCode: Story = sheetStory(sheet("code", {status: {message: signInCopy.codeSent, tone: "is-success"}}));
export const SignInWrongCode: Story = sheetStory(sheet("code", {code: "123456", status: {message: signInCopy.incorrectCode, tone: "is-error"}}));
export const SignInLinkSent: Story = sheetStory(sheet("linkSent", {status: {message: signInCopy.linkSent, tone: "is-success"}}));
export const SignInConfirmEmail: Story = sheetStory(sheet("confirmEmail", {status: {message: signInCopy.confirmEmail, tone: ""}}));
