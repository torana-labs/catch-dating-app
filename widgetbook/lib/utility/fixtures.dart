import 'package:catch_test_support/design_fixtures/utility_surface_fixtures.dart';

const widgetbookUtilityViewerUid = UtilitySurfaceFixtures.viewerUid;

final widgetbookUtilityViewer = UtilitySurfaceFixtures.viewer;

final widgetbookUtilityEvent = UtilitySurfaceFixtures.event;

final widgetbookUtilityCalendarNow = UtilitySurfaceFixtures.now;

const double widgetbookUtilitySheetFrameHeight = 560;

const double widgetbookUtilityDialogFrameHeight = 360;

Stream<T> widgetbookUtilityLoadingStream<T>() =>
    UtilitySurfaceFixtures.loadingStream<T>();

Stream<T> widgetbookUtilityErrorStream<T>(String message) =>
    UtilitySurfaceFixtures.errorStream<T>(message);

Future<bool> widgetbookUtilityNoopLauncher(Uri uri, {Object? mode}) async {
  return true;
}
