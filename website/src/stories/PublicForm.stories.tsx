import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, within} from "storybook/test";
import {publicFormsCopy} from "../content/forms";
import {PublicFormView} from "../features/forms/PublicFormPage";
import {demoOrganizerName} from "./fixtures/demoWorld";

// The public form, each stage of the RbWebForm board on the white ground at
// the board's phone width (and a desktop and an embedded frame). The form,
// its answers and its receipt are synthetic.
type Controller = Parameters<typeof PublicFormView>[0]["controller"];
const noop = () => undefined;
const asyncNoop = async () => undefined;

const question = (questionId: string, label: string, kind: string, extra: Record<string, unknown> = {}) => ({
  questionId, label, kind, required: true, options: [], helpText: null, answerDestination: "organizerOnly",
  validation: {allowedMimeTypes: []}, ...extra,
});
const option = (value: string, label: string) => ({optionId: value, value, label});
const section = {
  sectionId: "about", title: "About you", description: null,
  questions: [
    question("name", "Your name", "shortText"),
    question("pace", "Your easy pace", "singleChoice", {options: [option("chatty", "Chatty"), option("steady", "Steady"),
      option("brisk", "Brisk"), option("quick", "Quick")]}),
    question("note", "Anything we should know?", "longText", {required: false}),
  ],
};
const definition = {
  title: "Join the Sunday run",
  description: "Easy 5 km along the seafront at 6:30, chai after. Tell us a little so we can put you in the right pace group.",
  identityPolicy: "anonymous", logicRules: [], sections: [section], payment: null,
  appearance: {preset: "activity", activityKind: "run"},
  consent: {consentCopy: "Share my answers with this organiser", retentionCopy: "Kept until you withdraw your response."},
};
const answers = {name: "Tara Menon", pace: "steady", note: "Coming back from a knee injury, so I’d like the 5 km loop for now."};
const form = {
  publicFormId: "preview-form", organizer: {name: demoOrganizerName, logoUrl: null}, definition, cityOptions: [],
  messagingOffer: {termsVersion: "form-whatsapp-v1", organizerWhatsapp: `New dates from ${demoOrganizerName} on WhatsApp`,
    catchWhatsapp: "Things to do in your city from Catch on WhatsApp"},
};
const controller = {
  embed: false, stage: "form", form, activeSection: section, visibleSections: [section], sectionIndex: 0,
  answers, errors: {}, uploads: {}, status: {message: "", tone: ""}, saveState: "saved", pending: false,
  updateAnswer: noop, blurQuestion: noop, uploadAnswer: asyncNoop, nextSection: asyncNoop, previousSection: noop,
  canReuseAnswers: false, consentAccepted: false, updateConsent: noop, messagingChoices: {organizerWhatsapp: false, catchWhatsapp: false},
  messagingEndpointAvailable: true, updateMessagingChoice: noop, submit: asyncNoop, setStage: noop, setSectionIndex: noop,
  phoneNumber: "", setPhoneNumber: noop, code: "", setCode: noop, email: "", setEmail: noop, recaptchaContainerId: "preview-recaptcha",
  handlePhoneSubmit: noop, handleCodeSubmit: noop, handleEmailSubmit: noop, recoverPayment: noop, withdraw: asyncNoop,
  payments: {payment: null, pending: false, pay: asyncNoop, refresh: asyncNoop, status: {message: "", tone: ""}},
  restartAfterPayment: asyncNoop, startConsentPromotion: asyncNoop, pendingConsentResponseId: null,
} as unknown as Controller;
const at = (patch: Record<string, unknown>) => ({...controller, ...patch}) as unknown as Controller;
const receipt = {responseId: "response-1", status: "submitted", profileReviewAvailable: false,
  completion: {title: "You’re on the list", message: `${demoOrganizerName} reads every answer within two days. If there’s a place, you get a link to book it.`}};
const paidDefinition = {...definition, payment: {amountPaise: 20_000, description: "Run fee", refundPolicy: "Refunded if cancelled"}};
const payment = {paymentId: "fp_preview", status: "checkoutReady", amountPaise: 20_000, mode: "test", refundPolicy: "Refunded if cancelled",
  checkout: {orderId: "order_preview"}};

/** The board's frames: the phone at 390, a desktop at 1280 and an embed's 600. */
const viewports = {
  formPhone: {name: "Form · phone 390", styles: {width: "390px", height: "1120px"}, type: "mobile"},
  formDesktop: {name: "Form · desktop 1280", styles: {width: "1280px", height: "900px"}, type: "desktop"},
} as const;

const meta = {
  title: "Marketing Website/Forms/Public form",
  component: PublicFormView,
  parameters: {viewport: {options: viewports}},
  globals: {viewport: {value: "formPhone", isRotated: false}},
  args: {controller},
} satisfies Meta<typeof PublicFormView>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The questions: the organiser, the title and lead, the fields and the pace chips. */
export const Questions: Story = {
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", {level: 1, name: definition.title})).toBeVisible();
    await expect(canvas.getByRole("radio", {name: "Steady"})).toHaveAttribute("aria-checked", "true");
  },
};
export const Desktop: Story = {globals: {viewport: {value: "formDesktop", isRotated: false}}};
export const Embedded: Story = {args: {controller: at({embed: true})}};
export const FieldErrors: Story = {args: {controller: at({answers: {}, errors: {name: "Your name is required.", pace: "Choose one."}})}};
export const Loading: Story = {args: {controller: at({stage: "loading", form: null})}};
export const Identity: Story = {args: {controller: at({stage: "identity", form: {...form, definition: {...definition, identityPolicy: "emailOrPhoneVerified"}}})}};
export const PhoneCode: Story = {args: {controller: at({stage: "phoneCode", phoneNumber: "+919819022117"})}};
export const EmailSent: Story = {args: {controller: at({stage: "emailSent"})}};
/** The review: every answer, the consent and the messages tile, then Send. */
export const Review: Story = {
  args: {controller: at({stage: "review"})},
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", {name: publicFormsCopy.submit})).toBeVisible();
    await expect(canvas.getByText(publicFormsCopy.messagingHeading)).toBeVisible();
  },
};
export const PaidReview: Story = {args: {controller: at({stage: "review", form: {...form, definition: paidDefinition}})}};
export const Payment: Story = {args: {controller: at({stage: "payment", form: {...form, definition: paidDefinition},
  payments: {payment, pending: false, pay: asyncNoop, refresh: asyncNoop, status: {message: "", tone: ""}}})}};
export const Complete: Story = {args: {controller: at({stage: "complete", receipt})}};
export const Withdrawn: Story = {args: {controller: at({stage: "withdrawn"})}};
export const Unavailable: Story = {args: {controller: at({stage: "unavailable"})}};
