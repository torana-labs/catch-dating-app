import 'package:catch_dating_app/hosts/presentation/event_management/widgets/route_path_builder_screen.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart' as gmaps;

void main() {
  testWidgets('route builder uses the canonical compact route surface', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: const RoutePathBuilderScreen(
          initialCenter: LocationCoordinate(28.5245, 77.2066),
          enableNetworkTiles: false,
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(CatchRouteScaffold), findsOneWidget);
    final topBar = tester.widget<CatchTopBar>(find.byType(CatchTopBar));
    expect(topBar.navigation.mode, CatchTopBarNavigationMode.close);
    expect(topBar.emphasis, CatchTopBarEmphasis.plain);
    expect(
      tester.widget<gmaps.GoogleMap>(find.byType(gmaps.GoogleMap)).mapType,
      gmaps.MapType.none,
    );
  });
}
