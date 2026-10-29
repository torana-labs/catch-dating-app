import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('contained field groups share one perimeter and own every rule', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 360,
          child: CatchSection.containedFieldGroups(
            groups: [
              CatchSectionFieldGroup(
                title: 'Continue',
                children: [
                  CatchField.read(
                    copy: catchFieldCopy(AppLocalizationsEn()),
                    title: 'Draft',
                    body: 'Sunday social',
                  ),
                  CatchField.read(
                    copy: catchFieldCopy(AppLocalizationsEn()),
                    title: 'Previous',
                    body: 'Monday run',
                  ),
                ],
              ),
              CatchSectionFieldGroup(
                title: 'Start new',
                count: '2 PATHS',
                trailing: const Text('Choose one'),
                children: [
                  CatchField.read(
                    copy: catchFieldCopy(AppLocalizationsEn()),
                    title: 'Catch bookings',
                  ),
                  CatchField.read(
                    copy: catchFieldCopy(AppLocalizationsEn()),
                    title: 'Guest list',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );

    final focusSurface = find.byType(CatchSectionSurface);
    final clip = find.byKey(CatchSectionSurface.rowGroupClipKey);
    final surfaceRect = tester.getRect(focusSurface);
    final sectionDividers = find.descendant(
      of: focusSurface,
      matching: find.byWidgetPredicate(
        (widget) =>
            widget is CatchDivider &&
            widget.variant == CatchDividerVariant.section,
      ),
    );
    final dividers = tester
        .widgetList<CatchDivider>(
          find.descendant(
            of: focusSurface,
            matching: find.byType(CatchDivider),
          ),
        )
        .toList();

    expect(focusSurface, findsOneWidget);
    expect(clip, findsOneWidget);
    expect(find.text('CONTINUE'), findsOneWidget);
    expect(find.text('START NEW'), findsOneWidget);
    expect(find.text('2 PATHS'), findsOneWidget);
    expect(find.text('Choose one'), findsOneWidget);
    expect(sectionDividers, findsNWidgets(2));
    expect(
      dividers.where(
        (divider) => divider.variant == CatchDividerVariant.section,
      ),
      hasLength(2),
    );
    expect(
      dividers.where(
        (divider) => divider.variant == CatchDividerVariant.fieldSection,
      ),
      hasLength(2),
    );

    for (var index = 0; index < 2; index++) {
      final dividerRect = tester.getRect(sectionDividers.at(index));
      expect(
        dividerRect.left - surfaceRect.left,
        CatchStroke.hairline + CatchFieldTokens.rowHorizontalPadding,
      );
      expect(
        surfaceRect.right - dividerRect.right,
        CatchStroke.hairline + CatchFieldTokens.rowHorizontalPadding,
      );
    }
  });

  testWidgets('grouped active state stays on the shared perimeter', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 360,
          child: CatchSection.containedFieldGroups(
            groups: [
              CatchSectionFieldGroup(
                title: 'Continue',
                children: [
                  CatchField.read(
                    copy: catchFieldCopy(AppLocalizationsEn()),
                    title: 'Draft',
                  ),
                ],
              ),
              CatchSectionFieldGroup(
                title: 'Start new',
                children: [
                  CatchField.control(
                    copy: catchFieldCopy(AppLocalizationsEn()),
                    title: 'Catch bookings',
                    disclosureMode: CatchFieldMode.controlledExpanded,
                    onOpenChanged: (_) {},
                    child: const Text('Choice controls'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );

    final surfaceRect = tester.getRect(find.byType(CatchSectionSurface));
    final activeOverlay = find.byKey(
      const ValueKey('catch-field-active-overlay'),
    );
    final activeOverlayRect = tester.getRect(activeOverlay);

    expect(activeOverlayRect.left, closeTo(surfaceRect.left, 0.1));
    expect(activeOverlayRect.right, closeTo(surfaceRect.right, 0.1));
    expect(
      find.ancestor(
        of: activeOverlay,
        matching: find.byKey(CatchSectionSurface.rowGroupClipKey),
      ),
      findsOneWidget,
    );
  });

  testWidgets('group headers reflow metadata at 200 percent text scale', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 320,
          child: CatchSection.containedFieldGroups(
            groups: [
              CatchSectionFieldGroup(
                title: 'Start a completely new event',
                count: '3 AVAILABLE PATHS',
                trailing: const Text('Choose one'),
                children: [
                  CatchField.read(
                    copy: catchFieldCopy(AppLocalizationsEn()),
                    title: 'Catch bookings',
                  ),
                ],
              ),
            ],
          ),
        ),
        textScaler: const TextScaler.linear(2),
      ),
    );

    expect(tester.takeException(), isNull);
    expect(find.text('START A COMPLETELY NEW EVENT'), findsOneWidget);
    expect(find.text('3 AVAILABLE PATHS'), findsOneWidget);
    expect(find.text('Choose one'), findsOneWidget);

    final countRect = tester.getRect(find.text('3 AVAILABLE PATHS'));
    final trailingRect = tester.getRect(find.text('Choose one'));
    expect(trailingRect.top, greaterThan(countRect.bottom));
  });
}

Widget _wrap(Widget child, {TextScaler textScaler = TextScaler.noScaling}) {
  return MaterialApp(
    theme: AppTheme.light,
    home: MediaQuery(
      data: MediaQueryData(textScaler: textScaler),
      child: Scaffold(body: Center(child: child)),
    ),
  );
}
