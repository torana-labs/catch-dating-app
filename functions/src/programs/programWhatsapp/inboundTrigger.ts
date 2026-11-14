import {expr, projectID} from "firebase-functions/params";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {
  defaultProgramAssistantDeps,
  handleProgramWhatsappInbound,
} from "../assistant/decide";
import {
  metaWhatsappAppSecret,
  organizerWhatsappAccessTokens,
} from "../../organizers/organizerMessagingSetup";
import {sendProgramServiceReply} from "./replies";

// The trigger point for every stored inbound guest message
// (programWhatsappMessages, direction inbound): the assistant answers from
// the household's itinerary through sendProgramServiceReply, or passes the
// thread to the planner. Unknown senders and planner-handled threads are
// left alone by the assistant itself.

export const onProgramWhatsappInboundMessageCreated = onDocumentCreated({
  document: "programWhatsappMessages/{messageId}",
  // The holding and answer replies go out through the wedding's sender.
  secrets: [metaWhatsappAppSecret, organizerWhatsappAccessTokens],
  // The WhatsApp reader identity, like every other sender: it holds only
  // accessor on the token vault. The default runtime identity also holds
  // version-manager for the connection writers, which the environment
  // readiness check refuses for any other consumer.
  serviceAccount:
    expr`catch-whatsapp-reader@${projectID}.iam.gserviceaccount.com`,
  timeoutSeconds: 120,
  maxInstances: 10,
}, async (event) => {
  await handleProgramWhatsappInbound(event,
    defaultProgramAssistantDeps((input) => sendProgramServiceReply(input)));
});
