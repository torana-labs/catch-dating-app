import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_policy_step.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  testWidgets('applicable field labels remain readable at large text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final fixture = _PolicyFixture();
    addTearDown(fixture.dispose);
    for (final preset in EventAdmissionPreset.values) {
      await tester.pumpWidget(fixture.app(preset: preset, scale: 2));
      await pumpFeatureUi(tester);
      for (final paragraph in tester.renderObjectList<RenderParagraph>(
        find.byType(RichText),
      )) {
        expect(
          paragraph.didExceedMaxLines,
          isFalse,
          reason: paragraph.text.toPlainText(),
        );
      }
      expect(tester.takeException(), isNull);
    }
  });
  testWidgets('admission and pair controls own their applicable children', (
    tester,
  ) async {
    final fixture = _PolicyFixture();
    addTearDown(fixture.dispose);
    for (final preset in EventAdmissionPreset.values) {
      await tester.pumpWidget(fixture.app(preset: preset));
      await pumpFeatureUi(tester);
      expect(find.byType(CatchSectionSurface), findsNWidgets(2));
      expect(
        find.byKey(CreateEventFormKeys.inviteCode),
        preset == EventAdmissionPreset.inviteOnly
            ? findsOneWidget
            : findsNothing,
      );
      expect(
        find.byKey(CreateEventFormKeys.maxMen),
        preset == EventAdmissionPreset.openCapacity
            ? findsOneWidget
            : findsNothing,
      );
      expect(
        find.byKey(CreateEventFormKeys.dynamicPricingStep),
        preset == EventAdmissionPreset.balancedSingles
            ? findsOneWidget
            : findsNothing,
      );
      for (final childKey in [
        CreateEventFormKeys.inviteCode,
        CreateEventFormKeys.maxMen,
        CreateEventFormKeys.dynamicPricingStep,
        CreateEventFormKeys.crossPathsPairCapacity,
      ]) {
        final child = find.byKey(childKey);
        if (child.evaluate().isEmpty) continue;
        // Exactly one shared perimeter around both the owning control and input.
        final parent = find.ancestor(
          of: child,
          matching: find.byType(CatchSectionSurface),
        );
        expect(parent, findsOneWidget);
        expect(
          find.descendant(of: parent, matching: find.byType(CatchField)),
          findsAtLeastNWidgets(2),
        );
      }
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets(
    'inactive invalid draft fields do not validate or disappear from controllers',
    (tester) async {
      final fixture = _PolicyFixture();
      addTearDown(fixture.dispose);
      fixture.controllers[3].text = '';
      fixture.controllers[4].text = '';
      await tester.pumpWidget(
        fixture.app(preset: EventAdmissionPreset.balancedSingles),
      );
      await pumpFeatureUi(tester);
      expect(fixture.form.currentState!.validate(), isFalse);
      await tester.pumpWidget(
        fixture.app(preset: EventAdmissionPreset.openCapacity, enabled: false),
      );
      await pumpFeatureUi(tester);
      expect(find.byKey(CreateEventFormKeys.dynamicPricingStep), findsNothing);
      expect(find.byKey(CreateEventFormKeys.maxMen), findsNothing);
      expect(
        find.byKey(CreateEventFormKeys.crossPathsPairCapacity),
        findsNothing,
      );
      expect(fixture.form.currentState!.validate(), isTrue);
      expect(fixture.controllers[3].text, '');
      await tester.pumpWidget(
        fixture.app(preset: EventAdmissionPreset.balancedSingles),
      );
      await pumpFeatureUi(tester);
      expect(fixture.form.currentState!.validate(), isFalse);
    },
  );

  testWidgets('external booking removes every Catch booking descendant', (
    tester,
  ) async {
    final fixture = _PolicyFixture();
    addTearDown(fixture.dispose);
    await tester.pumpWidget(
      fixture.app(preset: EventAdmissionPreset.balancedSingles, external: true),
    );
    await pumpFeatureUi(tester);
    expect(find.byType(CatchSectionSurface), findsNothing);
    for (final key in [
      CreateEventFormKeys.price,
      CreateEventFormKeys.dynamicPricingToggle,
      CreateEventFormKeys.dynamicPricingStep,
      CreateEventFormKeys.crossPathsPairInventoryToggle,
      CreateEventFormKeys.crossPathsPairCapacity,
    ]) {
      expect(find.byKey(key), findsNothing);
    }
    expect(fixture.form.currentState!.validate(), isTrue);
    expect(tester.takeException(), isNull);
  });
}

class _PolicyFixture {
  final form = GlobalKey<FormState>();
  final controllers = [
    for (final value in [
      '20',
      '0',
      'WEEKEND',
      '250',
      '1500',
      '',
      '',
      '10',
      '10',
      '2',
    ])
      TextEditingController(text: value),
  ];

  Widget app({
    required EventAdmissionPreset preset,
    bool enabled = true,
    bool external = false,
    double scale = 1,
  }) => MaterialApp(
    theme: CatchTheme.light,
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(
        context,
      ).copyWith(textScaler: TextScaler.linear(scale)),
      child: child!,
    ),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: Scaffold(
      body: EventPolicyStep(
        formKey: form,
        capacityController: controllers[0],
        priceController: controllers[1],
        currencyCode: 'INR',
        inviteCodeController: controllers[2],
        dynamicPricingStepController: controllers[3],
        dynamicPricingMaxController: controllers[4],
        minAgeController: controllers[5],
        maxAgeController: controllers[6],
        maxMenController: controllers[7],
        maxWomenController: controllers[8],
        crossPathsPairCapacityController: controllers[9],
        admissionPreset: preset,
        onAdmissionPresetChanged: (_) {},
        cohortCapsEnabled: enabled,
        onCohortCapsEnabledChanged: (_) {},
        dynamicPricingEnabled: enabled,
        onDynamicPricingChanged: (_) {},
        crossPathsPairInventoryEnabled: enabled,
        onCrossPathsPairInventoryChanged: (_) {},
        cancellationPolicyId: EventCancellationPolicyId.standard,
        onCancellationPolicyChanged: (_) {},
        externalBookingMode: external,
      ),
    ),
  );

  void dispose() {
    for (final controller in controllers) {
      controller.dispose();
    }
  }
}
