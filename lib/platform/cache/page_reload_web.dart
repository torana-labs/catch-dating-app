import 'dart:js_interop';

/// The web plugin keeps its terminated Firestore instance for the life of the
/// page, so the page reloads to start a fresh one.
const bool firestoreRestartNeedsPageReload = true;

@JS('location')
external _Location get _location;

extension type _Location._(JSObject _) implements JSObject {
  external void reload();
}

/// Reloads the page.
void reloadPage() => _location.reload();
