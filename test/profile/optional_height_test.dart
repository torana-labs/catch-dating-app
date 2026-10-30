import 'dart:async';

import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_inline_edit_patch_factory.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_inline_height_editor.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  test('height removal serializes null rather than omitting the patch key', () {
    expect(
      const SelfProfileInlineEditPatchFactory().height(null).toFieldsJson(),
      {'height': null},
    );
  });
  for (final scale in [1.0, 2.0]) {
    testWidgets(
      'height clear keeps touch targets at 320px and ${scale}x text',
      (t) async {
        t.view.physicalSize = const Size(320, 1000);
        t.view.devicePixelRatio = 1;
        addTearDown(t.view.resetPhysicalSize);
        addTearDown(t.view.resetDevicePixelRatio);
        await t.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              theme: CatchTheme.light,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              supportedLocales: AppLocalizations.supportedLocales,
              home: MediaQuery(
                data: MediaQueryData(textScaler: TextScaler.linear(scale)),
                child: Scaffold(
                  body: SingleChildScrollView(
                    child: ProfileInlineHeightEditor(
                      icon: CatchIcons.height,
                      label: 'Height',
                      value: '172 cm',
                      currentValue: 172,
                      isExpanded: true,
                      onTap: () {},
                      onSaved: () {},
                      onCancel: () {},
                      patchForValue: (height) =>
                          UpdateUserProfilePatch(height: height),
                      savePatch: (_) async => true,
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
        await pumpFeatureUi(t);
        final clear = find.byKey(const ValueKey('catch-field-stepper-clear'));
        expect(t.getSize(clear).height, greaterThanOrEqualTo(44));
        expect(t.getSize(clear).width, greaterThanOrEqualTo(44));
        expect(t.takeException(), isNull);
        await t.pumpWidget(const SizedBox());
        await pumpFeatureUi(t);
      },
    );
  }
  testWidgets('height clear cancels, retries and retains a confirmed null', (
    t,
  ) async {
    var expanded = true;
    late StateSetter rebuild;
    var pending = Completer<bool>();
    final patches = <Map<String, Object?>>[];
    await t.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: CatchTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                rebuild = setState;
                return CatchFieldLanes.single(
                  child: ProfileInlineHeightEditor(
                    icon: CatchIcons.height,
                    label: 'Height',
                    value: '172 cm',
                    currentValue: 172,
                    isExpanded: expanded,
                    onTap: () => setState(() => expanded = !expanded),
                    onSaved: () => setState(() => expanded = false),
                    onCancel: () => setState(() => expanded = false),
                    patchForValue: (height) =>
                        UpdateUserProfilePatch(height: height),
                    savePatch: (patch) {
                      patches.add(patch.toFieldsJson());
                      return pending.future;
                    },
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(t);
    final clear = find.byKey(const ValueKey('catch-field-stepper-clear'));
    await t.tap(clear);
    await pumpFeatureUi(t);
    expect(find.text('Clear'), findsOneWidget);
    expect(patches, isEmpty);
    await t.tap(find.byKey(const ValueKey('catch-field-cancel')));
    await pumpFeatureUi(t);
    rebuild(() => expanded = true);
    await pumpFeatureUi(t);
    expect(find.text('172 cm'), findsWidgets);
    await t.tap(clear);
    await pumpFeatureUi(t);
    await t.tap(find.byKey(const ValueKey('catch-field-done')));
    await t.pump();
    expect(patches, [
      {'height': null},
    ]);
    pending.complete(false);
    await pumpFeatureUi(t);
    expect(expanded, isTrue);
    expect(find.text('Clear'), findsOneWidget);
    pending = Completer<bool>();
    await t.tap(find.byKey(const ValueKey('catch-field-done')));
    await t.pump();
    pending.complete(true);
    await pumpFeatureUi(t);
    expect(expanded, isFalse);
    rebuild(() => expanded = true);
    await pumpFeatureUi(t);
    expect(clear, findsNothing);
    expect(find.text('—'), findsOneWidget);
    await t.tap(find.byKey(const ValueKey('catch-field-done')));
    await t.pump();
    expect(patches, hasLength(2));
    await t.pumpWidget(const SizedBox());
    await pumpFeatureUi(t);
    expect(t.takeException(), isNull);
  });
}
