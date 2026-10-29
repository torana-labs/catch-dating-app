import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/places_repository.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/events/presentation/location_picker_screen.dart';
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:catch_dating_app/locations/shared/location_map.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart' as gmaps;

import '../test_pump_helpers.dart';
import 'events_test_helpers.dart';

void main() {
  group('LocationPickerScreen', () {
    test('stores the initial location argument', () {
      const initialLocation = LocationCoordinate(19.076, 72.8777);
      const screen = LocationPickerScreen(initialLocation: initialLocation);

      expect(screen.initialLocation, initialLocation);
    });

    testWidgets(
      'starts without a selection',
      (tester) async {
        await pumpEventsTestApp(
          tester,
          const LocationPickerScreen(loadMapTiles: false),
        );

        expect(find.byType(CatchScaffold), findsOneWidget);
        expect(find.text('Pick starting point'), findsNothing);
        expect(find.byTooltip('Back'), findsOneWidget);
        expect(find.text('Choose meeting location'), findsNothing);
        expect(find.text('No location selected'), findsOneWidget);
        expect(
          find.text(
            'Search for a place or tap the map to set the meeting point.',
          ),
          findsOneWidget,
        );
        expect(find.byType(CatchField), findsOneWidget);
        final backButtonSize = tester.getSize(find.byType(CatchIconAction));
        final searchFieldSize = tester.getSize(find.byType(CatchField));
        final targetExtent = defaultTargetPlatform == TargetPlatform.iOS
            ? 44.0
            : 48.0;
        expect(
          CatchControlMetrics.minHeight(CatchControlSurfaceSize.floating),
          targetExtent,
        );
        expect(searchFieldSize.height, targetExtent);
        expect(backButtonSize, Size.square(targetExtent));
        expect(searchFieldSize.height, backButtonSize.height);
        expect(
          tester
              .widget<CatchButton>(
                find.widgetWithText(CatchButton, 'Confirm location'),
              )
              .onPressed,
          isNull,
        );
      },
      variant: const TargetPlatformVariant({
        TargetPlatform.iOS,
        TargetPlatform.android,
      }),
    );

    testWidgets('uses the shared muted Catch map styling', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            darkTheme: AppTheme.dark,
            themeMode: ThemeMode.dark,
            home: const LocationPickerScreen(loadMapTiles: false),
          ),
        ),
      );
      await tester.pump();

      final googleMap = tester.widget<gmaps.GoogleMap>(
        find.byType(gmaps.GoogleMap),
      );

      expect(googleMap.mapType, gmaps.MapType.none);
      expect(googleMap.style, LocationMapStyle.dark);
    });

    testWidgets('can render deterministic non-platform map shell', (
      tester,
    ) async {
      await pumpEventsTestApp(
        tester,
        LocationPickerScreen(
          loadMapTiles: false,
          usePlatformMapView: false,
          initialSearchQuery: 'Bandra Social',
          initialSearchError: obviousOfflineException(),
        ),
      );

      expect(find.byType(gmaps.GoogleMap), findsNothing);
      expect(find.text('Bandra Social'), findsOneWidget);
      expect(
        find.text(
          'We are having trouble connecting. Please check your internet and try again.',
        ),
        findsOneWidget,
      );
      expect(find.text('No location selected'), findsOneWidget);
    });

    testWidgets('initial center does not count as a selected location', (
      tester,
    ) async {
      await pumpEventsTestApp(
        tester,
        const LocationPickerScreen(
          initialCenter: LocationCoordinate(19.076, 72.8777),
          loadMapTiles: false,
        ),
      );

      final googleMap = tester.widget<gmaps.GoogleMap>(
        find.byType(gmaps.GoogleMap),
      );

      expect(googleMap.initialCameraPosition.target.latitude, 19.076);
      expect(googleMap.initialCameraPosition.target.longitude, 72.8777);
      expect(find.text('No location selected'), findsOneWidget);
      expect(
        tester
            .widget<CatchButton>(
              find.widgetWithText(CatchButton, 'Confirm location'),
            )
            .onPressed,
        isNull,
      );
    });

    testWidgets('updates the selected point when the map callback fires', (
      tester,
    ) async {
      await pumpEventsTestApp(
        tester,
        const LocationPickerScreen(loadMapTiles: false),
      );

      final googleMap = tester.widget<gmaps.GoogleMap>(
        find.byType(gmaps.GoogleMap),
      );
      expect(googleMap.mapType, gmaps.MapType.none);
      const selectedPoint = LocationCoordinate(19.11, 72.91);
      googleMap.onTap?.call(
        gmaps.LatLng(selectedPoint.latitude, selectedPoint.longitude),
      );
      await tester.pump();

      expect(find.text('Pinned location'), findsOneWidget);
      expect(
        find.text('Confirm this map pin or tap elsewhere to adjust.'),
        findsOneWidget,
      );
      expect(find.text('19.110000, 72.910000'), findsNothing);
      expect(
        tester
            .widget<CatchButton>(
              find.widgetWithText(CatchButton, 'Confirm location'),
            )
            .onPressed,
        isNotNull,
      );
    });

    testWidgets(
      'uses the initial location and confirms it through navigation',
      (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: Builder(
              builder: (context) => Scaffold(
                body: Center(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<LocationPickerResult?>(
                          builder: (_) => const LocationPickerScreen(
                            initialLocation: LocationCoordinate(
                              19.076,
                              72.8777,
                            ),
                            loadMapTiles: false,
                          ),
                        ),
                      );
                    },
                    child: const Text('Open'),
                  ),
                ),
              ),
            ),
          ),
        );
        await pumpFeatureUi(tester);

        await tester.tap(find.text('Open'));
        await pumpFeatureUi(tester);

        expect(find.text('Pinned location'), findsOneWidget);
        expect(
          find.text('Confirm this map pin or tap elsewhere to adjust.'),
          findsOneWidget,
        );
        expect(find.text('19.076000, 72.877700'), findsNothing);
        expect(
          tester
              .widget<CatchButton>(
                find.widgetWithText(CatchButton, 'Confirm location'),
              )
              .onPressed,
          isNotNull,
        );

        await tester.tap(find.widgetWithText(CatchButton, 'Confirm location'));
        await pumpFeatureUi(tester);

        expect(find.text('Open'), findsOneWidget);
      },
    );

    testWidgets('searches places and uses the selected place coordinates', (
      tester,
    ) async {
      await pumpEventsTestApp(
        tester,
        const LocationPickerScreen(loadMapTiles: false),
        overrides: [
          placesRepositoryProvider.overrideWithValue(
            const _FakePlacesRepository(
              suggestions: [
                PlaceAutocompleteSuggestion(
                  placeId: 'cubbon-park',
                  description: 'Cubbon Park, Bengaluru, Karnataka',
                  mainText: 'Cubbon Park',
                  secondaryText: 'Bengaluru, Karnataka',
                ),
              ],
              placeDetails: PlaceDetails(
                placeId: 'cubbon-park',
                displayName: 'Cubbon Park',
                formattedAddress: 'Cubbon Park, Bengaluru, Karnataka',
                location: LocationCoordinate(12.9763, 77.5929),
              ),
            ),
          ),
        ],
      );

      await tester.enterText(
        find.widgetWithText(TextField, 'Search for a meeting point'),
        'Cubbon',
      );
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 350));
      await tester.pump();

      expect(find.text('Cubbon Park'), findsWidgets);
      expect(find.text('Bengaluru, Karnataka'), findsOneWidget);
      expect(find.byType(ListTile), findsNothing);

      await tester.tap(find.text('Cubbon Park'));
      await tester.pump();

      expect(find.text('Cubbon Park'), findsWidgets);
      expect(
        find.text('Confirm this place or tap elsewhere to adjust.'),
        findsOneWidget,
      );
      expect(find.text('12.976300, 77.592900'), findsNothing);
      expect(
        tester
            .widget<CatchButton>(
              find.widgetWithText(CatchButton, 'Confirm location'),
            )
            .onPressed,
        isNotNull,
      );
    });

    testWidgets('uses shared offline copy when place search fails offline', (
      tester,
    ) async {
      await pumpEventsTestApp(
        tester,
        const LocationPickerScreen(loadMapTiles: false),
        overrides: [
          placesRepositoryProvider.overrideWithValue(
            _FakePlacesRepository(
              suggestions: const [],
              placeDetails: const PlaceDetails(
                placeId: 'bandra-fort',
                displayName: 'Bandra Fort',
                formattedAddress: 'Bandra Fort, Mumbai',
                location: LocationCoordinate(19.042, 72.819),
              ),
              autocompleteError: obviousOfflineException(),
            ),
          ),
        ],
      );

      await tester.enterText(
        find.widgetWithText(TextField, 'Search for a meeting point'),
        'Bandra',
      );
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 350));
      await tester.pump();

      expect(
        find.text(
          'We are having trouble connecting. Please check your internet and try again.',
        ),
        findsOneWidget,
      );
      expect(find.text('Could not search places. Try again.'), findsNothing);
    });

    testWidgets('uses shared offline copy when place details fail offline', (
      tester,
    ) async {
      await pumpEventsTestApp(
        tester,
        const LocationPickerScreen(loadMapTiles: false),
        overrides: [
          placesRepositoryProvider.overrideWithValue(
            _FakePlacesRepository(
              suggestions: const [
                PlaceAutocompleteSuggestion(
                  placeId: 'bandra-fort',
                  description: 'Bandra Fort, Mumbai, Maharashtra',
                  mainText: 'Bandra Fort',
                  secondaryText: 'Mumbai, Maharashtra',
                ),
              ],
              placeDetails: const PlaceDetails(
                placeId: 'bandra-fort',
                displayName: 'Bandra Fort',
                formattedAddress: 'Bandra Fort, Mumbai',
                location: LocationCoordinate(19.042, 72.819),
              ),
              detailsError: obviousOfflineException(),
            ),
          ),
        ],
      );

      await tester.enterText(
        find.widgetWithText(TextField, 'Search for a meeting point'),
        'Bandra',
      );
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 350));
      await tester.pump();
      await tester.tap(find.text('Bandra Fort'));
      await tester.pump();

      expect(
        find.text(
          'We are having trouble connecting. Please check your internet and try again.',
        ),
        findsOneWidget,
      );
      expect(
        find.text('Could not load that place. Try another result.'),
        findsNothing,
      );
      expect(find.text('Bandra Fort'), findsWidgets);
    });

    testWidgets(
      'shows immediate feedback while loading selected place details',
      (tester) async {
        final detailsCompleter = Completer<PlaceDetails>();
        await pumpEventsTestApp(
          tester,
          const LocationPickerScreen(loadMapTiles: false),
          overrides: [
            placesRepositoryProvider.overrideWithValue(
              _FakePlacesRepository(
                suggestions: const [
                  PlaceAutocompleteSuggestion(
                    placeId: 'cubbon-park',
                    description: 'Cubbon Park, Bengaluru, Karnataka',
                    mainText: 'Cubbon Park',
                    secondaryText: 'Bengaluru, Karnataka',
                  ),
                ],
                placeDetails: const PlaceDetails(
                  placeId: 'cubbon-park',
                  displayName: 'Cubbon Park',
                  formattedAddress: 'Cubbon Park, Bengaluru, Karnataka',
                  location: LocationCoordinate(12.9763, 77.5929),
                ),
                detailsFuture: detailsCompleter.future,
              ),
            ),
          ],
        );

        await tester.enterText(
          find.widgetWithText(TextField, 'Search for a meeting point'),
          'Cubbon',
        );
        await pumpFeatureUiFor(tester, const Duration(milliseconds: 350));
        await tester.pump();

        await tester.tap(find.text('Cubbon Park'));
        await tester.pump();

        expect(find.text('Selecting...'), findsOneWidget);
        expect(find.text('Selecting Cubbon Park...'), findsNothing);
        expect(
          find.text('Loading place details and moving the map.'),
          findsNothing,
        );
        expect(find.text('Bengaluru, Karnataka'), findsNothing);
        expect(
          tester
              .widget<CatchButton>(
                find.widgetWithText(CatchButton, 'Confirm location'),
              )
              .onPressed,
          isNull,
        );

        detailsCompleter.complete(
          const PlaceDetails(
            placeId: 'cubbon-park',
            displayName: 'Cubbon Park',
            formattedAddress: 'Cubbon Park, Bengaluru, Karnataka',
            location: LocationCoordinate(12.9763, 77.5929),
          ),
        );
        await tester.pump();

        expect(
          find.text('Confirm this place or tap elsewhere to adjust.'),
          findsOneWidget,
        );
        expect(
          tester
              .widget<CatchButton>(
                find.widgetWithText(CatchButton, 'Confirm location'),
              )
              .onPressed,
          isNotNull,
        );
      },
    );
  });
}

class _FakePlacesRepository implements PlacesRepository {
  const _FakePlacesRepository({
    required this.suggestions,
    required this.placeDetails,
    this.detailsFuture,
    this.autocompleteError,
    this.detailsError,
  });

  final List<PlaceAutocompleteSuggestion> suggestions;
  final PlaceDetails placeDetails;
  final Future<PlaceDetails>? detailsFuture;
  final Object? autocompleteError;
  final Object? detailsError;

  @override
  Future<List<PlaceAutocompleteSuggestion>> autocomplete({
    required String input,
    required String sessionToken,
    LocationCoordinate? bias,
    String? countryIsoCode,
  }) async {
    final autocompleteError = this.autocompleteError;
    if (autocompleteError != null) throw autocompleteError;
    return suggestions;
  }

  @override
  Future<PlaceDetails> details({
    required String placeId,
    required String sessionToken,
  }) async {
    final detailsError = this.detailsError;
    if (detailsError != null) throw detailsError;
    return detailsFuture ?? placeDetails;
  }
}
