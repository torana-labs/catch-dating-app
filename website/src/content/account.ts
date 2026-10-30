import {brand} from "./brand.ts";

export const accountCopy = {
  "restartVerification": "Change number or request a new code",
  "loading": "Loading your account…",
  "ageIneligible": "Your age does not meet this event’s requirements.",
  "name": "Name",
  "phone": "Phone number with country code",
  "requiredBirth": "Date of birth — required for this event",
  "optionalBirth": "Date of birth (optional)",
  "code": "Verification code",
  "continuing": "Continuing…",
  "verify": "Verify and continue",
  "continue": "Continue",
  "sendCode": "Send verification code",
  "privacy": `Your name and verified phone create your ${brand.name} account. Following does not subscribe you to marketing messages.`,
  "invalidDetails": "Enter your name and phone number with country code.",
  "invalidCode": "Enter the six-digit verification code.",
  "codeSent": "Code sent. Enter it to continue.",
  "expired": "Verification expired. Request a new code.",
  "incorrectCode": "That code is incorrect. Try again.",
  "accountChanged": "Your account changed. Try again to load the latest details.",
  "failed": "Could not complete your account. Please try again.",
  "followFailed": "Could not update your follow. Please try again.",
  "following": "Following · Unfollow",
  "follow": "Follow"
} as const;
