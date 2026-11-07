import 'package:catch_dating_app/hosts/organizer/page_edit_body.dart';
import 'package:catch_dating_app/hosts/organizer/page_edit_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_platform/media/uploaded_photo.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'organizer_fixtures.dart';

void main() {
  group('PageEditDraft', () {
    test('starts from the organizer and sends nothing unchanged', () {
      final organizer = lanternLane();
      final draft = PageEditDraft.of(organizer);

      expect(draft.name, 'Lantern Lane Social');
      expect(draft.area, 'Bandra West');
      expect(draft.formats, {CatchFormat.games, CatchFormat.dinner});
      expect(draft.patchFor(organizer, isOwner: true).isEmpty, isTrue);
    });

    test('sends only what changed, trimmed, and clears an emptied link', () {
      final organizer = lanternLane();
      final patch = PageEditDraft.of(organizer)
          .copyWith(name: ' Lantern Lane ', instagram: '', area: 'Bandra West')
          .patchFor(organizer, isOwner: true)
          .toFieldsJson();

      expect(patch, {'name': 'Lantern Lane', 'instagramHandle': null});
    });

    test('the listing switch is sent only for the owner', () {
      final organizer = lanternLane();
      final draft = PageEditDraft.of(organizer).copyWith(listed: true);

      expect(draft.patchFor(organizer, isOwner: true).toFieldsJson(), {
        'publicListingEnabled': true,
      });
      expect(draft.patchFor(organizer, isOwner: false).isEmpty, isTrue);
    });

    test('kinds of night keep picked activities, add new ones and move '
        'the main one', () {
      final organizer = lanternLane();
      final draft = PageEditDraft.of(
        organizer,
      ).toggle(CatchFormat.games).toggle(CatchFormat.run);

      final defaults = pageEditDefaults(organizer, draft.formats);
      expect(defaults.primaryActivityKind, ActivityKind.dinner);
      expect(defaults.supportedActivityKinds, [ActivityKind.socialRun]);
      expect(
        draft.patchFor(organizer, isOwner: true).keys,
        contains('hostDefaults'),
      );
    });

    test('the last kind of night cannot be dropped', () {
      final organizer = lanternLane();
      final one = PageEditDraft.of(
        organizer,
      ).toggle(CatchFormat.games).toggle(CatchFormat.dinner);

      expect(one.formats, {CatchFormat.dinner});
    });

    test('a blank name is not valid', () {
      expect(
        PageEditDraft.of(lanternLane()).copyWith(name: '  ').valid,
        isFalse,
      );
    });
  });

  group('PageEditBody', () {
    Future<List<Object>> pump(WidgetTester tester, PageEditState state) async {
      final calls = <Object>[];
      await pumpOrganizerBody(
        tester,
        PageEditBody(
          state: state,
          onField: (field, value) => calls.add((field, value)),
          onFormat: calls.add,
          onListed: calls.add,
          onChangeLogo: () => calls.add('logo'),
          onAddPhotos: () => calls.add('photos'),
          onRemovePhoto: calls.add,
        ),
      );
      return calls;
    }

    testWidgets('shows the logo, photos, fields, kinds of night and links', (
      tester,
    ) async {
      final organizer = lanternLane(
        photos: [
          UploadedPhoto.fromUpload(
            url: '',
            storagePath: 'organizers/lantern/one.jpg',
            position: 0,
          ),
        ],
      );
      final calls = await pump(
        tester,
        PageEditState(
          organizer: organizer,
          draft: PageEditDraft.of(organizer),
          revision: 1,
          isOwner: true,
        ),
      );

      expect(find.text('Change logo'), findsOneWidget);
      expect(find.text('Photos'), findsOneWidget);
      expect(find.text('Where you run things'), findsOneWidget);
      expect(find.text('Quizzes'), findsOneWidget);
      expect(find.text('Parties'), findsOneWidget);
      expect(find.text('Links'), findsOneWidget);
      expect(
        find.text('Show your page in Catch and on the web'),
        findsOneWidget,
      );

      await tester.tap(find.text('Change logo'));
      await tester.tap(find.byKey(const ValueKey('page-edit-add-photo')));
      await tester.tap(find.byKey(const ValueKey('page-edit-photo-0')));
      await tester.tap(find.text('Social runs'));
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('page-edit-name-lantern-lane-1')),
          matching: find.byType(EditableText),
        ),
        'Lantern Lane',
      );
      expect(calls, [
        'logo',
        'photos',
        0,
        CatchFormat.run,
        (PageEditField.name, 'Lantern Lane'),
      ]);
    });

    testWidgets('a host who is not the owner has no listing switch', (
      tester,
    ) async {
      final organizer = lanternLane();
      await pump(
        tester,
        PageEditState(
          organizer: organizer,
          draft: PageEditDraft.of(organizer),
          revision: 1,
        ),
      );

      expect(find.text('On your page'), findsNothing);
    });
  });
}
