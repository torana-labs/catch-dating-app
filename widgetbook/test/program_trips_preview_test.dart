import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/programs/presentation/program_trips_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/programs/use_cases.dart';
import 'package:widgetbook_workspace/utility/preview.dart';

Future<ProgramTripsScreen> _pumpPreview(WidgetTester tester) async {
  tester.view.devicePixelRatio = 1.0;
  tester.view.physicalSize = const Size(460, 1000);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: Builder(builder: programTripsScreenStates),
    ),
  );
  await tester.pump();
  expect(tester.takeException(), isNull);
  return tester.widget<ProgramTripsScreen>(find.byType(ProgramTripsScreen));
}

Finder _enRouteRow() => find.byWidgetPredicate(
  (widget) =>
      widget is ProgramTripLedgerRow &&
      widget.trip.status == TransportTripStatus.enRoute,
);

void main() {
  testWidgets('Trips catalog uses its fixture clock for active duty actions', (
    tester,
  ) async {
    final screen = await _pumpPreview(tester);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(ProgramTripsScreen)),
    );
    expect(screen.now, isNotNull);
    expect(screen.now!(), container.read(programProjectionClockProvider)());
    expect(_enRouteRow(), findsOneWidget);
    expect(tester.widget<ProgramTripLedgerRow>(_enRouteRow()).canVoid, isTrue);
    expect(find.text('Void this trip'), findsOneWidget);
  });

  testWidgets('the same Trips fixture loses actions when its grant expires', (
    tester,
  ) async {
    final screen = await _pumpPreview(tester);
    final screenFinder = find.byType(ProgramTripsScreen);
    final container = ProviderScope.containerOf(tester.element(screenFinder));
    final access = container
        .read(programWorkEntryProvider(screen.programId, null))
        .requireValue
        .value;
    final scope = tester.widget<ProviderScope>(
      find.ancestor(of: screenFinder, matching: find.byType(ProviderScope)),
    );
    expect(screen.now, isNotNull);
    expect(access.grantExpiresAt, isNotNull);
    expect(screen.now!().isBefore(access.grantExpiresAt!), isTrue);
    expect(find.text('Void this trip'), findsOneWidget);

    // Keep the catalog's actual access and trip fixtures. Only the screen's
    // existing clock seam advances to the grant's exclusive expiry boundary.
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: WidgetbookUtilityDeviceFrame(
          child: ProviderScope(
            overrides: scope.overrides,
            child: ProgramTripsScreen(
              programId: screen.programId,
              now: () => access.grantExpiresAt!,
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(_enRouteRow(), findsOneWidget);
    expect(tester.widget<ProgramTripLedgerRow>(_enRouteRow()).canVoid, isFalse);
    expect(find.text('Void this trip'), findsNothing);
  });
}
