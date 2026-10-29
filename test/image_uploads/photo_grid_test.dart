import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_photo_policy.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_grid.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_grid_keys.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  ProfilePhoto photo(int position) => ProfilePhoto.uploaded(
    position: position,
    url: 'https://img.example/$position.jpg',
    storagePath: 'users/runner-1/photos/${position}_test.jpg',
    now: DateTime(2026, 5, 17),
  );

  testWidgets('only active, non-loading photo slots are tappable', (
    tester,
  ) async {
    final tappedSlots = <int>[];

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: PhotoGrid(
            profilePhotos: const [],
            loadingIndices: const {0},
            onSlotTapped: tappedSlots.add,
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(PhotoGridKeys.slot(0)));
    await tester.tap(find.byKey(PhotoGridKeys.slot(1)));
    await tester.pump();

    expect(tappedSlots, isEmpty);
    expect(find.bySemanticsLabel('Photo 1 uploading'), findsOneWidget);
    expect(find.text('PHOTO 01'), findsOneWidget);
    expect(find.bySemanticsLabel('Photo slot 2 unavailable'), findsOneWidget);
  });

  testWidgets('the next empty photo slot adds a photo', (tester) async {
    final tappedSlots = <int>[];

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: PhotoGrid(
            profilePhotos: const [],
            onSlotTapped: tappedSlots.add,
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(PhotoGridKeys.slot(0)));
    await tester.pump();

    expect(tappedSlots, [0]);
    expect(find.bySemanticsLabel('Add photo 1'), findsOneWidget);
  });

  testWidgets('filled slots expose delete affordances when enabled', (
    tester,
  ) async {
    final deletedSlots = <int>[];

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: PhotoGrid(
            profilePhotos: [photo(0), photo(1)],
            onSlotTapped: (_) {},
            onDeletePhoto: deletedSlots.add,
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(PhotoGridKeys.delete(1)));
    await tester.pump();

    expect(deletedSlots, [1]);
    expect(find.bySemanticsLabel('Edit photo 1'), findsOneWidget);
    expect(find.byType(CatchGradedImage), findsNWidgets(2));
    expect(find.text('MAIN'), findsOneWidget);
  });

  testWidgets('main label can be hidden for embedded photo grids', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: PhotoGrid(
            profilePhotos: [photo(0)],
            onSlotTapped: (_) {},
            mainLabel: '',
          ),
        ),
      ),
    );

    expect(find.byType(CatchGradedImage), findsOneWidget);
    expect(find.text('MAIN'), findsNothing);
  });

  testWidgets('embedded grid ignores ambient bottom safe-area padding', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: MediaQuery(
          data: const MediaQueryData(
            size: Size(390, 844),
            padding: EdgeInsets.only(bottom: 34),
          ),
          child: Scaffold(
            body: Align(
              alignment: Alignment.topLeft,
              child: SizedBox(
                width: 350,
                child: PhotoGrid(profilePhotos: const [], onSlotTapped: (_) {}),
              ),
            ),
          ),
        ),
      ),
    );

    final gridBottom = tester.getBottomLeft(find.byType(PhotoGrid)).dy;
    final finalSlotBottom = tester
        .getBottomLeft(
          find.byKey(PhotoGridKeys.slot(maximumProfilePhotoCount - 1)),
        )
        .dy;

    expect(gridBottom, closeTo(finalSlotBottom, 0.01));
  });
}
