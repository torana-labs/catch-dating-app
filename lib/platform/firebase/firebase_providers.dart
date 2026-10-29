import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_remote_config/firebase_remote_config.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'firebase_providers.g.dart';

const firebaseFunctionsRegion = 'asia-south1';

// keepalive: Firestore is an SDK singleton shared by all repositories.
@Riverpod(keepAlive: true)
FirebaseFirestore firebaseFirestore(Ref ref) => FirebaseFirestore.instance;

// keepalive: FirebaseAuth is the root auth singleton for session providers.
@Riverpod(keepAlive: true)
FirebaseAuth firebaseAuth(Ref ref) => FirebaseAuth.instance;

// keepalive: FirebaseStorage is an SDK singleton shared by upload flows.
@Riverpod(keepAlive: true)
FirebaseStorage firebaseStorage(Ref ref) => FirebaseStorage.instance;

// keepalive: FirebaseFunctions is region-bound app infrastructure reused by
// repository facades.
@Riverpod(keepAlive: true)
FirebaseFunctions firebaseFunctions(Ref ref) =>
    FirebaseFunctions.instanceFor(region: firebaseFunctionsRegion);

// keepalive: Remote Config is fetched at app startup and read by global gates.
@Riverpod(keepAlive: true)
FirebaseRemoteConfig firebaseRemoteConfig(Ref ref) =>
    FirebaseRemoteConfig.instance;
