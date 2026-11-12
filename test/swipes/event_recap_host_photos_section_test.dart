import 'package:catch_dating_app/contexts/events/domain/event_host_photos.dart';
import 'package:catch_dating_app/swipes/presentation/event_host_photo_viewer_screen.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_host_photos_section.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

EventHostPhoto _photo(int index) => EventHostPhoto(
  photoId: 'photo-$index',
  thumbnailUrl: '',
  displayUrl: '',
  width: 1200,
  height: 1600,
  uploadedByUid: 'host-1',
  createdAt: DateTime(2026, 11, 12, 0, index),
);

Future<void> _pump(
  WidgetTester tester,
  Widget child, {
  double textScale = 1,
}) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: TextScaler.linear(textScale)),
        child: child!,
      ),
      home: child,
    ),
  );
  await tester.pump();
}

Widget _section({
  String? organizerName = 'Saturday Supper Club',
  int count = 3,
  ValueChanged<int>? onOpen,
}) => CatchRoot(
  child: CatchScreen(
    body: CatchPageBody(
      child: EventRecapHostPhotosSection(
        organizerName: organizerName,
        photos: [for (var index = 0; index < count; index++) _photo(index)],
        onOpen: onOpen ?? (_) {},
      ),
    ),
  ),
);

void main() {
  testWidgets('names the organizer and opens the tapped photo', (tester) async {
    final opened = <int>[];
    await _pump(tester, _section(onOpen: opened.add));

    expect(find.text('PHOTOS FROM SATURDAY SUPPER CLUB'), findsOneWidget);
    expect(find.text('Shared with everyone who came.'), findsOneWidget);
    expect(
      find.bySemanticsLabel('Photo 2 of 3. Opens full screen.'),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey('after-event-host-photo-1')));
    expect(opened, [1]);
  });

  testWidgets('falls back to the host when the organizer is unknown', (
    tester,
  ) async {
    await _pump(tester, _section(organizerName: null, count: 1));
    expect(find.text('PHOTOS FROM THE HOST'), findsOneWidget);
  });

  testWidgets('large text keeps the strip on one scrolling row', (
    tester,
  ) async {
    await _pump(tester, _section(count: 6), textScale: 2);
    expect(tester.takeException(), isNull);
    expect(find.text('PHOTOS FROM SATURDAY SUPPER CLUB'), findsOneWidget);
  });

  testWidgets('the viewer starts on the tapped photo, swipes and closes', (
    tester,
  ) async {
    await _pump(
      tester,
      Builder(
        builder: (context) => CatchRoot(
          child: CatchScreen(
            body: CatchButton(
              label: 'Open',
              onPressed: () => EventHostPhotoViewerScreen.open(
                context,
                photos: [_photo(0), _photo(1), _photo(2)],
                initialIndex: 1,
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await pumpFeatureUi(tester);

    expect(find.text('2 of 3'), findsOneWidget);
    expect(find.text('Download'), findsNothing);

    await tester.fling(
      find.byKey(const ValueKey('after-event-photo-viewer')),
      const Offset(-400, 0),
      1000,
    );
    await pumpFeatureUi(tester);
    expect(find.text('3 of 3'), findsOneWidget);

    await tester.tap(find.byTooltip('Close photos'));
    await pumpFeatureUi(tester);
    expect(
      find.byKey(const ValueKey('after-event-photo-viewer')),
      findsNothing,
    );
  });
}
