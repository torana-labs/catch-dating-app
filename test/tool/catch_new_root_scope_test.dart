import 'dart:io';

import 'package:catch_ui_lints/src/migration_scope.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('the list of files that predate D24 only shrinks', () {
    // Do not add to this set: redraw the screen instead. Removing an entry
    // from the list, and then from here, is how the list ends.
    const allowed = {
      'lib/pages/celebration/celebration_screen.dart',
      'lib/pages/startup/splash_screen.dart',
    };
    expect(allowed.containsAll(newRootLegacyFiles), isTrue);
    for (final file in newRootLegacyFiles) {
      expect(
        File(file).existsSync(),
        isTrue,
        reason: '$file is gone, so its entry goes too.',
      );
    }
  });

  test('only lib/pages has a list; the app packages start at zero', () {
    expect(
      newRootLegacyFiles.where((file) => file.startsWith('apps/')),
      isEmpty,
    );
    expect(newRootLegacyFiles.every(newRootPath), isTrue);
  });

  test('the new roots are the app packages, lib/pages, Today, Create and '
      'Onboarding', () {
    for (final file in const [
      'apps/host/lib/main.dart',
      'apps/consumer/lib/explore/widgets/row.dart',
      'lib/pages/welcome/welcome_body.dart',
      'lib/hosts/today/host_today_body.dart',
      'lib/hosts/create/create_basics_body.dart',
      'lib/hosts/onboarding/sign_in_body.dart',
      'tool/catch_ui_lints_probe/run.x/1/apps/host/lib/a.dart',
      'tool/catch_ui_lints_probe/run.x/1/arch/lib/pages/a/a.dart',
    ]) {
      expect(newRootPath(file), isTrue, reason: file);
    }
    for (final file in const [
      'lib/hosts/presentation/host_screen.dart',
      'lib/hosts/todayish/a.dart',
      'packages/platform/lib/pages/a.dart',
      'apps/host/test/a.dart',
      'apps/lib/a.dart',
      'packages/catch_ui/lib/pages/a.dart',
      'tool/catch_ui_lints_probe/run.x/1/lib/hosts/presentation/a.dart',
    ]) {
      expect(newRootPath(file), isFalse, reason: file);
    }
  });

  test('zero drawing leaves out the list and generated code', () {
    final root = Directory.systemTemp.createTempSync('catch-new-root-');
    addTearDown(() => root.deleteSync(recursive: true));
    Directory('${root.path}/.git').createSync();
    bool zero(String relative) => zeroDrawingPath('${root.path}/$relative');
    bool listed(String relative) => newRootLegacyPath('${root.path}/$relative');

    expect(zero('apps/host/lib/today/today_body.dart'), isTrue);
    expect(
      zero('lib/pages/celebration/celebration_effects_controller.dart'),
      isTrue,
    );
    expect(
      zero('lib/pages/celebration/celebration_effects_controller.g.dart'),
      isFalse,
    );
    expect(zero('apps/host/lib/today/today.freezed.dart'), isFalse);
    expect(zero('lib/hosts/presentation/host_screen.dart'), isFalse);
    expect(zero('lib/hosts/today/host_today_screen.dart'), isTrue);
    expect(zero('lib/hosts/today/host_today_controller.g.dart'), isFalse);
    expect(zero('lib/hosts/create/create_screen.dart'), isTrue);
    expect(zero('lib/hosts/create/create_controller.g.dart'), isFalse);
    expect(zero('lib/hosts/onboarding/setup_screen.dart'), isTrue);
    expect(zero('lib/hosts/onboarding/onboarding_controller.g.dart'), isFalse);
    for (final file in newRootLegacyFiles) {
      expect(zero(file), isFalse, reason: file);
      expect(listed(file), isTrue, reason: file);
      expect(
        listed('tool/catch_ui_lints_probe/run.x/1/$file'),
        isTrue,
        reason: 'a fixture stands for $file',
      );
    }
    expect(
      listed('lib/pages/celebration/celebration_effects_controller.dart'),
      isFalse,
    );
  });
}
