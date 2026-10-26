import 'dart:ui' show SemanticsAction;

import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'test_support.dart';

void main() {
  testWidgets('Sortable titles and metadata remain readable at large text', (
    tester,
  ) async {
    const title = 'What would you like to tell us before your first event?';
    const metadata = 'Long text · Optional';
    var opened = false;
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 320,
          child: SingleChildScrollView(
            child: CatchField.sortable(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: title,
              metadata: metadata,
              leading: const SizedBox.square(dimension: 44),
              onTap: () => opened = true,
            ),
          ),
        ),
        textScale: 2,
      ),
    );
    expect(tester.widget<Text>(find.text(title)).maxLines, isNull);
    expect(
      tester.getBottomLeft(find.text(title)).dy,
      lessThan(tester.getTopLeft(find.text(metadata)).dy),
    );
    await tester.tap(find.text(title));
    expect(opened, isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'CatchField const modes preserve public identity and state continuity',
    (tester) async {
      const key = ValueKey<String>('field-config-identity');
      final row = CatchField.read(
        copy: catchFieldCopy(AppLocalizationsEn()),
        key: key,
        title: 'Profile',
      );
      final toggle = CatchField.toggle(
        copy: catchFieldCopy(AppLocalizationsEn()),
        key: key,
        title: 'Notifications',
        value: true,
        onChanged: null,
      );

      expect(row.runtimeType, CatchField);
      expect(toggle.runtimeType, CatchField);
      expect(Widget.canUpdate(row, toggle), isTrue);

      await tester.pumpWidget(_wrap(row));
      final rowState = tester.state(find.byType(CatchField));

      await tester.pumpWidget(_wrap(toggle));

      expect(find.byType(CatchField), findsOneWidget);
      expect(tester.state(find.byType(CatchField)), same(rowState));
      expect(find.text('Notifications'), findsOneWidget);
    },
  );

  testWidgets('CatchField valueText stays inside narrow row constraints', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 180,
          child: CatchField.read(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Availability window',
            valueText: 'Weeknights after work',
            icon: CatchIcons.time,
          ),
        ),
      ),
    );

    expect(tester.takeException(), isNull);
    final fieldRight = tester.getTopRight(find.byType(CatchField)).dx;
    final valueRight = tester
        .getTopRight(find.text('Weeknights after work'))
        .dx;

    expect(valueRight, lessThanOrEqualTo(fieldRight));
  });

  testWidgets('CatchField content rows own the exact handoff type and clamps', (
    tester,
  ) async {
    const title = 'A long field title that wraps across exactly two lines';
    const body =
        'Supporting copy can use as many as three complete lines before it truncates.';

    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 160,
          child: CatchField.content(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: title,
            body: body,
          ),
        ),
      ),
    );

    final titleFinder = find.text(title);
    final bodyFinder = find.text(body);
    final titleText = tester.widget<Text>(titleFinder);
    final bodyText = tester.widget<Text>(bodyFinder);
    final titleRect = tester.getRect(titleFinder);
    final bodyRect = tester.getRect(bodyFinder);

    expect(titleText.maxLines, 2);
    expect(titleText.style?.fontSize, CatchFieldTokens.valueFontSize);
    expect(titleText.style?.fontWeight, FontWeight.w600);
    expect(titleText.style?.height, CatchFieldTokens.valueLineHeight);
    expect(bodyText.maxLines, 3);
    expect(bodyText.style?.fontSize, CatchFieldTokens.contentBodyFontSize);
    expect(bodyText.style?.fontWeight, FontWeight.w400);
    expect(bodyText.style?.height, CatchFieldTokens.contentBodyLineHeight);
    expect(titleRect.height, greaterThan(CatchFieldTokens.valueLineExtent));
    expect(
      bodyRect.height,
      greaterThan(CatchFieldTokens.contentBodyFontSize * 2),
    );
    expect(
      bodyRect.top - titleRect.bottom,
      closeTo(CatchFieldTokens.contentBodyTopGap, 0.1),
    );
  });

  testWidgets('CatchField legacy value rows retain their 1/2 clamps', (
    tester,
  ) async {
    const title = 'A legacy value label that would otherwise wrap';
    const body = 'A legacy field value that may use up to two lines.';

    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 160,
          child: CatchField.read(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: title,
            body: body,
          ),
        ),
      ),
    );

    expect(tester.widget<Text>(find.text(title)).maxLines, 1);
    expect(tester.widget<Text>(find.text(body)).maxLines, 2);
  });

  testWidgets('CatchField can render control content expanded on first build', (
    tester,
  ) async {
    final controlKey = GlobalKey();
    await tester.pumpWidget(
      _wrap(
        CatchField.control(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Capacity',
          body: '24 seats',
          disclosureMode: CatchFieldMode.localExpanded,
          child: SizedBox(
            key: controlKey,
            child: const Text('Capacity choices'),
          ),
        ),
      ),
    );

    expect(find.text('Capacity choices'), findsOneWidget);
    final controlElement = tester.element(find.byKey(controlKey));

    await tester.tap(find.byType(CatchField));
    await _pumpCatchFieldMotion(tester);

    expect(find.text('Capacity choices'), findsNothing);
    expect(
      tester.element(find.byKey(controlKey, skipOffstage: false)),
      same(controlElement),
    );

    await tester.tap(find.byType(CatchField));
    await _pumpCatchFieldMotion(tester);

    expect(find.text('Capacity choices').hitTestable(), findsOneWidget);
    expect(tester.element(find.byKey(controlKey)), same(controlElement));
  });

  testWidgets(
    'CatchField keeps disclosure chevrons centered on the value line',
    (tester) async {
      final fieldKey = GlobalKey();
      await tester.pumpWidget(
        _wrap(
          CatchField.control(
            copy: catchFieldCopy(AppLocalizationsEn()),
            key: fieldKey,
            title: 'Religion',
            body: 'Christian',
            child: const Text('Religion choices'),
          ),
        ),
      );

      Rect chevronRect() => tester.getRect(find.byIcon(CatchIcons.expand));
      Rect valueRect() => tester.getRect(find.text('Christian'));

      double chevronCenterFromFieldTop() =>
          chevronRect().center.dy - tester.getRect(find.byKey(fieldKey)).top;
      final collapsedChevronCenter = chevronRect().center.dy;
      final collapsedChevronOffset = chevronCenterFromFieldTop();
      expect(collapsedChevronCenter, closeTo(valueRect().center.dy, 0.1));
      expect(
        tester.getRect(find.byKey(fieldKey)).bottom - chevronRect().bottom,
        closeTo(
          CatchFieldTokens.rowVerticalPadding +
              (CatchFieldTokens.valueLineExtent -
                      CatchFieldTokens.disclosureGlyphExtent) /
                  2,
          0.2,
        ),
      );

      await tester.tap(find.text('Religion'));
      await _pumpCatchFieldMotion(tester);

      expect(chevronCenterFromFieldTop(), closeTo(collapsedChevronOffset, 0.1));
      expect(chevronRect().center.dy, closeTo(valueRect().center.dy, 0.1));
    },
  );

  testWidgets('CatchField drawer controls do not enter header pressed state', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchField<String>.choices(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Languages',
          body: 'English',
          values: const ['English', 'Hindi'],
          itemLabelBuilder: (value) => value,
          selected: const {'English'},
          mode: CatchChipMode.multiple,
          disclosureMode: CatchFieldMode.localExpanded,
          onSelectionChanged: (_) {},
          onCancel: () {},
          onSubmit: () {},
        ),
      ),
    );

    BoxDecoration overlayDecoration() =>
        tester
                .widget<AnimatedContainer>(
                  find.byKey(const ValueKey('catch-field-active-overlay')),
                )
                .decoration
            as BoxDecoration;

    expect(
      overlayDecoration().color,
      CatchFieldTokens.activeSurface(CatchTokens.editorialLight),
    );
    final chipGesture = await tester.startGesture(
      tester.getCenter(find.byKey(const ValueKey('catch-field-choice-Hindi'))),
    );
    await tester.pump();
    expect(
      overlayDecoration().color,
      CatchFieldTokens.activeSurface(CatchTokens.editorialLight),
    );
    await chipGesture.up();
    await tester.pump();
    expect(find.text('Hindi').hitTestable(), findsOneWidget);

    final cancelGesture = await tester.startGesture(
      tester.getCenter(find.byKey(const ValueKey('catch-field-cancel'))),
    );
    await tester.pump();
    expect(
      overlayDecoration().color,
      CatchFieldTokens.activeSurface(CatchTokens.editorialLight),
    );
    await cancelGesture.up();
  });

  testWidgets('CatchField collapsed disclosure bottom padding stays tappable', (
    tester,
  ) async {
    final openChanges = <bool>[];
    await tester.pumpWidget(
      _wrap(
        CatchField.control(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Height',
          body: '168 cm',

          onOpenChanged: openChanges.add,
          child: const Text('Height control'),
        ),
      ),
    );

    final collapsedRect = tester.getRect(find.byType(CatchField));
    await tester.tapAt(
      Offset(collapsedRect.center.dx, collapsedRect.bottom - 2),
    );
    await _pumpCatchFieldMotion(tester);

    expect(openChanges, const [true]);
    expect(find.text('Height control').hitTestable(), findsOneWidget);
  });

  testWidgets('CatchField required multi choice preserves its final value', (
    tester,
  ) async {
    Set<String>? reported;

    await tester.pumpWidget(
      _wrap(
        CatchField<String>.choices(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Languages',
          values: const ['English', 'Hindi'],
          itemLabelBuilder: (value) => value,
          selected: const {'English'},
          mode: CatchChipMode.multiple,
          disclosureMode: CatchFieldMode.localExpanded,
          onSelectionChanged: (next) => reported = next,
          onCancel: () {},
          onSubmit: () {},
        ),
      ),
    );

    await tester.tap(find.byKey(const ValueKey('catch-field-choice-English')));
    await tester.pump();
    expect(reported, isNull);
  });

  testWidgets('CatchField nav preserves explicit chevron visibility', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        Column(
          children: [
            CatchField.nav(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Hidden chevron',
              showChevron: false,
              onTap: () {},
            ),
            CatchField.nav(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Visible chevron',
              showChevron: true,
            ),
          ],
        ),
      ),
    );

    expect(find.byIcon(CatchIcons.disclosure), findsOneWidget);
  });

  testWidgets('CatchField optional add choice is one primary line at rest', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchField<String>.choices(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Religion',
          values: const ['Hindu', 'Muslim'],
          itemLabelBuilder: (value) => value,
          selected: const {},
          onSelectionChanged: (_) {},
          addable: true,
          labelMode: CatchFieldLabelTextMode.optional,
          onCancel: () {},
          onSubmit: () {},
        ),
      ),
    );

    expect(find.text('Add religion · Optional'), findsOneWidget);
    expect(find.text('Religion'), findsNothing);

    await tester.tap(find.text('Add religion · Optional'));
    await _pumpCatchFieldMotion(tester);
    expect(find.text('Religion'), findsOneWidget);
    expect(find.text(' · Optional'), findsOneWidget);
    expect(find.text('Hindu'), findsOneWidget);
  });

  testWidgets('CatchField renders canonical row content and action slot', (
    tester,
  ) async {
    var tapped = false;

    await tester.pumpWidget(
      _wrap(
        CatchField.nav(
          copy: catchFieldCopy(AppLocalizationsEn()),
          icon: CatchIcons.person,
          title: 'Display name',
          body: 'Shown on your profile and event rosters',
          actions: const Text('Edit'),
          onTap: () => tapped = true,
        ),
      ),
    );

    expect(find.byIcon(CatchIcons.person), findsOneWidget);
    expect(find.text('Display name'), findsOneWidget);
    expect(
      find.text('Shown on your profile and event rosters'),
      findsOneWidget,
    );
    expect(find.text('Edit'), findsOneWidget);
    expect(find.byIcon(CatchIcons.disclosure), findsOneWidget);

    await tester.tap(find.byType(CatchField));
    await tester.pump();

    expect(tapped, isTrue);
  });

  testWidgets('CatchField keeps non-actionable read-only fields out of focus', (
    tester,
  ) async {
    final controller = TextEditingController(text: '+91 9876543210');
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      _wrap(
        CatchField.input(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Mobile number',
          controller: controller,
          inputMode: CatchTextInputMode.inactiveWithoutSelection,
          helperText: 'Verified via OTP',
        ),
      ),
    );

    await tester.tap(find.byType(TextField));
    await tester.pump();

    final editableText = tester.widget<EditableText>(find.byType(EditableText));

    expect(editableText.readOnly, isTrue);
    expect(editableText.focusNode.hasFocus, isFalse);
  });

  testWidgets('CatchField row errors pair warning anatomy with caption text', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchField.input(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Invite code',
          initialValue: 'TAKEN',
          errorText: 'Invite code is unavailable.',
        ),
      ),
    );

    final icon = tester.widget<Icon>(find.byIcon(CatchIcons.error));
    final iconRect = tester.getRect(find.byIcon(CatchIcons.error));
    final errorFinder = find.text('Invite code is unavailable.');
    final error = tester.widget<Text>(errorFinder);
    final errorRect = tester.getRect(errorFinder);
    expect(icon.size, CatchFieldTokens.errorGlyphExtent);
    expect(icon.color, CatchTokens.editorialLight.danger);
    expect(
      errorRect.left - iconRect.right,
      closeTo(CatchFieldTokens.errorGlyphGap, 0.1),
    );
    expect(error.style?.fontSize, CatchFieldTokens.captionFontSize);
    expect(error.style?.height, CatchFieldTokens.supportLineHeight);
    final errorSemantics = tester.widget<Semantics>(
      find.byWidgetPredicate(
        (widget) =>
            widget is Semantics &&
            widget.properties.label == 'Invite code is unavailable.',
      ),
    );
    expect(errorSemantics.properties.liveRegion, isTrue);
  });

  for (final scale in [1.3, 2.0]) {
    testWidgets('CatchField row modes remain meaningful at ${scale}x text', (
      tester,
    ) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 280,
            child: CatchField.nav(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Availability window',
              valueText: 'Weeknights after work and weekend mornings',
              icon: CatchIcons.time,
              onTap: () {},
            ),
          ),
          textScale: scale,
        ),
      );

      expect(tester.takeException(), isNull);
      expectMinimumAccessibleTarget(tester, find.byType(CatchField));
      if (scale == 2.0) {
        expect(
          tester
              .getTopLeft(
                find.text('Weeknights after work and weekend mornings'),
              )
              .dy,
          greaterThan(tester.getTopLeft(find.text('Availability window')).dy),
        );
      }
    });
  }

  testWidgets('CatchField row lanes mirror in RTL', (tester) async {
    await tester.pumpWidget(
      _wrap(
        Directionality(
          textDirection: TextDirection.rtl,
          child: SizedBox(
            width: 320,
            child: CatchField.nav(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Open profile',
              icon: CatchIcons.time,
              onTap: () {},
            ),
          ),
        ),
      ),
    );

    final titleCenter = tester.getCenter(find.text('Open profile'));
    expect(
      tester.getCenter(find.byIcon(CatchIcons.time)).dx,
      greaterThan(titleCenter.dx),
    );
    expect(
      tester.getCenter(find.byIcon(CatchIcons.disclosure)).dx,
      lessThan(titleCenter.dx),
    );
  });

  testWidgets(
    'CatchField nav and add pin affordances, taps, and disabled rows',
    (tester) async {
      var navTaps = 0;
      var addTaps = 0;

      await tester.pumpWidget(
        _wrap(
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CatchField.nav(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Open profile',
                onTap: () => navTaps += 1,
              ),
              CatchField.nav(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Unavailable profile',
              ),
              CatchField.add(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Add prompt',
                onTap: () => addTaps += 1,
              ),
              CatchField.add(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Prompt limit reached',
              ),
            ],
          ),
        ),
      );

      expect(find.byIcon(CatchIcons.disclosure), findsOneWidget);
      expect(find.byIcon(CatchIcons.add), findsNWidgets(2));

      await tester.tap(find.text('Open profile'));
      await tester.tap(find.text('Add prompt'));
      await tester.tap(find.text('Unavailable profile'));
      await tester.tap(find.text('Prompt limit reached'));
      expect(navTaps, 1);
      expect(addTaps, 1);

      expect(
        tester
            .getSemantics(find.text('Unavailable profile'))
            .getSemanticsData()
            .hasAction(SemanticsAction.tap),
        isFalse,
      );
      expect(
        tester
            .getSemantics(find.text('Prompt limit reached'))
            .getSemanticsData()
            .hasAction(SemanticsAction.tap),
        isFalse,
      );
    },
  );

  testWidgets(
    'CatchField.inputActions keeps multiline values in the canonical value style',
    (tester) async {
      final controller = TextEditingController(text: 'Pablo and friends');
      addTearDown(controller.dispose);

      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 320,
            child: CatchField.inputActions(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Description',
              controller: controller,
              open: false,
              onOpenChanged: (_) {},
              onCancel: () {},
              onSubmit: () {},
              maxLines: 3,
              minLines: 2,
            ),
          ),
        ),
      );

      final editable = tester.widget<EditableText>(find.byType(EditableText));
      expect(editable.style.fontSize, CatchFieldTokens.valueFontSize);
      expect(editable.style.fontWeight, FontWeight.w500);
      expect(editable.style.height, CatchFieldTokens.multilineValueLineHeight);
    },
  );
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
