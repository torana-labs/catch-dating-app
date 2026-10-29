import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/chats/presentation/event_profile_controller.dart';
import 'package:catch_dating_app/chats/presentation/event_profile_screen.dart';
import 'package:catch_dating_app/chats/presentation/widgets/event_chat_message_tile.dart';
import 'package:catch_dating_app/chats/presentation/widgets/event_profile_answer_field.dart';
import 'package:catch_dating_app/chats/presentation/widgets/event_profile_editor_section.dart';
import 'package:catch_dating_app/chats/presentation/widgets/event_profile_identity_section.dart';
import 'package:catch_dating_app/chats/presentation/widgets/event_profile_photo_field.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_profile.dart';
import 'package:catch_dating_app/contexts/profiles/data/form_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/form_profile_photo_preview.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_chat_profile_test.dart';
import 'event_chat_widget_test.dart' show fixture;
import 'event_profile_controller_test.dart'
    show CardsRepository, ProfileRepository, miniProfile;

final pixel = File('test/goldens/fixtures/portrait.jpg').readAsBytesSync();
const captureKey = ValueKey('event-profile-capture');
EventProfileEditorState editorState({
  bool shared = false,
  bool canShare = true,
  bool busy = false,
  bool card = true,
  int revision = 1,
}) => EventProfileEditorState(
  uid: 'person',
  settings: settingsFixture(
    selection: shared ? selectionFixture() : null,
    canShare: canShare,
    revision: revision,
  ),
  cards: const [],
  nextCursor: null,
  card: card ? cardFixture() : null,
  busy: busy,
);
EventParticipantProfile participant({
  bool photoOnly = false,
  bool withPhoto = false,
}) => EventParticipantProfile(
  eventId: 'event',
  participantUid: 'sara',
  displayName: 'Sara',
  coreFields: photoOnly
      ? []
      : [
          EventProfileField(id: 'age', value: 32),
          EventProfileField(id: 'occupation', value: 'Founder'),
        ],
  cardFields: photoOnly
      ? []
      : [EventProfileField(id: 'Favourite drink', value: 'Tequila cocktails')],
  photo: photoOnly || withPhoto
      ? FormProfilePhotoPreview(bytes: pixel, width: 160, height: 200)
      : null,
);

