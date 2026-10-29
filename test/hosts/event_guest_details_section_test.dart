import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_guest_details_section.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  for (final dark in [false, true]) {
    testWidgets(
      'guest notes save, clear and reload at large text (dark=$dark)',
      (tester) async {
        tester.view.physicalSize = const Size(390, 844);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final saves = <(String, String)>[];
        Widget app({
          int revision = 1,
          bool enabled = true,
          bool keepIdentity = false,
        }) => MaterialApp(
          theme: dark ? AppTheme.dark : AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: const TextScaler.linear(2)),
            child: child!,
          ),
          home: Scaffold(
            body: SingleChildScrollView(
              child: EventGuestDetailsSection(
                key: ValueKey(keepIdentity ? 1 : revision),
                accessibility: revision == 1
                    ? 'Step-free entrance'
                    : 'Lift at rear',
                included: 'Equipment',
                enabled: enabled,
                onSave: (accessibility, included) =>
                    saves.add((accessibility, included)),
              ),
            ),
          ),
        );
        await tester.pumpWidget(app());
        Finder input(Key key) => find.descendant(
          of: find.byKey(key),
          matching: find.byType(TextField),
        );
        expect(
          tester
              .widget<TextField>(input(CreateEventFormKeys.accessibility))
              .controller!
              .text,
          'Step-free entrance',
        );
        await Scrollable.ensureVisible(
          tester.element(find.byKey(CreateEventFormKeys.included)),
        );
        await tester.enterText(
          input(CreateEventFormKeys.included),
          'Equipment\nRefreshments',
        );
        await Scrollable.ensureVisible(
          tester.element(find.byKey(CreateEventFormKeys.accessibility)),
        );
        await tester.enterText(input(CreateEventFormKeys.accessibility), '');
        await tester.pump();
        await tester.pumpWidget(app(revision: 2, keepIdentity: true));
        expect(
          tester
              .widget<TextField>(input(CreateEventFormKeys.accessibility))
              .controller!
              .text,
          '',
        );
        final save = find.byWidgetPredicate(
          (widget) =>
              widget is CatchField && widget.title == 'Save guest information',
        );
        FocusManager.instance.primaryFocus?.unfocus();
        await pumpFeatureUi(tester);
        await Scrollable.ensureVisible(
          tester.element(find.text('Save guest information')),
          alignment: 0.5,
        );
        await tester.pump();
        await tester.tap(find.text('Save guest information'));
        expect(saves, [('', 'Equipment\nRefreshments')]);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(app(revision: 2, enabled: false));
        expect(
          tester
              .widget<TextField>(input(CreateEventFormKeys.accessibility))
              .controller!
              .text,
          'Lift at rear',
        );
        expect(tester.widget<CatchField>(save).onTap, isNull);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
