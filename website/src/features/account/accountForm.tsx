import {CatchButton, CatchField, CatchGap, CatchLegacyText} from "@catch/web-ui";
import {optionalAccountFields} from "../../shared/contracts/generated/profileRequirements";
import {accountCopy} from "../../content/account";
import {Form} from "../../shared/ui/primitives";
import type {WebsiteAccountController} from "./useWebsiteAccountController";
import {SignInButton} from "./SignInSheet";

const noop = () => undefined;

/**
 * Inline account step shared by follow, event and claim actions: the phone
 * code inline, and the sign-in sheet's Google and email link one tap away. A claim has
 * no age rule, so it leaves the optional birth date out, and names the send
 * action as its board does.
 */
export function renderAccountForm(account: WebsiteAccountController, {askBirthDate = true, sendCodeLabel = accountCopy.sendCode}: {askBirthDate?: boolean; sendCodeLabel?: string} = {}) {
  if (account.loading) return <CatchLegacyText as="p" color="ink2" role="status" variant="bodyS">{accountCopy.loading}</CatchLegacyText>;
  if (account.ageIneligible) return <CatchLegacyText as="p" role="status" variant="bodyM">{accountCopy.ageIneligible}</CatchLegacyText>;
  return <Form noValidate onSubmit={account.handleSubmit} pending={account.pending}>
    <CatchGap size="related">
      <CatchField
        recipe="input"
        id={`${account.id}-name`}
        autoComplete="name"
        title={accountCopy.name}
        maxLength={80}
        value={account.displayName}
        onChanged={(value) => account.setDisplayName(value)}
        inputMode={account.pending || account.stage === "code" ? "inactive" : "editable"}
      />
      <CatchField
        recipe="input"
        id={`${account.id}-phone`}
        autoComplete="tel"
        title={accountCopy.phone}
        value={account.phoneNumber}
        onChanged={(value) => account.setPhoneNumber(value)}
        inputMode={account.verified || account.pending || account.stage === "code" ? "inactive" : "editable"}
        keyboardType="phone"
      />
      {!account.account?.dateOfBirth && (account.ageRequired ||
        (askBirthDate && optionalAccountFields.includes("dateOfBirth"))) ? <CatchField
        recipe="input"
        id={`${account.id}-birth`}
        title={account.ageRequired ? accountCopy.requiredBirth : accountCopy.optionalBirth}
        value={account.dateOfBirth}
        onChanged={(value) => account.setDateOfBirth(value)}
        inputMode={account.pending || account.stage === "code" ? "inactive" : "editable"}
        keyboardType="date"
      /> : null}
      {account.stage === "code" ? <CatchField
        recipe="input"
        id={`${account.id}-code`}
        autoComplete="one-time-code"
        title={accountCopy.code}
        maxLength={6}
        value={account.code}
        onChanged={(value) => account.setCode(value.replace(/\D/gu, ""))}
        inputMode={account.pending ? "inactive" : "editable"}
        keyboardType="number"
      /> : null}
      <div id={account.recaptchaId} />
      <CatchButton fullWidth onPressed={noop} status={account.pending ? "loading" : "idle"} type="submit"
        label={account.stage === "code" ? accountCopy.verify : account.verified ? accountCopy.continue : sendCodeLabel} />
      {account.stage === "code" ? <CatchButton fullWidth label={accountCopy.restartVerification}
        onPressed={account.pending ? null : account.restartVerification} variant="quiet" /> : null}
      {!account.uid && account.stage === "details" ? <SignInButton label={accountCopy.otherWays} size="md" /> : null}
      <CatchLegacyText as="p" color={account.status.tone === "is-error" ? "danger" : "ink2"} role="status" variant="bodyS">
        {account.status.message}
      </CatchLegacyText>
      <CatchLegacyText as="p" color="ink2" variant="bodyS">{accountCopy.privacy}</CatchLegacyText>
    </CatchGap>
  </Form>;
}