void main() {
  setUpAll(loadCatchTestFonts);
  testWidgets(
    'long answers remain fully readable before sharing at large text',
    (tester) async {
      final answer = List.filled(50, 'An applicant supplied answer.').join(' ');
      final label = List.filled(10, 'A long question').join(' ');
      await pumpProfile(
        tester,
        EventProfileAnswerField.share(
          label: label,
          answer: answer,
          selected: false,
          onChanged: (_) {},
        ),
        scale: 2,
      );
      expect(tester.widget<Text>(find.text(answer)).maxLines, isNull);
      expect(tester.widget<Text>(find.text(label)).maxLines, isNull);
      final toggle = find.byType(CatchToggleInput);
      await tester.ensureVisible(toggle);
      expect(tester.getSize(toggle).height, greaterThanOrEqualTo(44));
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('sender name opens the selected participant profile', (
    tester,
  ) async {
    var opened = false;
    await pumpProfile(
      tester,
      EventChatMessageTile(
        message: fixture().messages.first,
        isMe: false,
        enabled: true,
        onReply: () {},
        onReact: () {},
        onReaction: (_) {},
        onViewProfile: () => opened = true,
      ),
    );
    final sender = find.byTooltip('View event profile');
    expect(tester.getSize(sender).height, greaterThanOrEqualTo(44));
    await tester.tap(sender);
    await pumpFeatureUi(tester);
    expect(opened, true);
  });
  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets('editor and participant readable $dark $scale', (
        tester,
      ) async {
        await pumpProfile(
          tester,
          editor(editorState()),
          dark: dark,
          scale: scale,
        );
        expect(tester.takeException(), isNull);
        if (scale == 2) {
          for (final (key, label, hint) in [
            (
              const ValueKey('event-profile-first-name'),
              'first name for this event',
              'First name',
            ),
            (
              const ValueKey('event-profile-introduction'),
              'introduction for this event',
              'About you',
            ),
          ]) {
            expect(
              tester.widget<CatchField>(find.byKey(key)).title?.toLowerCase(),
              label,
              reason: 'The full event-specific label must remain configured',
            );
            final paragraphs = tester
                .renderObjectList<RenderParagraph>(
                  find.descendant(
                    of: find.byKey(key),
                    matching: find.byType(RichText),
                  ),
                )
                .toList();
            final hints = paragraphs.where(
              (paragraph) => paragraph.text.toPlainText().startsWith(hint),
            );
            expect(hints, isNotEmpty, reason: hint);
            expect(
              hints.every((paragraph) => !paragraph.didExceedMaxLines),
              isTrue,
              reason: '$hint action must remain readable at 2× text',
            );
          }
        }
        await capture(tester, 'editor-${dark ? 'dark' : 'light'}-$scale');
        final save = find.widgetWithText(
          CatchButton,
          'Preview what event members can see',
        );
        await tester.ensureVisible(save);
        await pumpFeatureUi(tester);
        expect(tester.getSize(save).height, greaterThanOrEqualTo(44));
        await capture(
          tester,
          'editor-choices-${dark ? 'dark' : 'light'}-$scale',
        );
        await pumpProfile(
          tester,
          EventProfileIdentitySection(profile: participant(withPhoto: true)),
          dark: dark,
          scale: scale,
        );
        expect(tester.takeException(), isNull);
        expect(find.text('Sara'), findsOneWidget);
        expect(find.text('Tequila cocktails'), findsOneWidget);
        final image = tester.widget<Image>(
          find.descendant(
            of: find.byType(EventProfileIdentitySection),
            matching: find.byType(Image),
          ),
        );
        await tester.runAsync(() async {
          await precacheImage(
            image.image,
            tester.element(find.byType(EventProfileIdentitySection)),
          );
        });
        await pumpFeatureUi(tester);
        expect(
          tester
              .widget<RawImage>(
                find.descendant(
                  of: find.byType(EventProfileIdentitySection),
                  matching: find.byType(RawImage),
                ),
              )
              .image,
          isNotNull,
        );
        await capture(tester, 'participant-${dark ? 'dark' : 'light'}-$scale');
      });
    }
  }
  testWidgets(
    'all choices start off; explicit save contains only checked answers',
    (tester) async {
      final saved = <EventProfileSelection?>[];
      await pumpProfile(tester, editor(editorState(), onSave: saved.add));
      expect(
        tester
            .widgetList<CatchToggleInput>(find.byType(CatchToggleInput))
            .every((s) => !s.value),
        true,
      );
      final age = toggle('Age');
      await tester.ensureVisible(age);
      await tester.tap(age);
      await pumpFeatureUi(tester);
      final save = find.widgetWithText(
        CatchButton,
        'Preview what event members can see',
      );
      await tester.ensureVisible(save);
      await tester.tap(save);
      expect(saved.single!.coreFieldIds, {'age'});
      expect(saved.single!.photoId, isNull);
      expect(saved.single!.card, isNull);
    },
  );
  testWidgets(
    'card pagination preserves unsaved core choices and never selects new answers',
    (tester) async {
      final saved = <EventProfileSelection?>[];
      await pumpProfile(
        tester,
        editor(editorState(card: false), onSave: saved.add),
      );
      final age = toggle('Age');
      await tester.ensureVisible(age);
      await tester.tap(age);
      await pumpFeatureUi(tester);
      await pumpProfile(
        tester,
        editor(editorState(card: false, busy: true), onSave: saved.add),
      );
      expect(tester.widget<CatchToggleInput>(toggle('Age')).onChanged, isNull);
      await pumpProfile(tester, editor(editorState(), onSave: saved.add));
      expect(tester.widget<CatchToggleInput>(toggle('Age')).value, true);
      expect(tester.widget<CatchToggleInput>(toggle('drink')).value, false);
      final save = find.widgetWithText(
        CatchButton,
        'Preview what event members can see',
      );
      await tester.ensureVisible(save);
      await tester.tap(save);
      expect(saved.single!.coreFieldIds, {'age'});
      expect(saved.single!.card, isNull);
    },
  );
  testWidgets('new server revision discards stale local choices', (
    tester,
  ) async {
    await pumpProfile(tester, editor(editorState()));
    final age = toggle('Age');
    await tester.ensureVisible(age);
    await tester.tap(age);
    await pumpFeatureUi(tester);
    await pumpProfile(tester, editor(editorState(revision: 2)));
    expect(
      tester
          .widgetList<CatchToggleInput>(find.byType(CatchToggleInput))
          .every((s) => !s.value),
      true,
    );
  });
  testWidgets('revocation stays available after admission ends', (
    tester,
  ) async {
    final saved = <EventProfileSelection?>[];
    await pumpProfile(
      tester,
      editor(editorState(shared: true, canShare: false), onSave: saved.add),
    );
    expect(find.byType(CatchToggleInput), findsNothing);
    expect(find.text('Save sharing choices'), findsNothing);
    final stop = find.widgetWithText(CatchButton, 'Stop sharing extra details');
    await tester.ensureVisible(stop);
    await tester.tap(stop);
    expect(saved, [null]);
    await capture(tester, 'revoke-after-admission');
  });
  testWidgets('personalization is editable only when sharing is eligible', (
    tester,
  ) async {
    final saved = <EventProfileSelection?>[];
    await pumpProfile(tester, editor(editorState(), onSave: saved.add));
    final firstName = find.byKey(const ValueKey('event-profile-first-name'));
    final introduction = find.byKey(const ValueKey('event-profile-introduction'));
    expect(firstName, findsOneWidget);
    expect(introduction, findsOneWidget);
    await tester.enterText(
      find.descendant(of: firstName, matching: find.byType(TextField)),
      'Mira',
    );
    await tester.enterText(
      find.descendant(of: introduction, matching: find.byType(TextField)),
      'Happy to meet everyone',
    );
    final preview = find.widgetWithText(
      CatchButton,
      'Preview what event members can see',
    );
    await tester.ensureVisible(preview);
    await tester.tap(preview);
    expect(saved.single?.firstName, 'Mira');
    expect(saved.single?.introduction, 'Happy to meet everyone');

    await pumpProfile(tester, editor(editorState(canShare: false)));
    expect(firstName, findsNothing);
    expect(introduction, findsNothing);
  });
  testWidgets('owned preview confirmation saves the reviewed selection', (
    tester,
  ) async {
    final repo = ProfileRepository()
      ..readPreview = (_) async =>
          settingsFixture(preview: miniProfile(name: 'Mira'));
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((_) => Stream.value('person')),
          eventChatRepositoryProvider.overrideWithValue(repo),
          formProfileRepositoryProvider.overrideWithValue(CardsRepository()),
          watchUserProfileProvider.overrideWith((_) => Stream.value(null)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const EventProfileScreen(eventId: 'event'),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    final age = toggle('Age');
    await tester.ensureVisible(age);
    await tester.tap(age);
    await pumpFeatureUi(tester);
    final preview = find.widgetWithText(
      CatchButton,
      'Preview what event members can see',
    );
    await tester.ensureVisible(preview);
    await tester.tap(preview);
    await pumpUntilFound(tester, find.byType(EventProfileIdentitySection));
    expect(find.byType(EventProfileIdentitySection), findsOneWidget);
    expect(repo.writes, isEmpty);
    await tester.tap(find.widgetWithText(CatchButton, 'Save sharing choices'));
    await pumpFeatureUi(tester);
    expect(repo.writes, hasLength(1));
    expect(repo.writes.single.uid, 'person');
    expect(repo.writes.single.revision, 1);
    expect(tester.takeException(), isNull);
  });
  testWidgets('account change hides an open preview and cannot save it', (
    tester,
  ) async {
    final accounts = StreamController<String?>()..add('person');
    addTearDown(accounts.close);
    final repo = ProfileRepository()
      ..readPreview = (_) async =>
          settingsFixture(preview: miniProfile(name: 'Mira'));
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((_) => accounts.stream),
          eventChatRepositoryProvider.overrideWithValue(repo),
          formProfileRepositoryProvider.overrideWithValue(CardsRepository()),
          watchUserProfileProvider.overrideWith((_) => Stream.value(null)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const EventProfileScreen(eventId: 'event'),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    final age = toggle('Age');
    await tester.ensureVisible(age);
    await tester.tap(age);
    await pumpFeatureUi(tester);
    final preview = find.widgetWithText(
      CatchButton,
      'Preview what event members can see',
    );
    await tester.ensureVisible(preview);
    await tester.tap(preview);
    await pumpUntilFound(tester, find.text('Mira'));
    expect(find.text('Mira'), findsOneWidget);
    accounts.add('another-person');
    await pumpFeatureUi(tester);
    expect(find.text('Mira'), findsNothing);
    expect(repo.writes, isEmpty);
  });
  testWidgets('backgrounding hides an open preview and cannot restore it', (
    tester,
  ) async {
    final repo = ProfileRepository()
      ..readPreview = (_) async => settingsFixture(
        preview: miniProfile(name: 'Mira'),
      );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((_) => Stream.value('person')),
          eventChatRepositoryProvider.overrideWithValue(repo),
          formProfileRepositoryProvider.overrideWithValue(CardsRepository()),
          watchUserProfileProvider.overrideWith((_) => Stream.value(null)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const EventProfileScreen(eventId: 'event'),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    final age = toggle('Age');
    await tester.ensureVisible(age);
    await tester.tap(age);
    await pumpFeatureUi(tester);
    final preview = find.widgetWithText(
      CatchButton,
      'Preview what event members can see',
    );
    await tester.ensureVisible(preview);
    await tester.tap(preview);
    await pumpUntilFound(tester, find.text('Mira'));
    expect(find.text('Mira'), findsOneWidget);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    await pumpFeatureUi(tester);
    expect(find.text('Mira'), findsNothing);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await pumpFeatureUi(tester);
    expect(find.text('Mira'), findsNothing);
    expect(repo.writes, isEmpty);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    await pumpFeatureUi(tester);
  });
  testWidgets(
    'photo selection waits for a decoded preview and resets on replacement',
    (tester) async {
      final image = MemoryImage(pixel);
      await pumpProfile(
        tester,
        EventProfilePhotoField(
          image: image,
          label: 'Photo 1',
          selected: false,
          onChanged: (_) {},
        ),
      );
      await tester.runAsync(() async {
        await precacheImage(
          image,
          tester.element(find.byType(EventProfilePhotoField)),
        );
      });
      await pumpFeatureUi(tester);
      expect(
        tester
            .widget<CatchToggleInput>(find.byType(CatchToggleInput))
            .onChanged,
        isNotNull,
      );
      await capture(tester, 'photo-selection');
      await pumpProfile(
        tester,
        EventProfilePhotoField(
          image: MemoryImage(pixel.sublist(0, 4)),
          label: 'Photo 2',
          selected: false,
          onChanged: (_) {},
        ),
      );
      expect(
        tester
            .widget<CatchToggleInput>(find.byType(CatchToggleInput))
            .onChanged,
        isNull,
      );
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('photo-only sharing does not claim only the name is shared', (
    tester,
  ) async {
    await pumpProfile(
      tester,
      EventProfileIdentitySection(profile: participant(photoOnly: true)),
    );
    expect(find.byType(CatchEmptyState), findsNothing);
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'real participant screen hides details in background and rechecks on resume',
    (tester) async {
      final repo = ProfileRepository()
        ..readProfile = (_) async => participant();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((_) => Stream.value('person')),
            eventChatRepositoryProvider.overrideWithValue(repo),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: const EventProfileScreen(
              eventId: 'event',
              participantUid: 'sara',
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Tequila cocktails'), findsOneWidget);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      await pumpFeatureUi(tester);
      expect(find.text('Tequila cocktails'), findsNothing);
      repo.readProfile = (_) async => throw StateError('sharing revoked');
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await pumpFeatureUi(tester);
      expect(find.text('Tequila cocktails'), findsNothing);
      await tester.pumpWidget(const SizedBox());
      await pumpFeatureUi(tester);
    },
  );
}

Finder toggle(String label) => find.byWidgetPredicate(
  (widget) => widget is CatchToggleInput && widget.semanticLabel == label,
);

EventProfileEditorSection editor(
  EventProfileEditorState state, {
  ValueChanged<EventProfileSelection?>? onSave,
}) => EventProfileEditorSection(
  state: state,
  onSave: onSave ?? (_) {},
  onChooseCard: (_) {},
  onLoadMore: () {},
  onReload: () {},
);
Future<void> pumpProfile(
  WidgetTester tester,
  Widget child, {
  bool dark = false,
  double scale = 1,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 844);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    RepaintBoundary(
      key: captureKey,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: dark ? AppTheme.dark : AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: CatchRouteScaffold(
          topBarBuilder: (_, _) => const CatchTopBar.route(
            title: 'Event profile',
            navigation: CatchTopBarNavigation(
              mode: CatchTopBarNavigationMode.back,
            ),
          ),
          body: CatchRouteBody.standardConstrained(child: child),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

Future<void> capture(WidgetTester tester, String name) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(captureKey),
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    final file = File('/tmp/catch-event-profile-review/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes!.buffer.asUint8List());
  });
}
