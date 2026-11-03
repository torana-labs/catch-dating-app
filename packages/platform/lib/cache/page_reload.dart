/// Native apps keep running after a Firestore instance is terminated: the
/// plugin starts a fresh instance on its next call, so nothing reloads.
const bool firestoreRestartNeedsPageReload = false;

/// Does nothing outside the web.
void reloadPage() {}
