import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/hosts/create/create_route_path_screen.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:catch_l10n/generated/app_localizations.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart' as gmaps;

void main() {
  Future<void> pump(WidgetTester tester, List<RoutePoint> path) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: CreateRoutePathScreen(
          initialCenter: const LocationCoordinate(28.5245, 77.2066),
          initialPath: path,
          enableNetworkTiles: false,
        ),
      ),
    );
    await tester.pump();
  }

  testWidgets('draws the route on the system screen with the map offline', (
    tester,
  ) async {
    await pump(tester, const []);

    expect(find.byType(CatchScreen), findsOneWidget);
    expect(find.byType(CatchDock), findsOneWidget);
    expect(
      tester.widget<gmaps.GoogleMap>(find.byType(gmaps.GoogleMap)).mapType,
      gmaps.MapType.none,
    );
    final undo = tester.widget<CatchButton>(
      find.byKey(const ValueKey('create-route-path-undo')),
    );
    expect(undo.onPressed, isNull);
  });

  testWidgets('undo and clear edit the path; one point cannot be saved', (
    tester,
  ) async {
    await pump(tester, const [
      RoutePoint(latitude: 28.52, longitude: 77.2),
      RoutePoint(latitude: 28.53, longitude: 77.21),
    ]);

    CatchDock dock() => tester.widget<CatchDock>(find.byType(CatchDock));
    expect(dock().primary.onPressed, isNotNull);

    await tester.tap(find.byKey(const ValueKey('create-route-path-undo')));
    await tester.pump();
    expect(dock().primary.onPressed, isNull);

    await tester.tap(find.byKey(const ValueKey('create-route-path-clear')));
    await tester.pump();
    expect(dock().primary.onPressed, isNotNull);
  });
}
