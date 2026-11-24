import 'package:catch_platform/firebase/deadline_firebase_functions.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_remote_config/firebase_remote_config.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'firebase_providers.g.dart';

const firebaseFunctionsRegion = 'asia-south1';

// keepalive: account-free: Firestore is an SDK singleton shared by all
// repositories.
@Riverpod(keepAlive: true)
FirebaseFirestore firebaseFirestore(Ref ref) => FirebaseFirestore.instance;

// keepalive: account-free: FirebaseAuth is the root auth singleton for session
// providers.
@Riverpod(keepAlive: true)
FirebaseAuth firebaseAuth(Ref ref) => FirebaseAuth.instance;

// keepalive: account-free: FirebaseStorage is an SDK singleton shared by upload
// flows.
@Riverpod(keepAlive: true)
FirebaseStorage firebaseStorage(Ref ref) => FirebaseStorage.instance;

// keepalive: account-free: FirebaseFunctions is region-bound app infrastructure
// reused by repository facades. Every call without its own options gets the
// app's default callable timeout (DeadlineFirebaseFunctions).
@Riverpod(keepAlive: true)
FirebaseFunctions firebaseFunctions(Ref ref) => DeadlineFirebaseFunctions(
  FirebaseFunctions.instanceFor(region: firebaseFunctionsRegion),
);

// keepalive: account-free: Remote Config is fetched at app startup and read by
// global gates.
@Riverpod(keepAlive: true)
FirebaseRemoteConfig firebaseRemoteConfig(Ref ref) =>
    FirebaseRemoteConfig.instance;
