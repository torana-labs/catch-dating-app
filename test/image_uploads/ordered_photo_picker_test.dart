import 'dart:convert';
import 'dart:typed_data';

import 'package:catch_dating_app/platform/media/ordered_photo_picker.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  testWidgets('empty picker exposes the add photo action', (tester) async {
    var addCount = 0;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: OrderedPhotoPicker(
            label: const Text('Event photos'),
            photos: const [],
            onAddPhotos: () => addCount++,
            onRemovePhoto: null,
            onReorderPhoto: null,
            emptyActionLabel: 'Add event photos',
            addActionLabel: 'Add photos',
          ),
        ),
      ),
    );

    expect(find.bySemanticsLabel('Add event photos'), findsOneWidget);

    await tester.tap(
      find.byKey(OrderedPhotoPickerKeys.addAction('Add event photos')),
    );
    await tester.pump();

    expect(addCount, 1);
  });

  testWidgets('filled picker manages and removes photos in the full editor', (
    tester,
  ) async {
    final removed = <int>[];

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: OrderedPhotoPicker(
            label: const Text('Club photos'),
            photos: [
              OrderedPhotoPreview(id: 'one', bytes: _pngBytes()),
              OrderedPhotoPreview(id: 'two', bytes: _pngBytes()),
            ],
            onAddPhotos: () {},
            onRemovePhoto: removed.add,
            onReorderPhoto: null,
            emptyActionLabel: 'Add club photos',
            addActionLabel: 'Add photos',
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.bySemanticsLabel('Photo 1'), findsOneWidget);
    expect(find.text('Manage all 2 photos'), findsOneWidget);

    await tester.tap(find.byKey(OrderedPhotoPickerKeys.manageAction));
    await pumpFeatureUi(tester);
    expect(find.byKey(OrderedPhotoPickerKeys.managerScreen), findsOneWidget);

    await tester.tap(find.byKey(OrderedPhotoPickerKeys.setCoverAction(1)));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Remove photo'));
    await pumpFeatureUi(tester);

    expect(removed, [1]);
  });

  testWidgets('host gallery has no default photo cap', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SingleChildScrollView(
            child: OrderedPhotoPicker(
              photos: [
                for (var index = 0; index < 24; index++)
                  OrderedPhotoPreview(id: 'photo-$index', bytes: _pngBytes()),
              ],
              onAddPhotos: () {},
              onRemovePhoto: (_) {},
              onReorderPhoto: (_, _) {},
              emptyActionLabel: 'Add photos',
              addActionLabel: 'Add photos',
            ),
          ),
        ),
      ),
    );

    expect(find.text('Manage all 24 photos'), findsOneWidget);
    expect(
      find.byKey(OrderedPhotoPickerKeys.addAction('Add photos')),
      findsOneWidget,
    );
  });

  testWidgets('photo manager exposes inline retry for failed uploads', (
    tester,
  ) async {
    final retried = <int>[];

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: OrderedPhotoManagerScreen(
          photos: [
            OrderedPhotoPreview(
              id: 'failed-photo',
              bytes: _pngBytes(),
              status: OrderedPhotoStatus.failed,
            ),
          ],
          onAddPhotos: () {},
          onRemovePhoto: (_) {},
          onReorderPhoto: (_, _) {},
          onRetryPhoto: retried.add,
          canAdd: true,
        ),
      ),
    );
    await tester.pump();

    final retry = find.byKey(OrderedPhotoPickerKeys.managerRetryAction(0));
    expect(retry, findsOneWidget);
    await tester.tap(retry);
    await tester.pump();

    expect(retried, [0]);
    expect(find.text('Uploading…'), findsWidgets);
  });

  testWidgets('photo manager adds photos in place without closing', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: OrderedPhotoManagerScreen(
          photos: [OrderedPhotoPreview(id: 'one', bytes: _pngBytes())],
          onAddPhotos: null,
          onAddPhotosInManager: () async => [
            OrderedPhotoPreview(id: 'two', bytes: _pngBytes()),
          ],
          onRemovePhoto: (_) {},
          onReorderPhoto: (_, _) {},
          onRetryPhoto: null,
          canAdd: true,
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(OrderedPhotoTile), findsOneWidget);
    await tester.tap(find.text('Add photos'));
    await tester.pump();

    expect(find.byKey(OrderedPhotoPickerKeys.managerScreen), findsOneWidget);
    expect(find.byType(OrderedPhotoTile), findsNWidgets(2));
    expect(find.text('2 photos'), findsOneWidget);
  });

  testWidgets('photo manager avoids duplicate cover and unavailable menus', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: OrderedPhotoManagerScreen(
          photos: [OrderedPhotoPreview(id: 'one', bytes: _pngBytes())],
          onAddPhotos: null,
          onRemovePhoto: null,
          onReorderPhoto: null,
          onRetryPhoto: null,
          canAdd: false,
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(OrderedPhotoTile), findsOneWidget);
    expect(find.text('Cover photo'), findsNothing);
    expect(find.byKey(OrderedPhotoPickerKeys.setCoverAction(0)), findsNothing);
  });

  testWidgets('picker supports section-owned labels without a spacer', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: OrderedPhotoPicker(
            photos: [],
            onAddPhotos: null,
            onRemovePhoto: null,
            onReorderPhoto: null,
            emptyActionLabel: 'Add photos',
            addActionLabel: 'Add more',
          ),
        ),
      ),
    );

    final pickerColumn = tester.widget<Column>(
      find
          .descendant(
            of: find.byType(OrderedPhotoPicker),
            matching: find.byType(Column),
          )
          .first,
    );
    expect(pickerColumn.children.first, isA<AspectRatio>());
  });
}

Uint8List _pngBytes() {
  return base64Decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUl'
    'EQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==',
  );
}
