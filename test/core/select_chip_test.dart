import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  testWidgets('CatchChip.tag renders passive compact metadata', (tester) async {
    await tester.pumpWidget(
      _wrap(
        const CatchChip.tag(label: 'Easy', leading: Icon(Icons.bolt_rounded)),
      ),
    );

    final chip = _chip('Easy');
    final tokens = CatchTokens.of(tester.element(chip));
    final decoration = _chipDecoration(tester, chip);
    final borderDecoration = _chipBorderDecoration(tester, chip);
    final semantics = _chipSemantics(tester, chip);

    expect(decoration.color, tokens.surface);
    expect(
      borderDecoration.border,
      CatchBorder.resolve(tokens, CatchBorderRole.boundary).all,
    );
    expect(decoration.boxShadow, isEmpty);
    expect(semantics.properties.button, isNull);
    expect(semantics.properties.selected, isNull);
    expect(
      find.descendant(of: chip, matching: find.byType(InkWell)),
      findsNothing,
    );
  });

  testWidgets(
    'CatchChip.selectable requests parent-owned selection and renders the selected inverse fill',
    (tester) async {
      const accent = Color(0xFF7A3B20);
      var selected = false;
      bool? requestedSelection;
      late StateSetter rebuild;

      await tester.pumpWidget(
        _wrap(
          StatefulBuilder(
            builder: (context, setState) {
              rebuild = setState;
              return CatchChip.selectable(
                label: 'Trail run',
                selected: selected,
                accent: accent,
                onChanged: (next) => requestedSelection = next,
              );
            },
          ),
        ),
      );

      final chip = _chip('Trail run');
      expect(_chipSemantics(tester, chip).properties.selected, isFalse);

      await tester.tap(chip);
      await tester.pump();

      expect(requestedSelection, isTrue);
      expect(
        _chipSemantics(tester, chip).properties.selected,
        isFalse,
        reason: 'CatchChip must not own or mutate selection state.',
      );

      rebuild(() => selected = requestedSelection!);
      await pumpFeatureUi(tester);

      final selectedDecoration = _chipDecoration(tester, chip);
      final selectedBorderDecoration = _chipBorderDecoration(tester, chip);
      final tokens = CatchTokens.of(tester.element(chip));
      final label = tester.widget<Text>(find.text('Trail run'));
      final scale = tester.widget<AnimatedScale>(
        find.descendant(of: chip, matching: find.byType(AnimatedScale)),
      );

      expect(_chipSemantics(tester, chip).properties.selected, isTrue);
      expect(_chipSemantics(tester, chip).properties.button, isTrue);
      expect(_chipSemantics(tester, chip).properties.enabled, isTrue);
      expect(selectedDecoration.color, accent);
      expect(
        selectedBorderDecoration.border,
        CatchBorder.resolve(
          tokens,
          CatchBorderRole.selected,
          color: accent,
        ).all,
      );
      expect(selectedDecoration.boxShadow, isNotEmpty);
      expect(label.style?.color, tokens.onFill(accent));
      expect(label.overflow, isNull);
      expect(label.maxLines, isNull);
      expect(
        scale.scale,
        1,
        reason: 'Selection must not permanently scale layout.',
      );
    },
  );

  testWidgets(
    'CatchChip.activity renders registry-backed soft and solid chips',
    (tester) async {
      var taps = 0;

      await tester.pumpWidget(
        _wrap(
          Wrap(
            children: [
              CatchChip.activity(
                data: ActivityPalette.light
                    .getActivity(ActivityKind.socialRun)
                    .chipData,
              ),
              CatchChip.activity(
                data: ActivityPalette.light
                    .getActivity(ActivityKind.pickleball)
                    .chipData,
                emphasis: CatchChipEmphasis.solid,
                label: 'Primary court',
                onTap: () => taps += 1,
              ),
            ],
          ),
        ),
      );

      final softChip = _chip('Social run');
      final solidChip = _chip('Primary court');
      final softActivity = ActivityPalette.resolve(
        tester.element(softChip),
        ActivityKind.socialRun,
      );
      final solidActivity = ActivityPalette.resolve(
        tester.element(solidChip),
        ActivityKind.pickleball,
      );

      expect(_chipDecoration(tester, softChip).color, softActivity.soft);
      expect(_chipDecoration(tester, solidChip).color, solidActivity.deep);
      expect(
        find.descendant(
          of: softChip,
          matching: find.byIcon(softActivity.glyph),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: solidChip,
          matching: find.byIcon(solidActivity.glyph),
        ),
        findsOneWidget,
      );
      expect(_chipSemantics(tester, softChip).properties.button, isNull);
      expect(_chipSemantics(tester, solidChip).properties.button, isTrue);

      await tester.tap(solidChip);
      await tester.pump();

      expect(taps, 1);
    },
  );

  testWidgets('CatchChip.selectable scales only for the active press', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchChip.selectable(
          label: 'Press me',
          selected: true,
          onChanged: (_) {},
        ),
      ),
    );

    final chip = _chip('Press me');
    AnimatedScale scale() => tester.widget<AnimatedScale>(
      find.descendant(of: chip, matching: find.byType(AnimatedScale)),
    );

    expect(scale().scale, 1);

    final gesture = await tester.startGesture(tester.getCenter(chip));
    await tester.pump(CatchMotion.fast);
    expect(scale().scale, lessThan(1));

    await gesture.up();
    await tester.pump(CatchMotion.fast);
    expect(scale().scale, 1);
  });

  testWidgets(
    'CatchChip.selectable snaps selection under reduced motion without layout shift',
    (tester) async {
      var selected = false;
      late StateSetter update;
      await tester.pumpWidget(
        _wrap(
          MediaQuery(
            data: const MediaQueryData(disableAnimations: true),
            child: StatefulBuilder(
              builder: (context, setState) {
                update = setState;
                return CatchChip.selectable(
                  label: 'Run club',
                  selected: selected,
                  onChanged: (_) {},
                );
              },
            ),
          ),
        ),
      );

      final chip = _chip('Run club');
      final restingSize = tester.getSize(chip);
      update(() => selected = true);
      await tester.pump();

      expect(tester.getSize(chip), restingSize);
      expect(
        tester
            .widget<AnimatedContainer>(
              find.descendant(
                of: chip,
                matching: find.byType(AnimatedContainer),
              ),
            )
            .duration,
        Duration.zero,
      );
      expect(
        tester
            .widget<AnimatedScale>(
              find.descendant(of: chip, matching: find.byType(AnimatedScale)),
            )
            .duration,
        Duration.zero,
      );
      expect(tester.binding.hasScheduledFrame, isFalse);
    },
  );

  testWidgets('CatchChip.selectable keeps inverse ink legible in dark mode', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchChip.selectable(
          label: 'Selected',
          selected: true,
          onChanged: (_) {},
        ),
        themeMode: ThemeMode.dark,
      ),
    );

    final chip = _chip('Selected');
    final tokens = CatchTokens.of(tester.element(chip));
    final decoration = _chipDecoration(tester, chip);
    final label = tester.widget<Text>(find.text('Selected'));

    expect(decoration.color, tokens.primary);
    expect(label.style?.color, tokens.primaryInk);
    expect(label.style?.color, isNot(decoration.color));
  });

  testWidgets('CatchChip.activity lifts soft activity ink in dark mode', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchChip.activity(
          data: ActivityPalette.dark
              .getActivity(ActivityKind.socialRun)
              .chipData,
        ),
        themeMode: ThemeMode.dark,
      ),
    );

    final chip = _chip('Social run');
    final activity = ActivityPalette.resolve(
      tester.element(chip),
      ActivityKind.socialRun,
    );
    final label = tester.widget<Text>(find.text('Social run'));

    expect(_chipDecoration(tester, chip).color, activity.soft);
    expect(label.style?.color, CatchTokens.of(tester.element(chip)).ink);
    expect(label.style?.color, isNot(activity.soft));
  });

  testWidgets('CatchChip.removable exposes one whole-chip removal action', (
    tester,
  ) async {
    var removals = 0;

    await tester.pumpWidget(
      _wrap(CatchChip.removable(label: 'Easy', onRemove: () => removals += 1)),
    );

    final chip = _chip('Easy');
    final semantics = _chipSemantics(tester, chip);

    expect(
      find.descendant(of: chip, matching: find.byIcon(CatchIcons.close)),
      findsOneWidget,
    );
    expect(
      find.descendant(of: chip, matching: find.byType(InkWell)),
      findsOneWidget,
    );
    expect(semantics.properties.button, isTrue);
    expect(semantics.properties.selected, isNull);
    expect(semantics.properties.label, contains('Easy'));

    await tester.tap(find.text('Easy'));
    await tester.pump();

    expect(removals, 1);
  });
}

Widget _wrap(Widget child, {ThemeMode themeMode = ThemeMode.light}) {
  return MaterialApp(
    theme: AppTheme.light,
    darkTheme: AppTheme.dark,
    themeMode: themeMode,
    home: Scaffold(body: Center(child: child)),
  );
}

Finder _chip(String label) => find.widgetWithText(CatchChip, label);

BoxDecoration _chipDecoration(WidgetTester tester, Finder chip) {
  return tester
          .widget<AnimatedContainer>(
            find.descendant(of: chip, matching: find.byType(AnimatedContainer)),
          )
          .decoration!
      as BoxDecoration;
}

BoxDecoration _chipBorderDecoration(WidgetTester tester, Finder chip) {
  return tester
          .widget<AnimatedContainer>(
            find.descendant(of: chip, matching: find.byType(AnimatedContainer)),
          )
          .foregroundDecoration!
      as BoxDecoration;
}

Semantics _chipSemantics(WidgetTester tester, Finder chip) {
  return tester.widget<Semantics>(
    find
        .descendant(
          of: chip,
          matching: find.byWidgetPredicate(
            (widget) => widget is Semantics && widget.properties.label != null,
          ),
        )
        .first,
  );
}
