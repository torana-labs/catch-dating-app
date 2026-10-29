import 'dart:convert';
import 'dart:typed_data';

import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/create_club_photos_picker.dart';
import 'package:catch_dating_app/platform/media/ordered_photo_picker.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('standard club photos picker exposes the empty add tile', (
    tester,
  ) async {
    var addCount = 0;

    await _pumpPhotosWidget(
      tester,
      CreateClubPhotosPicker(
        photos: const [],
        onAddPhotos: () => addCount++,
        onRemovePhoto: null,
        onReorderPhoto: null,
      ),
    );

    expect(find.text('Gallery & cover'), findsOneWidget);
    expect(
      find.text('Add as many as you need. The first photo is the cover.'),
      findsOneWidget,
    );
    expect(find.bySemanticsLabel('Add organizer photos'), findsOneWidget);

    await tester.tap(
      find.byKey(OrderedPhotoPickerKeys.addAction('Add organizer photos')),
    );
    await tester.pump();

    expect(addCount, 1);
  });

  testWidgets('edit strip keeps cover affordance and add tile', (tester) async {
    var addCount = 0;

    await _pumpPhotosWidget(
      tester,
      CreateClubPhotosPicker(
        photos: [_photo('one'), _photo('two')],
        onAddPhotos: () => addCount++,
        onRemovePhoto: (_) {},
        onReorderPhoto: (_, _) {},
        variant: CreateClubPhotosPickerVariant.editStrip,
      ),
    );

    expect(find.text('COVER'), findsOneWidget);
    expect(find.text('PHOTOS'), findsNothing);
    expect(find.bySemanticsLabel('Photo 1'), findsOneWidget);
    expect(find.text('Manage all 2 photos'), findsOneWidget);
    expect(
      find.byKey(OrderedPhotoPickerKeys.addAction('Add photos')),
      findsOneWidget,
    );
    expect(
      find.text('Add as many as you need. The first photo is the cover.'),
      findsOneWidget,
    );

    await tester.tap(
      find.byKey(OrderedPhotoPickerKeys.addAction('Add photos')),
    );
    await tester.pump();

    expect(addCount, 1);
  });

  testWidgets('edit logo empty state exposes one labelled add action', (
    tester,
  ) async {
    var tapCount = 0;

    await _pumpPhotosWidget(
      tester,
      CreateClubProfileImagePicker(
        imageBytes: null,
        onTap: () => tapCount++,
        variant: CreateClubProfileImagePickerVariant.editLogo,
      ),
    );

    expect(find.text('CLUB LOGO'), findsNothing);
    expect(find.text('Add logo'), findsOneWidget);
    expect(find.bySemanticsLabel('Add logo'), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(ClubProfileImageTile),
        matching: find.byType(GestureDetector),
      ),
      findsNothing,
    );

    await tester.tap(find.text('Add logo'));
    await tester.pump();

    expect(tapCount, 1);

    await tester.tap(find.byType(ClubProfileImageTile));
    await tester.pump();

    expect(tapCount, 1);
  });

  testWidgets('edit logo preview stays separate from replace and remove', (
    tester,
  ) async {
    var replaceCount = 0;
    var removeCount = 0;

    await _pumpPhotosWidget(
      tester,
      CreateClubProfileImagePicker(
        imageBytes: _pngBytes(),
        onTap: () => replaceCount++,
        onRemove: () => removeCount++,
        variant: CreateClubProfileImagePickerVariant.editLogo,
      ),
    );

    expect(find.bySemanticsLabel('Organizer logo'), findsOneWidget);
    expect(find.text('Replace'), findsOneWidget);
    expect(find.text('Remove'), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(ClubProfileImageTile),
        matching: find.byType(GestureDetector),
      ),
      findsNothing,
    );

    await tester.tap(find.byType(ClubProfileImageTile));
    await tester.pump();
    expect(replaceCount, 0);

    await tester.tap(find.text('Replace'));
    await tester.pump();
    expect(replaceCount, 1);

    await tester.tap(find.text('Remove'));
    await tester.pump();
    expect(removeCount, 1);
  });
}

Future<void> _pumpPhotosWidget(WidgetTester tester, Widget child) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(
        body: Padding(padding: const EdgeInsets.all(24), child: child),
      ),
    ),
  );
  await tester.pump();
}

OrderedPhotoPreview _photo(String id) =>
    OrderedPhotoPreview(id: id, bytes: _pngBytes());

Uint8List _pngBytes() {
  return base64Decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUl'
    'EQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==',
  );
}
