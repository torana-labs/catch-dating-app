import 'package:catch_platform/firebase/catch_firebase_functions.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('a call without options gets the default timeout; its own options '
      'win', () {
    final plugin = _RecordingFunctions();
    final functions = CatchFirebaseFunctions(plugin);

    functions.httpsCallable('setOrganizerTrackingSettings');
    expect(plugin.timeouts, [callableDefaultTimeout]);

    functions.httpsCallable(
      'getHostAnalytics',
      options: HttpsCallableOptions(timeout: const Duration(seconds: 20)),
    );
    expect(plugin.timeouts.last, const Duration(seconds: 20));
    expect(callableDefaultTimeout, const Duration(seconds: 30));
    expect(writeStillWorkingAfter, const Duration(seconds: 8));
  });
}

final class _RecordingFunctions extends Fake implements FirebaseFunctions {
  final timeouts = <Duration>[];

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    timeouts.add(options!.timeout);
    return _FakeCallable();
  }
}

final class _FakeCallable extends Fake implements HttpsCallable {}
