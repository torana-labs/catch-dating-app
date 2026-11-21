import {defineString} from "firebase-functions/params";

export {catchTextSender} from "./catchSenderFactory";

// A pinned CATCH_WHATSAPP_ACCESS_TOKEN version. Blank keeps replies off
// while routing still works.
export const autoReplyCredentialVersion = defineString(
  "CATCH_WHATSAPP_AUTOREPLY_CREDENTIAL_VERSION", {default: ""});
