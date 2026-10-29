// Firebase options for the staging environment.
// ignore_for_file: type=lint
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;

class DefaultFirebaseOptionsStaging {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return AppConfig.appRole.isHost ? hostWeb : web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return AppConfig.appRole.isHost ? hostAndroid : android;
      case TargetPlatform.iOS:
        return AppConfig.appRole.isHost ? hostIos : ios;
      case TargetPlatform.macOS:
        return AppConfig.appRole.isHost ? hostMacos : macos;
      case TargetPlatform.windows:
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptionsStaging are not configured for this platform. '
          'Windows and Linux support have been removed from this app.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptionsStaging are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyAclOdcAenSath18ZsE5HzejY6HDb6sycA',
    appId: '1:822303414140:web:6c5d5c7179dcd8f60c76f9',
    messagingSenderId: '822303414140',
    projectId: 'catchdates-staging',
    authDomain: 'catchdates-staging.firebaseapp.com',
    storageBucket: 'catchdates-staging.firebasestorage.app',
    measurementId: 'G-LL66RSRVJP',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBxPo4wbRYJekJhWlE6bJqgqNjhPXNaJj4',
    appId: '1:822303414140:android:e843ef30968cea960c76f9',
    messagingSenderId: '822303414140',
    projectId: 'catchdates-staging',
    storageBucket: 'catchdates-staging.firebasestorage.app',
  );

  static const FirebaseOptions hostAndroid = FirebaseOptions(
    apiKey: 'AIzaSyBxPo4wbRYJekJhWlE6bJqgqNjhPXNaJj4',
    appId: '1:822303414140:android:87fbdade02a935810c76f9',
    messagingSenderId: '822303414140',
    projectId: 'catchdates-staging',
    storageBucket: 'catchdates-staging.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBqnyLINlUCUHFkssvIo_wDYgCnwlYE7H0',
    appId: '1:822303414140:ios:6bae8cc0e1781e890c76f9',
    messagingSenderId: '822303414140',
    projectId: 'catchdates-staging',
    storageBucket: 'catchdates-staging.firebasestorage.app',
    iosBundleId: 'com.catchdates.app.staging',
  );

  static const FirebaseOptions hostIos = FirebaseOptions(
    apiKey: 'AIzaSyBqnyLINlUCUHFkssvIo_wDYgCnwlYE7H0',
    appId: '1:822303414140:ios:1faa9261df8f53970c76f9',
    messagingSenderId: '822303414140',
    projectId: 'catchdates-staging',
    storageBucket: 'catchdates-staging.firebasestorage.app',
    iosBundleId: 'com.catchdates.host.staging',
  );

  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: 'AIzaSyBqnyLINlUCUHFkssvIo_wDYgCnwlYE7H0',
    appId: '1:822303414140:ios:6bae8cc0e1781e890c76f9',
    messagingSenderId: '822303414140',
    projectId: 'catchdates-staging',
    storageBucket: 'catchdates-staging.firebasestorage.app',
    iosBundleId: 'com.catchdates.app.staging',
  );

  static const FirebaseOptions hostMacos = FirebaseOptions(
    apiKey: 'AIzaSyBqnyLINlUCUHFkssvIo_wDYgCnwlYE7H0',
    appId: '1:822303414140:ios:1faa9261df8f53970c76f9',
    messagingSenderId: '822303414140',
    projectId: 'catchdates-staging',
    storageBucket: 'catchdates-staging.firebasestorage.app',
    iosBundleId: 'com.catchdates.host.staging',
  );

  static const FirebaseOptions hostWeb = FirebaseOptions(
    apiKey: 'AIzaSyAclOdcAenSath18ZsE5HzejY6HDb6sycA',
    appId: '1:822303414140:web:e0b734801d2c06ca0c76f9',
    messagingSenderId: '822303414140',
    projectId: 'catchdates-staging',
    authDomain: 'catchdates-staging.firebaseapp.com',
    storageBucket: 'catchdates-staging.firebasestorage.app',
    measurementId: 'G-04SQKCVS0K',
  );
}
