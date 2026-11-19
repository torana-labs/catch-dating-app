import type {GuestListConverter} from "../canonical";

/**
 * Form exports (Google Forms, Typeform) name columns after the question, so
 * these words find the guest's answers when no column matches exactly.
 */
export const formQuestionWords: GuestListConverter["questionWords"] = {
  displayName: ["name"],
  phone: ["whatsapp", "phone", "mobile", "contactnumber", "contactno"],
  email: ["email", "mailid"],
};

export const formNameAliases: ReadonlySet<string> = new Set([
  "yourname", "yourfullname", "firstandlastname", "namesurname",
]);

export const indianPhoneAliases: ReadonlySet<string> = new Set([
  "mobileno", "phoneno", "contactno", "whatsappnumber", "whatsappno",
  "yourphonenumber", "yourwhatsappnumber", "yourmobilenumber",
]);
