import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'CatchField centers disclosure status affordances on the value line',
    (tester) async {
      Future<void> pumpStatus(CatchFieldStatus status) => tester.pumpWidget(
        _wrap(
          CatchField.control(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Religion',
            body: 'Christian',
            status: status,
            child: const Text('Religion choices'),
          ),
        ),
      );

      await pumpStatus(CatchFieldStatus.saving);
      expect(find.byKey(const ValueKey('catch-field-spinner')), findsOneWidget);
      expect(
        find.byKey(const ValueKey('catch-field-action-bar')),
        findsNothing,
      );
      expect(
        tester
            .getCenter(
              find.byWidgetPredicate(
                (widget) =>
                    widget is CatchLoadingIndicator &&
                    widget.variant == CatchLoadingIndicatorVariant.inline,
              ),
            )
            .dy,
        closeTo(tester.getCenter(find.text('Christian')).dy, 0.1),
      );

      await pumpStatus(CatchFieldStatus.saved);
      expect(
        tester.getCenter(find.byIcon(CatchIcons.success)).dy,
        closeTo(tester.getCenter(find.text('Christian')).dy, 0.1),
      );
    },
  );

  testWidgets('CatchField gives the visible commit bar sole saving progress', (
    tester,
  ) async {
    Future<void> pumpField({
      bool open = true,
      CatchFieldStatus status = CatchFieldStatus.idle,
    }) => tester.pumpWidget(
      _wrap(
        CatchField.control(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Height',
          body: '168 cm',
          disclosureMode: open
              ? CatchFieldMode.controlledExpanded
              : CatchFieldMode.controlledCollapsed,
          status: status,
          onCancel: _noop,
          onSubmit: _noop,
          child: const Text('Height control'),
        ),
      ),
    );

    await pumpField(status: CatchFieldStatus.saved);
    expect(find.byKey(const ValueKey('catch-field-saved')), findsOneWidget);
    expect(
      tester.widget<Icon>(find.byKey(const ValueKey('catch-field-saved'))).icon,
      CatchIcons.success,
    );

    await pumpField(status: CatchFieldStatus.saving);
    expect(find.byKey(const ValueKey('catch-field-spinner')), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchLoadingIndicator &&
            widget.variant == CatchLoadingIndicatorVariant.inline,
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('catch-field-done')),
        matching: find.byWidgetPredicate(
          (widget) =>
              widget is CatchLoadingIndicator &&
              widget.variant == CatchLoadingIndicatorVariant.inline,
        ),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.byType(CatchFieldTrailingRow),
        matching: find.byWidgetPredicate(
          (widget) =>
              widget is CatchLoadingIndicator &&
              widget.variant == CatchLoadingIndicatorVariant.inline,
        ),
      ),
      findsNothing,
    );
    expect(find.byIcon(CatchIcons.expand), findsOneWidget);
    expect(
      tester.widget<Icon>(find.byIcon(CatchIcons.loading)).size,
      CatchFieldTokens.actionSpinnerExtent,
    );
    final spinnerRotation = tester.widget<RotationTransition>(
      find.byKey(const ValueKey('catch-field-spinner')),
    );
    expect(
      (spinnerRotation.turns as AnimationController).duration,
      CatchFieldTokens.spinnerPeriod,
    );
    expect(find.text('Saving…'), findsOneWidget);
    final cancelOpacity = tester.widget<AnimatedOpacity>(
      find.descendant(
        of: find.byKey(const ValueKey('catch-field-cancel')),
        matching: find.byType(AnimatedOpacity),
      ),
    );
    expect(cancelOpacity.opacity, CatchFieldTokens.savingCancelOpacity);
    expect(cancelOpacity.duration, CatchFieldTokens.fast);
    final doneSpinnerRect = tester.getRect(
      find.descendant(
        of: find.byKey(const ValueKey('catch-field-done')),
        matching: find.byIcon(CatchIcons.loading),
      ),
    );
    final savingLabelRect = tester.getRect(find.text('Saving…'));
    expect(
      savingLabelRect.left - doneSpinnerRect.right,
      closeTo(CatchFieldTokens.actionButtonSpinnerGap, 0.1),
    );
    expect(
      tester.getSize(find.byKey(const ValueKey('catch-field-done'))).height,
      CatchPlatformTokens.minimumInteractiveExtent,
    );

    // If the commit bar is not visible, the trailing lane remains the only
    // place where saving progress can be communicated.
    await tester.pumpWidget(const SizedBox.shrink());
    await pumpField(open: false, status: CatchFieldStatus.saving);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is CatchLoadingIndicator &&
            widget.variant == CatchLoadingIndicatorVariant.inline,
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.byType(CatchFieldTrailingRow),
        matching: find.byWidgetPredicate(
          (widget) =>
              widget is CatchLoadingIndicator &&
              widget.variant == CatchLoadingIndicatorVariant.inline,
        ),
      ),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('catch-field-action-bar')), findsNothing);
  });

  for (final recipe in ['choices', 'optionCards', 'stepper']) {
    testWidgets('CatchField $recipe locks selection for its saving status', (
      tester,
    ) async {
      var status = CatchFieldStatus.saving;
      var changes = 0;
      late StateSetter update;
      final copy = catchFieldCopy(AppLocalizationsEn());
      await tester.pumpWidget(
        _wrap(
          StatefulBuilder(
            builder: (context, setState) {
              update = setState;
              return switch (recipe) {
                'choices' => CatchField<String>.choices(
                  copy: copy,
                  title: 'Activity',
                  values: const ['Run', 'Walk'],
                  selected: const {'Run'},
                  itemLabelBuilder: (value) => value,
                  disclosureMode: CatchFieldMode.localExpanded,
                  status: status,
                  onSelectionChanged: (_) => changes++,
                ),
                'optionCards' => CatchField<String>.optionCards(
                  copy: copy,
                  title: 'Activity',
                  values: const ['Run', 'Walk'],
                  selected: 'Run',
                  itemTitleBuilder: (value) => value,
                  itemDescriptionBuilder: (value) => '$value outside',
                  disclosureMode: CatchFieldMode.localExpanded,
                  status: status,
                  onChanged: (_) => changes++,
                ),
                _ => CatchField.stepper(
                  copy: copy,
                  title: 'Guests',
                  value: 2,
                  min: 1,
                  max: 3,
                  disclosureMode: CatchFieldMode.localExpanded,
                  status: status,
                  decreaseSemanticLabel: 'Decrease guests',
                  increaseSemanticLabel: 'Increase guests',
                  onChanged: (_) => changes++,
                ),
              };
            },
          ),
        ),
      );
      final target = recipe == 'stepper'
          ? find.bySemanticsLabel('Increase guests')
          : find.text('Walk');
      // Saving may ignore pointer events; still exercise the painted control.
      await tester.tapAt(tester.getCenter(target));
      await tester.pump();
      expect(changes, 0);
      expect(find.byKey(const ValueKey('catch-field-spinner')), findsOneWidget);

      update(() => status = CatchFieldStatus.idle);
      await _pumpCatchFieldMotion(tester);
      await tester.tap(target);
      await tester.pump();
      expect(changes, 1);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }

  testWidgets('CatchField toggle stays visible and disabled while saving', (
    tester,
  ) async {
    var changes = 0;
    await tester.pumpWidget(
      _wrap(
        CatchField.toggle(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Show my pace',
          value: true,
          status: CatchFieldStatus.saving,
          onChanged: (_) => changes++,
        ),
      ),
    );

    expect(find.byKey(const ValueKey('catch-field-toggle')), findsOneWidget);
    expect(find.byType(CatchToggleInput), findsOneWidget);
    expect(find.byKey(const ValueKey('catch-field-spinner')), findsOneWidget);
    final opacity = tester.widget<AnimatedOpacity>(
      find.descendant(
        of: find.byType(CatchToggleInput),
        matching: find.byType(AnimatedOpacity),
      ),
    );
    expect(opacity.opacity, CatchFieldTokens.savingToggleOpacity);
    expect(opacity.duration, CatchFieldTokens.standard);
    expect(
      tester
          .widget<AnimatedContainer>(
            find.byKey(const ValueKey('catch-field-toggle-track')),
          )
          .duration,
      CatchFieldTokens.standard,
    );

    await tester.tap(find.byKey(const ValueKey('catch-field-toggle')));
    await tester.tap(find.text('Show my pace'));
    expect(changes, 0);
  });

  testWidgets('CatchField saving Done cannot submit or close local control', (
    tester,
  ) async {
    var submitCount = 0;

    await tester.pumpWidget(
      _wrap(
        CatchField.control(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Height',
          disclosureMode: CatchFieldMode.localExpanded,
          status: CatchFieldStatus.saving,
          onCancel: () {},
          onSubmit: () => submitCount++,
          child: const Text('Height control'),
        ),
      ),
    );

    final doneButton = tester.widget<CatchFieldCommitButton>(
      find.byKey(const ValueKey('catch-field-done')),
    );
    expect(doneButton.onPressed, isNull);
    await _pumpCatchFieldMotion(tester);

    expect(submitCount, 0);
    expect(find.text('Height control'), findsOneWidget);
  });

  testWidgets(
    'CatchField status lane cross-fades saving, scales saved, and drains motion',
    (tester) async {
      var status = CatchFieldStatus.idle;
      late StateSetter update;
      await tester.pumpWidget(
        _wrap(
          StatefulBuilder(
            builder: (context, setState) {
              update = setState;
              return CatchField.read(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Club name',
                status: status,
              );
            },
          ),
        ),
      );

      expect(find.byKey(const ValueKey('catch-field-spinner')), findsNothing);
      expect(find.byKey(const ValueKey('catch-field-saved')), findsNothing);

      update(() => status = CatchFieldStatus.saving);
      await tester.pump();
      await tester.pump();
      expect(find.byKey(const ValueKey('catch-field-spinner')), findsOneWidget);
      expect(
        tester
            .widget<AnimatedSwitcher>(
              find.byKey(const ValueKey('catch-field-status-switcher')),
            )
            .duration,
        CatchMotion.base,
      );
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('catch-field-status-switcher')),
          matching: find.byType(FadeTransition),
        ),
        findsWidgets,
      );

      update(() => status = CatchFieldStatus.saved);
      await tester.pump();
      expect(find.byKey(const ValueKey('catch-field-saved')), findsOneWidget);
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('catch-field-status-switcher')),
          matching: find.byType(ScaleTransition),
        ),
        findsWidgets,
      );
      await tester.pump(CatchMotion.base);
      await tester.pump(CatchMotion.base);
      expect(find.byKey(const ValueKey('catch-field-spinner')), findsNothing);

      update(() => status = CatchFieldStatus.idle);
      await tester.pump();
      expect(find.byKey(const ValueKey('catch-field-saved')), findsOneWidget);
      await tester.pump(CatchMotion.base);
      await tester.pump(CatchMotion.base);
      await tester.pump(CatchMotion.base);
      await tester.pump();
      expect(find.byKey(const ValueKey('catch-field-saved')), findsNothing);
      expect(find.byKey(const ValueKey('catch-field-spinner')), findsNothing);
      expect(tester.binding.hasScheduledFrame, isFalse);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('CatchField status motion becomes a plain reduced-motion swap', (
    tester,
  ) async {
    var status = CatchFieldStatus.idle;
    late StateSetter update;
    await tester.pumpWidget(
      _wrap(
        MediaQuery(
          data: const MediaQueryData(disableAnimations: true),
          child: StatefulBuilder(
            builder: (context, setState) {
              update = setState;
              return CatchField.read(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Club name',
                status: status,
              );
            },
          ),
        ),
      ),
    );

    update(() => status = CatchFieldStatus.saving);
    await tester.pump();
    await tester.pump();
    expect(find.byKey(const ValueKey('catch-field-spinner')), findsOneWidget);
    expect(
      tester
          .widget<AnimatedSwitcher>(
            find.byKey(const ValueKey('catch-field-status-switcher')),
          )
          .duration,
      Duration.zero,
    );
    update(() => status = CatchFieldStatus.saved);
    await tester.pump();
    expect(find.byKey(const ValueKey('catch-field-spinner')), findsNothing);
    expect(find.byKey(const ValueKey('catch-field-saved')), findsOneWidget);

    update(() => status = CatchFieldStatus.idle);
    await tester.pump();
    await tester.pump();
    expect(find.byKey(const ValueKey('catch-field-saved')), findsNothing);
    expect(tester.binding.hasScheduledFrame, isFalse);
  });

  testWidgets('CatchField cancels a pending status dismissal on dispose', (
    tester,
  ) async {
    var status = CatchFieldStatus.saved;
    late StateSetter update;
    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) {
            update = setState;
            return CatchField.read(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Club name',
              status: status,
            );
          },
        ),
      ),
    );

    update(() => status = CatchFieldStatus.idle);
    await tester.pump();
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(CatchMotion.base);

    expect(tester.takeException(), isNull);
    expect(tester.binding.hasScheduledFrame, isFalse);
  });

  testWidgets('CatchField announces each save transition exactly once', (
    tester,
  ) async {
    final messages = <Map<dynamic, dynamic>>[];
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    messenger.setMockDecodedMessageHandler<dynamic>(
      SystemChannels.accessibility,
      (message) async {
        messages.add(message as Map<dynamic, dynamic>);
        return null;
      },
    );
    addTearDown(
      () => messenger.setMockDecodedMessageHandler<dynamic>(
        SystemChannels.accessibility,
        null,
      ),
    );

    var status = CatchFieldStatus.idle;
    late StateSetter update;
    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) {
            update = setState;
            return CatchField.read(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Club name',
              status: status,
            );
          },
        ),
      ),
    );

    update(() => status = CatchFieldStatus.saving);
    await tester.pump();
    await tester.pump();
    update(() {});
    await tester.pump();
    update(() => status = CatchFieldStatus.saved);
    await tester.pump();
    await tester.pump();

    final announcements = messages
        .where((message) => message['type'] == 'announce')
        .map((message) => (message['data'] as Map<dynamic, dynamic>)['message'])
        .toList();
    expect(announcements, ['Saving', 'Saved']);
  });

  testWidgets('CatchField error takes precedence over saved status', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchField.nav(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Club name',
          error: 'Could not save',
          status: CatchFieldStatus.saved,
        ),
      ),
    );

    expect(find.text('Could not save'), findsOneWidget);
    expect(find.byIcon(CatchIcons.error), findsOneWidget);
    expect(find.byKey(const ValueKey('catch-field-saved')), findsNothing);
    expect(
      tester.widget<Text>(find.text('Club name')).style?.color,
      CatchTokens.editorialLight.danger,
    );
  });
}

Widget _wrap(Widget child, {ThemeData? theme, double textScale = 1}) {
  return MaterialApp(
    theme: theme ?? AppTheme.light,
    home: MediaQuery(
      data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
      child: Scaffold(body: Center(child: child)),
    ),
  );
}

Future<void> _pumpCatchFieldMotion(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(CatchMotion.base);
  await tester.pump();
}

void _noop() {}
