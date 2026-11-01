import {CatchButton, CatchField, CatchGap, CatchText} from "@catch/web-ui";
import {optionalAccountFields} from "../../shared/contracts/generated/profileRequirements";
import {accountCopy} from "../../content/account";
import {Form} from "../../shared/ui/primitives";
import type {WebsiteAccountController} from "./useWebsiteAccountController";

const noop = () => undefined;

/**
 * Inline account step shared by follow, event and claim actions. A claim has
 * no age rule, so it leaves the optional birth date out.
 */
export function renderAccountForm(account: WebsiteAccountController, {askBirthDate = true} = {}) {
  if (account.loading) return <CatchText as="p" color="ink2" role="status" variant="bodyS">{accountCopy.loading}</CatchText>;
  if (account.ageIneligible) return <CatchText as="p" role="status" variant="bodyM">{accountCopy.ageIneligible}</CatchText>;
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
        label={account.stage === "code" ? accountCopy.verify : account.verified ? accountCopy.continue : accountCopy.sendCode} />
      {account.stage === "code" ? <CatchButton fullWidth label={accountCopy.restartVerification}
        onPressed={account.pending ? null : account.restartVerification} variant="quiet" /> : null}
      <CatchText as="p" color={account.status.tone === "is-error" ? "danger" : "ink2"} role="status" variant="bodyS">
        {account.status.message}
      </CatchText>
      <CatchText as="p" color="ink2" variant="bodyS">{accountCopy.privacy}</CatchText>
    </CatchGap>
  </Form>;
}
