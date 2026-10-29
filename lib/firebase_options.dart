import 'package:catch_dating_app/firebase_options_dev.dart';
import 'package:catch_dating_app/firebase_options_prod.dart';
import 'package:catch_dating_app/firebase_options_staging.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    return switch (AppConfig.environment) {
      AppEnvironment.dev => DefaultFirebaseOptionsDev.currentPlatform,
      AppEnvironment.staging => DefaultFirebaseOptionsStaging.currentPlatform,
      AppEnvironment.prod => DefaultFirebaseOptionsProd.currentPlatform,
    };
  }
}
