import 'package:cloud_firestore/cloud_firestore.dart';

/// Firestore setup the app bootstrap runs before the first read, kept here so
/// app code never touches the Firestore SDK (`catch_arch_firestore_outside_data`).

/// Points Firestore at the local emulator on [host].
void useFirestoreEmulator(String host) =>
    FirebaseFirestore.instance.useFirestoreEmulator(host, 8080);

/// Enables offline persistence explicitly. Defaults differ by platform
/// (mobile: enabled, web: disabled); setting it keeps behaviour consistent.
void enableFirestoreOfflinePersistence() {
  FirebaseFirestore.instance.settings = const Settings(
    persistenceEnabled: true,
  );
}

/// Whether [error] is Firebase refusing to initialise an app that already
/// exists (`duplicate-app`).
bool isDuplicateFirebaseAppError(Object error) =>
    error is FirebaseException && error.code == 'duplicate-app';

/// The failure code when [error] is a Remote Config fetch failure, else null.
String? remoteConfigFailureCode(Object error) =>
    error is FirebaseException && error.plugin == 'remoteconfig'
    ? error.code
    : null;
