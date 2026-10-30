import 'package:catch_dating_app/events/presentation/location_picker_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart' show Icons, TextField;
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'app_shell_test_harness.dart';

Future<void> submitValidEvent(WidgetTester tester) async {
  await fillCreateEventBasicsStep(tester);
  await tapCatchButton(tester, 'Next');

  await enterCreateEventText(
    tester,
    CreateEventFormKeys.meetingPoint,
    'Bandra Fort',
  );
  await pickCreateEventMapPoint(tester);
  await enterCreateEventText(
    tester,
    CreateEventFormKeys.locationDetails,
    'Meet at the gate',
  );
  await tapCatchButton(tester, 'Next');

  await pickFutureEventDate(tester);
  await acceptInitialEventTime(tester);
  await tapCatchButton(tester, 'Next');

  await enterCreateEventText(tester, CreateEventFormKeys.capacity, '18');
  await enterCreateEventText(tester, CreateEventFormKeys.price, '249.5');
  await enterCreateEventText(tester, CreateEventFormKeys.minAge, '21');
  await enterCreateEventText(tester, CreateEventFormKeys.maxAge, '35');
  await tapCatchButton(tester, 'Next');
  await tapCatchButton(tester, 'Schedule event');
}

Future<void> enterOrganizerText(
  String label,
  String text,
  WidgetTester tester,
) async {
  await tester.enterText(find.widgetWithText(CatchField, label), text);
}

Future<void> selectOrganizerCity(WidgetTester tester, String label) async {
  tester.binding.focusManager.primaryFocus?.unfocus();
  await tester.pump();
  final cityDropdownIcon = find.byIcon(Icons.expand_more_rounded);
  await tester.ensureVisible(cityDropdownIcon);
  await tester.tap(cityDropdownIcon);
  await pumpAppShellFrames(tester);
  await tester.tap(find.text(label).hitTestable());
  await pumpAppShellFrames(tester);
}

Future<void> fillCreateEventBasicsStep(WidgetTester tester) async {
  await enterCreateEventText(tester, CreateEventFormKeys.distance, '7.5');
  await tester.tap(find.text('Moderate'));
  await enterCreateEventText(
    tester,
    CreateEventFormKeys.description,
    'Social pacing with a coffee stop.',
  );
  await pumpAppShellFrames(tester);
}

Future<void> pickCreateEventMapPoint(WidgetTester tester) async {
  await tester.tap(find.byKey(CreateEventFormKeys.mapPicker));
  await pumpAppShellFrames(tester);

  const selectedPoint = LocationCoordinate(19.12345, 72.98765);
  final pickerContext = tester.element(find.byType(LocationPickerScreen));
  Navigator.of(pickerContext).pop(
    const LocationPickerResult(
      coordinate: selectedPoint,
      name: 'Bandra Fort',
      address: 'Bandra Fort',
    ),
  );
  await pumpAppShellFrames(tester);
}

Future<void> pickFutureEventDate(WidgetTester tester) async {
  await tester.tap(find.byKey(CreateEventFormKeys.datePicker));
  await pumpAppShellFrames(tester);
  await tester.tap(find.byTooltip('Next month'));
  await pumpAppShellFrames(tester);
  await tester.tap(find.text('1').hitTestable());
  await pumpAppShellFrames(tester);
  await tester.tap(find.text('OK'));
  await pumpAppShellFrames(tester);
}

Future<void> acceptInitialEventTime(WidgetTester tester) async {
  await tester.tap(find.byKey(CreateEventFormKeys.timePicker));
  await pumpAppShellFrames(tester);
  await tester.tap(find.text('OK'));
  await pumpAppShellFrames(tester);
}

Future<void> enterCreateEventText(
  WidgetTester tester,
  Key fieldKey,
  String text,
) async {
  await tester.enterText(
    find.descendant(of: find.byKey(fieldKey), matching: find.byType(TextField)),
    text,
  );
}

Future<void> tapCatchButton(WidgetTester tester, String label) async {
  tester.binding.focusManager.primaryFocus?.unfocus();
  await tester.pump();
  final buttonFinder = find.widgetWithText(CatchButton, label);
  await tester.ensureVisible(buttonFinder);
  await tester.tap(buttonFinder);
  await pumpAppShellFrames(tester);
}
