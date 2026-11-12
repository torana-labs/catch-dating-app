import 'package:catch_dating_app/contexts/events/domain/event_host_photos.dart';
import 'package:catch_dating_app/hosts/insights/host_event_photos_section.dart';
import 'package:catch_dating_app/hosts/insights/host_event_photos_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

EventHostPhoto _photo(String id) => EventHostPhoto(
  photoId: id,
  thumbnailUrl: '',
  displayUrl: '',
  width: 1200,
  height: 1600,
  uploadedByUid: 'host-1',
  createdAt: DateTime(2026, 11, 12),
);

HostEventPhotosState _state({
  List<EventHostPhoto> photos = const [],
  List<HostEventPhotoUpload> uploads = const [],
  int maxPhotos = 100,
}) => HostEventPhotosState(
  album: EventHostPhotoAlbum(
    eventId: 'event-1',
    organizerName: 'Saturday Supper Club',
    access: EventHostPhotoAccess.host,
    maxPhotos: maxPhotos,
    photos: photos,
    urlsExpireAt: DateTime(2026, 11, 12, 1),
  ),
  uploads: uploads,
);

class _Calls {
  int add = 0;
  final removed = <String>[];
  final retried = <String>[];
  final dismissed = <String>[];
}

Future<_Calls> _pump(
  WidgetTester tester,
  HostEventPhotosState? state, {
  double textScale = 1,
}) async {
  tester.view.physicalSize = const Size(390, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final calls = _Calls();
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
      home: CatchRoot(
        child: CatchScreen(
          body: CatchPageBody(
            child: HostEventPhotosSection(
              state: state,
              onAdd: () => calls.add++,
              onRemove: (photo) => calls.removed.add(photo.photoId),
              onRetry: calls.retried.add,
              onDismiss: calls.dismissed.add,
            ),
          ),
        ),
      ),
    ),
  );
  await tester.pump();
  return calls;
}

void main() {
  testWidgets('before any photo the section invites the host to add some', (
    tester,
  ) async {
    final calls = await _pump(tester, _state());

    expect(find.text('Photos for your guests'), findsOneWidget);
    expect(
      find.text(
        'Share a few moments from the night. Only guests who checked in see '
        'them.',
      ),
      findsOneWidget,
    );
    await tester.tap(find.text('Add photos'));
    expect(calls.add, 1);
  });

  testWidgets('shared photos sit in a rail and a tap asks to remove one', (
    tester,
  ) async {
    final calls = await _pump(
      tester,
      _state(photos: [_photo('one'), _photo('two')]),
    );

    expect(
      find.byKey(const ValueKey('host-event-photos-rail')),
      findsOneWidget,
    );
    expect(
      find.bySemanticsLabel('Photo 2 of 2. Double-tap to remove.'),
      findsOneWidget,
    );
    expect(
      find.text(
        'Only guests who checked in see these. Location data is removed from '
        'every photo.',
      ),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey('host-event-photo-two')));
    expect(calls.removed, ['two']);
  });

  testWidgets('uploads show progress; a failed one offers retry and dismiss', (
    tester,
  ) async {
    final calls = await _pump(
      tester,
      _state(
        uploads: [
          const HostEventPhotoUpload(
            photoId: 'up-1',
            stage: HostEventPhotoUploadStage.uploading,
            progress: 0.4,
          ),
          const HostEventPhotoUpload(
            photoId: 'up-2',
            stage: HostEventPhotoUploadStage.sharing,
            progress: 1,
          ),
          const HostEventPhotoUpload(
            photoId: 'up-3',
            stage: HostEventPhotoUploadStage.failed,
          ),
        ],
      ),
    );

    expect(find.text('Uploading 40%'), findsOneWidget);
    expect(find.text('Removing location data'), findsOneWidget);
    expect(find.text('Didn’t upload'), findsOneWidget);
    await tester.tap(find.text('Try again'));
    expect(calls.retried, ['up-3']);
    await tester.tap(
      find.byKey(const ValueKey('host-event-photo-upload-up-3')),
    );
    expect(calls.dismissed, ['up-3']);
  });

  testWidgets('a full event shows its count instead of the add action', (
    tester,
  ) async {
    await _pump(tester, _state(photos: [_photo('one')], maxPhotos: 1));

    expect(find.text('Add photos'), findsNothing);
    expect(find.text('1 of 1'), findsOneWidget);
    expect(
      find.text('You’ve shared the most photos an event can have.'),
      findsOneWidget,
    );
  });

  testWidgets('loading and large text render without overflow', (tester) async {
    await _pump(tester, null);
    expect(find.text('Photos for your guests'), findsOneWidget);
    await _pump(
      tester,
      _state(
        photos: [_photo('one')],
        uploads: [
          const HostEventPhotoUpload(
            photoId: 'up-1',
            stage: HostEventPhotoUploadStage.failed,
          ),
        ],
      ),
      textScale: 2,
    );
    expect(tester.takeException(), isNull);
  });
}
