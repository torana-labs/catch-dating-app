import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('action rows expose caller-owned selection', (tester) async {
    var taps = 0;
    await tester.pumpWidget(
      _wrap(
        CatchSection.containedRows(
          children: [
            CatchField.action(
              key: const ValueKey('selected-action'),
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Alex Morgan',
              states: const {WidgetState.selected},
              onTap: () => taps++,
            ),
          ],
        ),
      ),
    );

    final field = find.byKey(const ValueKey('selected-action'));
    expect(
      find.descendant(
        of: field,
        matching: find.byWidgetPredicate(
          (widget) => widget is Semantics && widget.properties.selected == true,
        ),
      ),
      findsOneWidget,
    );
    expect(find.byIcon(CatchIcons.disclosure), findsNothing);
    await tester.tap(field);
    expect(taps, 1);
  });

  testWidgets('field action labels follow caller copy and saving state', (
    tester,
  ) async {
    for (final loading in [false, true]) {
      await tester.pumpWidget(
        _wrap(
          CatchFieldActionRow(
            cancelLabel: 'Annuler',
            doneLabel: 'Terminer',
            savingLabel: 'Enregistrement',
            loading: loading,
            onCancel: () {},
            onSubmit: () {},
          ),
        ),
      );
      expect(find.text('Annuler'), findsOneWidget);
      expect(
        find.text(loading ? 'Enregistrement' : 'Terminer'),
        findsOneWidget,
      );
      expect(find.text(loading ? 'Terminer' : 'Enregistrement'), findsNothing);
    }
  });

  testWidgets('field status semantics follow caller copy after state changes', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    for (final status in [CatchFieldStatus.saving, CatchFieldStatus.saved]) {
      await tester.pumpWidget(
        _wrap(
          CatchFieldStatusIndicator(
            status: status,
            savingSemanticLabel: 'En cours',
            savedSemanticLabel: 'Enregistre',
          ),
        ),
      );
      await tester.pump();
      await tester.pump(CatchMotion.base);
      expect(
        find.bySemanticsLabel(
          status == CatchFieldStatus.saving ? 'En cours' : 'Enregistre',
        ),
        findsOneWidget,
      );
    }
    semantics.dispose();
  });

  testWidgets('field content uses supplied optional copy at large text scale', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    await tester.pumpWidget(
      _wrap(
        CatchFieldContentRow(
          title: 'Notes',
          body: 'Details',
          isOptional: true,
          labelCopy: CatchFieldLabelTextCopy(
            optionalLabel: 'Facultatif',
            optionalSuffix: ' (facultatif)',
            optionalSemantics: (label) => '$label, facultatif',
          ),
        ),
        textScale: 2,
      ),
    );
    expect(find.text(' (facultatif)'), findsOneWidget);
    expect(find.bySemanticsLabel('Notes, facultatif'), findsOneWidget);
    semantics.dispose();
  });

  testWidgets('CatchField valueText occupies a right-aligned value lane', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 360,
          child: CatchField.read(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Help & support',
            valueText: 'Contact us',
            icon: CatchIcons.help,
          ),
        ),
      ),
    );

    final valueText = tester.widget<Text>(find.text('Contact us'));
    final valueBox = tester.getSize(find.text('Contact us'));
    final labelRight = tester.getTopRight(find.text('Help & support')).dx;
    final valueLeft = tester.getTopLeft(find.text('Contact us')).dx;

    expect(valueText.textAlign, TextAlign.right);
    expect(
      valueBox.width,
      lessThanOrEqualTo(CatchLayout.fieldTrailingValueMaxWidth),
    );
    expect(valueLeft, greaterThan(labelRight));
  });

  testWidgets('CatchField row keeps its own horizontal gutter by default', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 360,
          child: CatchField.read(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Notifications',
            valueText: 'On',
            icon: CatchIcons.help,
          ),
        ),
      ),
    );

    final fieldRect = tester.getRect(find.byType(CatchField));
    final iconRect = tester.getRect(find.byIcon(CatchIcons.help));
    final labelLeft = tester.getTopLeft(find.text('Notifications')).dx;
    final valueRight = tester.getTopRight(find.text('On')).dx;

    expect(iconRect.left - fieldRect.left, CatchSpacing.s4);
    expect(
      labelLeft - fieldRect.left,
      CatchSpacing.s4 + CatchFieldRow.textLaneInset,
    );
    expect(fieldRect.right - valueRight, CatchSpacing.s4);
  });

  testWidgets('CatchFieldGeometryScope assigns the gutter to the container', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 360,
          child: CatchFieldGeometryScope(
            gutterOwnership: CatchFieldGeometryScopeMode.container,
            child: CatchField.read(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Notifications',
              valueText: 'On',
              icon: CatchIcons.help,
            ),
          ),
        ),
      ),
    );

    final fieldRect = tester.getRect(find.byType(CatchField));
    final iconRect = tester.getRect(find.byIcon(CatchIcons.help));
    final labelLeft = tester.getTopLeft(find.text('Notifications')).dx;
    final valueRight = tester.getTopRight(find.text('On')).dx;

    expect(iconRect.left, fieldRect.left);
    expect(labelLeft - fieldRect.left, CatchFieldRow.textLaneInset);
    expect(valueRight, fieldRect.right);
  });

  testWidgets('CatchFieldLanes.single preserves standalone field geometry', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 360,
          child: CatchFieldLanes.single(
            child: CatchField.read(
              copy: catchFieldCopy(AppLocalizationsEn()),
              key: const ValueKey('notifications-field'),
              title: 'Notifications',
              valueText: 'On',
              icon: CatchIcons.help,
            ),
          ),
        ),
      ),
    );

    final fieldRect = tester.getRect(
      find.byKey(const ValueKey('notifications-field')),
    );
    final iconRect = tester.getRect(find.byIcon(CatchIcons.help));

    expect(iconRect.left - fieldRect.left, CatchSpacing.s4);
    expect(find.byType(CatchFieldLanes), findsOneWidget);
  });

  testWidgets('CatchFieldLanes.divided owns row gutters and separators', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 360,
          child: CatchFieldLanes.divided(
            children: [
              CatchField.read(
                copy: catchFieldCopy(AppLocalizationsEn()),
                key: const ValueKey('country-field'),
                title: 'Country',
                valueText: 'India',
              ),
              CatchField.read(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Currency',
                valueText: 'INR',
              ),
            ],
          ),
        ),
      ),
    );

    final firstField = find.byKey(const ValueKey('country-field'));
    final fieldRect = tester.getRect(firstField);
    final titleLeft = tester.getTopLeft(find.text('Country')).dx;

    expect(titleLeft, fieldRect.left);
    expect(find.byType(CatchDivider), findsOneWidget);
  });

  testWidgets('CatchField keeps open active chrome while saving', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchField.control(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Height',
          body: '168 cm',
          disclosureMode: CatchFieldMode.controlledExpanded,
          status: CatchFieldStatus.saving,
          child: const Text('Height control'),
        ),
      ),
    );

    final activeOverlay = tester.widget<AnimatedContainer>(
      find.byKey(const ValueKey('catch-field-active-overlay')),
    );
    final decoration = activeOverlay.decoration! as BoxDecoration;

    expect(decoration.color, isNot(Colors.transparent));
    expect(decoration.boxShadow, isNotEmpty);
    expect(
      tester
          .widget<FocusableActionDetector>(find.byType(FocusableActionDetector))
          .enabled,
      isFalse,
    );
  });

  testWidgets('CatchField choices derives its multi summary in option order', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchField<String>.choices(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Languages',
          values: const ['English', 'Hindi', 'Marathi'],
          itemLabelBuilder: (value) => value,
          selected: const {'Marathi', 'English'},
          mode: CatchChipMode.multiple,
          onSelectionChanged: (_) {},
        ),
      ),
    );

    expect(find.text('English · Marathi'), findsOneWidget);
    expect(find.text('Marathi · English'), findsNothing);
    expect(find.textContaining(','), findsNothing);
  });

  testWidgets('CatchField action bar shares the trailing edge and baseline', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 360,
          child: CatchField<String>.choices(
            copy: catchFieldCopy(AppLocalizationsEn()),
            icon: CatchIcons.language,
            title: 'Languages',
            body: 'English · Hindi',
            values: const ['English', 'Hindi'],
            itemLabelBuilder: (value) => value,
            selected: const {'English', 'Hindi'},
            mode: CatchChipMode.multiple,
            disclosureMode: CatchFieldMode.localExpanded,
            onSelectionChanged: (_) {},
            onCancel: () {},
            onSubmit: () {},
          ),
        ),
      ),
    );

    final fieldRect = tester.getRect(find.byType(CatchField));
    final cancelRect = tester.getRect(
      find.byKey(const ValueKey('catch-field-cancel')),
    );
    final doneRect = tester.getRect(
      find.byKey(const ValueKey('catch-field-done')),
    );
    final caretRect = tester.getRect(find.byIcon(CatchIcons.expand));

    expect(
      doneRect.right,
      closeTo(fieldRect.right - CatchFieldTokens.rowHorizontalPadding, 0.1),
    );
    expect(doneRect.right, closeTo(caretRect.right, 0.1));
    expect(doneRect.left - cancelRect.right, CatchFieldTokens.actionButtonGap);
    expect(doneRect.top, cancelRect.top);
    expect(doneRect.bottom, cancelRect.bottom);
    expect(
      fieldRect.bottom - doneRect.bottom,
      closeTo(CatchFieldTokens.rowVerticalPadding, 0.1),
    );
  });

  testWidgets('CatchField action bar stays on one row at compact width', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          key: const ValueKey('compact-action-bar'),
          width: 220,
          child: CatchFieldActionRow(
            cancelLabel: 'Cancel',
            doneLabel: 'Done',
            savingLabel: 'Saving',
            onCancel: () {},
            onSubmit: () {},
          ),
        ),
      ),
    );

    final barRect = tester.getRect(
      find.byKey(const ValueKey('compact-action-bar')),
    );
    final cancelRect = tester.getRect(
      find.byKey(const ValueKey('catch-field-cancel')),
    );
    final doneRect = tester.getRect(
      find.byKey(const ValueKey('catch-field-done')),
    );

    expect(cancelRect.top, doneRect.top);
    expect(cancelRect.bottom, doneRect.bottom);
    expect(doneRect.right, barRect.right);
    expect(doneRect.left - cancelRect.right, CatchFieldTokens.actionButtonGap);
  });

  testWidgets('CatchField divided action bar reaches the flush trailing edge', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 360,
          child: CatchSection.fieldRows(
            title: 'About you',
            children: [
              CatchField<String>.choices(
                copy: catchFieldCopy(AppLocalizationsEn()),
                icon: CatchIcons.language,
                title: 'Languages',
                values: const ['English', 'Hindi'],
                itemLabelBuilder: (value) => value,
                selected: const {'English'},
                mode: CatchChipMode.multiple,
                disclosureMode: CatchFieldMode.localExpanded,
                onSelectionChanged: (_) {},
                onCancel: () {},
                onSubmit: () {},
              ),
            ],
          ),
        ),
      ),
    );

    final fieldRect = tester.getRect(find.byType(CatchField));
    final actionBarRect = tester.getRect(
      find.byKey(const ValueKey('catch-field-action-bar')),
    );
    final doneRect = tester.getRect(
      find.byKey(const ValueKey('catch-field-done')),
    );
    final caretRect = tester.getRect(find.byIcon(CatchIcons.expand));

    expect(actionBarRect.right, fieldRect.right);
    expect(doneRect.right, fieldRect.right);
    expect(doneRect.right, caretRect.right);
  });

  testWidgets('CatchField toggle centers its leading, text, and switch', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchField.toggle(
          copy: catchFieldCopy(AppLocalizationsEn()),
          icon: CatchIcons.show,
          title: 'Show my pace on my profile',
          value: true,
          onChanged: (_) {},
        ),
      ),
    );

    final iconCenter = tester.getCenter(find.byIcon(CatchIcons.show));
    final labelCenter = tester.getCenter(
      find.text('Show my pace on my profile'),
    );
    final toggleCenter = tester.getCenter(
      find.byKey(const ValueKey('catch-field-toggle')),
    );

    expect(iconCenter.dy, closeTo(labelCenter.dy, 0.5));
    expect(toggleCenter.dy, closeTo(labelCenter.dy, 0.5));
  });

  testWidgets('CatchField derives trailing affordances from field capability', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CatchField.read(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Date of birth',
              body: '16/07/1994',
            ),
            CatchField.nav(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'City',
              body: 'Indore',
              onTap: () {},
            ),
            CatchField.input(
              copy: catchFieldCopy(AppLocalizationsEn()),
              icon: CatchIcons.person,
              title: 'Display name',
              initialValue: 'Suvrat',
            ),
            CatchField.input(
              copy: catchFieldCopy(AppLocalizationsEn()),
              icon: CatchIcons.birthday,
              title: 'Locked value',
              initialValue: 'Fixed',
              inputMode: CatchTextInputMode.inactiveWithoutSelection,
            ),
            CatchField.action(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Notification',
              body: 'Starts tomorrow',
              actions: const Text('2H'),
              onTap: () {},
            ),
          ],
        ),
      ),
    );

    expect(find.byIcon(CatchIcons.disclosure), findsOneWidget);
    expect(find.byIcon(CatchIcons.expand), findsNothing);
  });

  testWidgets('CatchField explicit-save preserves label metrics and order', (
    tester,
  ) async {
    final controller = TextEditingController(text: 'Catch me if you can');
    addTearDown(controller.dispose);
    var expanded = false;
    late void Function(bool value) setExpanded;

    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) {
            setExpanded = (value) => setState(() => expanded = value);
            return Align(
              alignment: Alignment.topCenter,
              child: SizedBox(
                width: 360,
                child: CatchField.inputActions(
                  copy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'A perfect event with me looks like...',
                  controller: controller,
                  open: expanded,
                  onOpenChanged: setExpanded,
                  meta: const Text('19 / 300'),
                  actions: const Text('Change prompt'),
                  onCancel: () => setExpanded(false),
                  onSubmit: () {},
                ),
              ),
            );
          },
        ),
      ),
    );

    final labelFinder = find.text('A perfect event with me looks like...');
    final collapsedLabel = tester.widget<Text>(labelFinder);
    final collapsedRect = tester.getRect(labelFinder);

    setExpanded(true);
    await tester.pump();
    await tester.pump(CatchMotion.base);
    await tester.pump();

    final focusedLabel = tester.widget<Text>(labelFinder);
    final focusedRect = tester.getRect(labelFinder);
    expect(focusedLabel.style?.fontSize, collapsedLabel.style?.fontSize);
    expect(focusedLabel.style?.fontWeight, collapsedLabel.style?.fontWeight);
    expect(focusedLabel.style?.height, collapsedLabel.style?.height);
    expect(
      focusedLabel.style?.letterSpacing,
      collapsedLabel.style?.letterSpacing,
    );
    expect(focusedRect.topLeft, collapsedRect.topLeft);

    final answerBottom = tester.getBottomLeft(find.byType(EditableText)).dy;
    final counterTop = tester.getTopLeft(find.text('19 / 300')).dy;
    final secondaryTop = tester.getTopLeft(find.text('Change prompt')).dy;
    final cancelTop = tester.getTopLeft(find.text('Cancel')).dy;
    final doneTop = tester.getTopLeft(find.text('Done')).dy;
    expect(answerBottom, lessThan(counterTop));
    expect(counterTop, lessThan(secondaryTop));
    expect(secondaryTop, lessThan(cancelTop));
    expect(secondaryTop, lessThan(doneTop));
  });

  testWidgets('CatchField supports a custom semantic leading widget', (
    tester,
  ) async {
    var tapped = false;

    await tester.pumpWidget(
      _wrap(
        CatchField.nav(
          copy: catchFieldCopy(AppLocalizationsEn()),
          leading: Semantics(label: '27 May', child: const Text('27')),
          leadingExtent: 48,
          title: 'Wednesday Evening Run',
          body: '2 attended · 20% full · free',
          onTap: () => tapped = true,
        ),
      ),
    );

    final field = tester.widget<CatchField>(find.byType(CatchField));
    expect(field.leading, isA<Semantics>());
    expect((field.leading! as Semantics).properties.label, '27 May');
    expect(find.text('Wednesday Evening Run'), findsOneWidget);
    expect(find.text('2 attended · 20% full · free'), findsOneWidget);
    expect(find.byIcon(CatchIcons.disclosure), findsOneWidget);

    await tester.tap(find.byType(CatchField));
    await tester.pump();
    expect(tapped, isTrue);
  });

  testWidgets('CatchField row fills loose bounded parent width', (
    tester,
  ) async {
    var tapped = false;

    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 360,
          child: Align(
            alignment: Alignment.topLeft,
            child: CatchField.nav(
              copy: catchFieldCopy(AppLocalizationsEn()),
              icon: CatchIcons.person,
              title: 'Display name',
              body: 'Shown on your profile and event rosters',
              onTap: () => tapped = true,
            ),
          ),
        ),
      ),
    );

    final fieldRect = tester.getRect(find.byType(CatchField));
    expect(fieldRect.width, 360);

    await tester.tapAt(Offset(fieldRect.right - 4, fieldRect.center.dy));
    await tester.pump();

    expect(tapped, isTrue);
  });

  testWidgets('CatchField tappable rows own full-width tokenized ink', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 360,
          child: CatchSection.fieldRows(
            first: true,
            title: 'Today',
            children: [
              CatchField.action(
                copy: catchFieldCopy(AppLocalizationsEn()),
                icon: CatchIcons.notifications,
                title: 'Event starts tomorrow',
                body: 'Sundowner 5K meets at Carter Road Jetty.',
                actions: const Text('2H'),
                onTap: () {},
              ),
            ],
          ),
        ),
      ),
    );

    final fieldRect = tester.getRect(find.byType(CatchField));
    final overlayFinder = find.descendant(
      of: find.byType(CatchField),
      matching: find.byKey(CatchField.pressOverlayKey),
    );
    final overlayRect = tester.getRect(overlayFinder);

    expect(overlayRect.left, fieldRect.left - CatchFieldTokens.dividedRowBleed);
    expect(
      overlayRect.right,
      fieldRect.right + CatchFieldTokens.dividedRowBleed,
    );

    final iconRect = tester.getRect(find.byIcon(CatchIcons.notifications));
    final titleLeft = tester.getTopLeft(find.text('Event starts tomorrow')).dx;
    expect(iconRect.left, fieldRect.left);
    expect(titleLeft - fieldRect.left, CatchFieldRow.textLaneInset);

    final gesture = await tester.startGesture(
      Offset(fieldRect.right - 4, fieldRect.center.dy),
    );
    await tester.pump();

    final overlay = tester.widget<AnimatedContainer>(overlayFinder);
    final pressedDecoration = overlay.decoration! as BoxDecoration;
    expect(
      pressedDecoration.color,
      CatchFieldTokens.pressedSurface(CatchTokens.editorialLight),
    );
    expect(
      pressedDecoration.borderRadius,
      BorderRadius.circular(CatchFieldTokens.tileRadius),
    );
    expect(
      pressedDecoration.border,
      CatchBorder.resolve(
        CatchTokens.editorialLight,
        CatchBorderRole.boundary,
      ).all,
    );

    await gesture.up();
    await tester.pump();
    await tester.pump(CatchFieldTokens.pressOut);

    final releasedOverlay = tester.widget<AnimatedContainer>(overlayFinder);
    final releasedDecoration = releasedOverlay.decoration! as BoxDecoration;
    expect(releasedDecoration.color, Colors.transparent);
    expect(releasedDecoration.border, isNull);
  });

  testWidgets('CatchField press chrome ignores secondary taps and drag exits', (
    tester,
  ) async {
    var taps = 0;
    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 360,
          child: CatchField.action(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Interactive row',
            onTap: () => taps++,
          ),
        ),
      ),
    );

    final fieldRect = tester.getRect(find.byType(CatchField));
    final overlayFinder = find.byKey(CatchField.pressOverlayKey);

    await tester.sendEventToBinding(
      PointerAddedEvent(
        pointer: 41,
        position: fieldRect.center,
        kind: PointerDeviceKind.mouse,
      ),
    );
    await tester.sendEventToBinding(
      PointerHoverEvent(
        pointer: 41,
        position: fieldRect.center,
        kind: PointerDeviceKind.mouse,
      ),
    );
    await tester.pump();
    final hoverColor =
        (tester.widget<AnimatedContainer>(overlayFinder).decoration!
                as BoxDecoration)
            .color;
    await tester.sendEventToBinding(
      PointerDownEvent(
        pointer: 41,
        position: fieldRect.center,
        kind: PointerDeviceKind.mouse,
        buttons: kSecondaryMouseButton,
      ),
    );
    await tester.pump();
    var decoration =
        tester.widget<AnimatedContainer>(overlayFinder).decoration!
            as BoxDecoration;
    expect(decoration.color, hoverColor);
    expect(decoration.border, isNull);
    await tester.sendEventToBinding(
      PointerUpEvent(
        pointer: 41,
        position: fieldRect.center,
        kind: PointerDeviceKind.mouse,
      ),
    );
    await tester.sendEventToBinding(
      PointerRemovedEvent(
        pointer: 41,
        position: fieldRect.center,
        kind: PointerDeviceKind.mouse,
      ),
    );
    await tester.pump();

    final gesture = await tester.startGesture(fieldRect.center);
    await tester.pump();
    await gesture.moveBy(const Offset(kTouchSlop + 8, 0));
    await tester.pump();
    decoration =
        tester.widget<AnimatedContainer>(overlayFinder).decoration!
            as BoxDecoration;
    expect(decoration.color, Colors.transparent);
    expect(decoration.border, isNull);
    await gesture.up();
    await tester.pump();

    expect(taps, 0);
  });

  testWidgets(
    'CatchField hides an input-only leading unit until empty Add receives focus',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 320,
            child: CatchField.input(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Instagram',
              leadingUnit: '@',
              inputHint: 'handle',
            ),
          ),
        ),
      );

      final inputElement = tester.element(find.byType(TextField));
      expect(find.text('Add instagram'), findsOneWidget);
      expect(find.text('@'), findsNothing);

      await tester.tap(find.byType(TextField));
      await tester.pump();
      await tester.pump(CatchMotion.fast);

      expect(tester.element(find.byType(TextField)), same(inputElement));
      expect(find.text('Instagram'), findsOneWidget);
      expect(find.text('@'), findsOneWidget);
      expect(find.text('handle'), findsOneWidget);
    },
  );

  testWidgets('CatchField clearable input uses the row trailing slot', (
    tester,
  ) async {
    final controller = TextEditingController(text: 'Run');
    addTearDown(controller.dispose);
    var latest = 'Run';

    await tester.pumpWidget(
      _wrap(
        SizedBox(
          width: 320,
          child: CatchField.input(
            copy: catchFieldCopy(AppLocalizationsEn()),
            title: 'Search hosts',
            controller: controller,
            showClearButton: true,
            trailing: Icon(CatchIcons.search),
            onChanged: (value) => latest = value,
          ),
        ),
      ),
    );

    final fieldRect = tester.getRect(find.byType(TextField));
    final clearRect = tester.getRect(find.byTooltip('Clear Search hosts'));

    expect(clearRect.left, greaterThan(fieldRect.right));

    await tester.tap(find.byTooltip('Clear Search hosts'));
    await tester.pump();

    expect(controller.text, isEmpty);
    expect(latest, isEmpty);
    expect(find.byIcon(CatchIcons.search), findsOneWidget);
  });

  testWidgets('CatchField valid row renders success trailing state', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchField.read(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Invite code',
          body: 'RUNCLUB',
          valid: true,
        ),
      ),
    );

    final validIcon = tester.widget<Icon>(find.byIcon(CatchIcons.success));
    expect(validIcon.color, CatchTokens.editorialLight.success);
  });

  testWidgets('CatchField success helper uses success support color', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CatchField.input(
          copy: catchFieldCopy(AppLocalizationsEn()),
          title: 'Invite code',
          initialValue: 'RUNCLUB',
          helperText: 'Invite code is available.',
          helperTone: CatchFieldSupportRowTone.success,
        ),
      ),
    );

    final helper = tester.widget<Text>(find.text('Invite code is available.'));
    expect(helper.style?.color, CatchTokens.editorialLight.success);
    expect(helper.style?.fontSize, CatchFieldTokens.captionFontSize);
    expect(helper.style?.fontWeight, FontWeight.w500);
    expect(helper.style?.height, CatchFieldTokens.supportLineHeight);
  });

  testWidgets(
    'CatchField supports underline, action suffix, and tabular figures',
    (tester) async {
      final controller = TextEditingController(text: '42');
      addTearDown(controller.dispose);

      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 320,
            child: CatchField.input(
              copy: catchFieldCopy(AppLocalizationsEn()),
              title: 'Distance',
              controller: controller,
              variant: CatchFieldVariant.underline,
              textAlign: TextAlign.center,
              fontFeatures: const [FontFeature.tabularFigures()],
              states: const <WidgetState>{WidgetState.focused},
              actions: const Text('KM'),
            ),
          ),
        ),
      );

      final editableText = tester.widget<EditableText>(
        find.byType(EditableText),
      );
      final baseline = tester.widget<DecoratedBox>(
        find.byKey(const ValueKey('catch-field-underline-baseline')),
      );
      final decoration = baseline.decoration as BoxDecoration;
      final border = decoration.border! as Border;
      final sweep = tester.widget<TweenAnimationBuilder<double>>(
        find.byKey(const ValueKey('catch-field-underline-sweep')),
      );

      expect(find.text('KM'), findsOneWidget);
      expect(editableText.textAlign, TextAlign.center);
      expect(
        editableText.style.fontFeatures,
        contains(const FontFeature.tabularFigures()),
      );
      expect(border.bottom.width, CatchStroke.hairline);
      expect(sweep.duration, CatchFieldTokens.reveal);
      await tester.pump(CatchFieldTokens.reveal);
      expect(
        tester
            .getSize(
              find.byKey(const ValueKey('catch-field-underline-sweep-bar')),
            )
            .width,
        closeTo(tester.getSize(find.byType(TextField)).width, 0.1),
      );
    },
  );

  testWidgets(
    'CatchFieldLanes preserves section-owned grouped active geometry',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            width: 360,
            child: CatchSection.containedFieldRows(
              children: [
                CatchFieldLanes.divided(
                  children: [
                    CatchField.control(
                      copy: catchFieldCopy(AppLocalizationsEn()),
                      title: 'Prompt',
                      body: 'Question',
                      disclosureMode: CatchFieldMode.controlledExpanded,
                      child: const Text('Prompt choices'),
                    ),
                    CatchField.read(
                      copy: catchFieldCopy(AppLocalizationsEn()),
                      title: 'Answer',
                      body: 'Response',
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );

      final overlayFinder = find.byKey(
        const ValueKey<String>('catch-field-active-overlay'),
      );
      final overlay = tester.widget<AnimatedContainer>(overlayFinder);
      final decoration = overlay.decoration! as BoxDecoration;
      final sectionRect = tester.getRect(find.byType(CatchSectionSurface));
      final overlayRect = tester.getRect(overlayFinder);

      expect(decoration.border, isNotNull);
      expect(decoration.borderRadius, BorderRadius.zero);
      expect(overlayRect.left, closeTo(sectionRect.left, 0.1));
      expect(overlayRect.right, closeTo(sectionRect.right, 0.1));
      expect(
        find.ancestor(
          of: overlayFinder,
          matching: find.byKey(CatchSectionSurface.rowGroupClipKey),
        ),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'CatchField disables field chrome animation when reduced motion is on',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          MediaQuery(
            data: const MediaQueryData(disableAnimations: true),
            child: SizedBox(
              width: 320,
              child: CatchField.input(
                copy: catchFieldCopy(AppLocalizationsEn()),
                title: 'Distance',
                initialValue: '42',
                variant: CatchFieldVariant.underline,
                states: const <WidgetState>{WidgetState.focused},
              ),
            ),
          ),
        ),
      );

      final chrome = tester.widget<TweenAnimationBuilder<double>>(
        find.byKey(const ValueKey('catch-field-underline-sweep')),
      );

      expect(chrome.duration, Duration.zero);
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
