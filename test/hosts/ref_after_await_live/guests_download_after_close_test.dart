import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/events/shared/attendance_sheet_view_model.dart';
import 'package:catch_dating_app/hosts/events/event_guests_controller.dart';
import 'package:catch_dating_app/hosts/events/event_guests_screen.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/catch_test_fonts.dart';
import 'package:catch_test_support/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_fixtures.dart';

// Downloading the guest list first reads the guests' names. If that read
// fails after the host has left the screen, the failure must still be logged.

void main() {
  setUpAll(loadCatchTestFonts);

  testWidgets('a guest-list download that fails after the screen closes is '
      'logged', (tester) async {
    tester.view.physicalSize = const Size(390, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final organizer = HostOperationsFixtures.primaryOrganizer;
    final uid = organizer.hostUserId!;
    final request = HostEventRequest(
      organizerId: organizer.id,
      eventId: tonightEvent.id,
    );
    final names = Completer<Map<String, (String, String?)>>();
    final logger = _RecordingLogger();
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(uid)),
        hostOperableOrganizersProvider(
          uid,
        ).overrideWithValue(AsyncData([organizer])),
        watchOrganizerProvider(
          organizer.id,
        ).overrideWith((ref) => Stream.value(organizer)),
        hostEventWorkspaceControllerProvider(
          request,
        ).overrideWithValue(workspaceReady()),
        hostEventGuestsControllerProvider(
          request,
        ).overrideWithValue(guestsReady()),
        attendanceSheetViewModelProvider(tonightEvent.id).overrideWithValue(
          AsyncData(
            AttendanceSheetViewModel(
              event: tonightEvent,
              attendeeIds: const ['guest-1'],
              attendedIds: const {},
              waitlistedIds: const [],
              profileIds: const ['guest-1'],
              participationsByUid: const {},
            ),
          ),
        ),
        hostEventGuestNamesProvider(
          'guest-1',
        ).overrideWith((ref) => names.future),
        errorLoggerProvider.overrideWithValue(logger),
      ],
    );
    addTearDown(container.dispose);
    // Keeps the names read alive once the screen is gone, as a slow network
    // read would be.
    final keep = container.listen(
      hostEventGuestNamesProvider('guest-1'),
      (_, _) {},
    );
    addTearDown(keep.close);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: HostEventGuestsScreen(request: request),
        ),
      ),
    );
    await pumpFeatureUi(tester);

    await tester.ensureVisible(find.text('Download the list'));
    await tester.tap(find.text('Download the list'));
    await tester.pump();

    await tester.pumpWidget(
      UncontrolledProviderScope(container: container, child: const SizedBox()),
    );
    names.completeError(StateError('offline'));
    await tester.pump();
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(logger.reasons, ['share the guest list']);
    await pumpFeatureUiFor(tester, const Duration(minutes: 1));
  });
}

class _RecordingLogger extends ErrorLogger {
  _RecordingLogger() : super.silent();

  final reasons = <String?>[];

  @override
  void logError(
    Object error,
    StackTrace? stackTrace, {
    bool fatal = false,
    String? reason,
  }) => reasons.add(reason);
}
