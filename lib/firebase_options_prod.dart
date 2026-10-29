// Firebase options for the prod environment.
// ignore_for_file: type=lint
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;

class DefaultFirebaseOptionsProd {
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
          'DefaultFirebaseOptionsProd are not configured for this platform. '
          'Windows and Linux support have been removed from this app.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptionsProd are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyBZUkQpo1xw1GYOLhdRh5RbVdy0wq8A644',
    appId: '1:574779808785:web:0c3bd6aa7d98590f8ea5b0',
    messagingSenderId: '574779808785',
    projectId: 'catch-dating-app-64e51',
    authDomain: 'catch-dating-app-64e51.firebaseapp.com',
    storageBucket: 'catch-dating-app-64e51.firebasestorage.app',
    measurementId: 'G-CH7WMQY5FV',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyC6dvdBlfV8nU5RJvcQa6QTp8Ej25QhBV8',
    appId: '1:574779808785:android:81edbfa0d4aba7c48ea5b0',
    messagingSenderId: '574779808785',
    projectId: 'catch-dating-app-64e51',
    storageBucket: 'catch-dating-app-64e51.firebasestorage.app',
  );

  static const FirebaseOptions hostAndroid = FirebaseOptions(
    apiKey: 'AIzaSyC6dvdBlfV8nU5RJvcQa6QTp8Ej25QhBV8',
    appId: '1:574779808785:android:0093178ee6681c828ea5b0',
    messagingSenderId: '574779808785',
    projectId: 'catch-dating-app-64e51',
    storageBucket: 'catch-dating-app-64e51.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyCtL_D8Cf3OMBeL1ffnmKse4VI2i_WUq7E',
    appId: '1:574779808785:ios:49b1ce51418604b78ea5b0',
    messagingSenderId: '574779808785',
    projectId: 'catch-dating-app-64e51',
    storageBucket: 'catch-dating-app-64e51.firebasestorage.app',
    iosBundleId: 'com.catchdates.app',
  );

  static const FirebaseOptions hostIos = FirebaseOptions(
    apiKey: 'AIzaSyCtL_D8Cf3OMBeL1ffnmKse4VI2i_WUq7E',
    appId: '1:574779808785:ios:dafe636b607e071f8ea5b0',
    messagingSenderId: '574779808785',
    projectId: 'catch-dating-app-64e51',
    storageBucket: 'catch-dating-app-64e51.firebasestorage.app',
    iosBundleId: 'com.catchdates.host',
  );

  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: 'AIzaSyCtL_D8Cf3OMBeL1ffnmKse4VI2i_WUq7E',
    appId: '1:574779808785:ios:49b1ce51418604b78ea5b0',
    messagingSenderId: '574779808785',
    projectId: 'catch-dating-app-64e51',
    storageBucket: 'catch-dating-app-64e51.firebasestorage.app',
    iosBundleId: 'com.catchdates.app',
  );

  static const FirebaseOptions hostMacos = FirebaseOptions(
    apiKey: 'AIzaSyCtL_D8Cf3OMBeL1ffnmKse4VI2i_WUq7E',
    appId: '1:574779808785:ios:dafe636b607e071f8ea5b0',
    messagingSenderId: '574779808785',
    projectId: 'catch-dating-app-64e51',
    storageBucket: 'catch-dating-app-64e51.firebasestorage.app',
    iosBundleId: 'com.catchdates.host',
  );

  static const FirebaseOptions hostWeb = FirebaseOptions(
    apiKey: 'AIzaSyBZUkQpo1xw1GYOLhdRh5RbVdy0wq8A644',
    appId: '1:574779808785:web:65a9fe67d7f19ed78ea5b0',
    messagingSenderId: '574779808785',
    projectId: 'catch-dating-app-64e51',
    authDomain: 'catch-dating-app-64e51.firebaseapp.com',
    storageBucket: 'catch-dating-app-64e51.firebasestorage.app',
    measurementId: 'G-YMWCDQKJJ0',
  );
}
