import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {reconcileFormVersionFilter} from "./formVersionFilterStore";

/** Keeps hostFormVersionFilters/{versionId} equal to its version's filters. */
export const onHostFormVersionFilterSourceChanged = onDocumentWritten({
  document: "organizerFormVersions/{versionId}", retry: true,
}, (event) => reconcileFormVersionFilter(admin.firestore(),
  event.params.versionId));
