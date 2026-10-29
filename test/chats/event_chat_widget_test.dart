import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/chats/presentation/event_chat_controller.dart';
import 'package:catch_dating_app/chats/presentation/event_chat_screen.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_input.dart';
import 'package:catch_dating_app/chats/presentation/widgets/event_chat_message_tile.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';

EventChatState fixture({
  bool joined = true,
  bool host = false,
  bool claim = false,
  String? roomStatus,
  bool muted = false,
  bool removed = false,
}) {
  final now = DateTime.utc(2026, 9, 23, 12);
  final mode = roomStatus ?? (host ? 'notCreated' : 'open');
  final readable = {'open', 'paused', 'announcementsOnly'}.contains(mode);
  final canRead = joined && !removed && !claim && readable;
  return EventChatState(
    uid: 'sara',
    access: EventChatAccess(
      eventId: 'event',
      title: 'RSVP coffee afternoon',
      organizerId: 'rsvp',
      roomStatus: mode,
      roomRevision: 0,
      membershipStatus: removed
          ? 'removed'
          : joined
          ? 'joined'
          : 'notJoined',
      membershipRevision: 0,
      canManage: host,
      canJoin: readable && !claim && !removed,
      canReadMessages: canRead,
      canPostMessages:
          canRead && (mode == 'open' || (mode == 'announcementsOnly' && host)),
      notificationsMuted: muted,
      profileClaimRequired: claim,
      termsVersion: 'event-chat-v1',
    ),
    messages: canRead
        ? [
            EventChatMessage(
              messageId: 'reply',
              sequence: 2,
              sentAt: now,
              senderUid: 'sara',
              senderName: 'Sara',
              available: true,
              text: 'Lovely! I’ll be there a little early. ☕',
              reply: const EventChatReply(
                messageId: 'first',
                available: true,
                senderName: 'Alex',
                text: 'Looking forward to meeting everyone!',
              ),
              reactionCounts: const {EventChatReaction.love: 2},
              myReaction: EventChatReaction.love,
              myReactionRevision: 1,
            ),
            EventChatMessage(
              messageId: 'first',
              sequence: 1,
              sentAt: now.subtract(const Duration(minutes: 2)),
              senderUid: 'alex',
              senderName: 'Alex',
              available: true,
              text:
                  'Looking forward to meeting everyone! Who else is trying this café for the first time?',
              reply: null,
              reactionCounts: const {EventChatReaction.like: 3},
              myReaction: null,
              myReactionRevision: 0,
            ),
          ]
        : [],
    typing: const [
      EventChatTyping(uid: 'alex', displayName: 'Alex', expiresAtMillis: 2000),
    ],
    nextBeforeSequence: joined ? 1 : null,
    receivedAt: now,
    serverTimeMillis: 1000,
  );
}

const captureKey = ValueKey('event-chat-capture');
void main() {
  setUpAll(loadCatchTestFonts);
  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      for (final joined in [false, true]) {
        testWidgets('event chat readable $dark $scale $joined', (tester) async {
          final draft = TextEditingController();
          final scroll = ScrollController();
          addTearDown(draft.dispose);
          addTearDown(scroll.dispose);
          final actions = <EventChatAction>[];
          final state = fixture(joined: joined);
          await pumpRoom(
            tester,
            state,
            draft,
            scroll,
            dark: dark,
            scale: scale,
            onAction: actions.add,
          );
          expect(tester.takeException(), isNull);
          await capture(
            tester,
            '${joined ? 'room' : 'join'}-${dark ? 'dark' : 'light'}-$scale',
          );
          if (!joined) {
            final button = find.widgetWithText(CatchButton, 'Join event chat');
            await tester.ensureVisible(button);
            expect(tester.getSize(button).height, greaterThanOrEqualTo(44));
            await tester.tap(button);
            await pumpFeatureUi(tester);
            expect(actions, [EventChatAction.join]);
          } else {
            expect(find.text('Alex typing…'), findsOneWidget);
            final button = find.descendant(
              of: find.byKey(const ValueKey('reply')),
              matching: find.byTooltip('Message actions'),
            );
            await tester.tap(button);
            await pumpFeatureUi(tester);
            expect(find.text('Reply'), findsOneWidget);
            expect(find.text('React'), findsOneWidget);
          }
          expect(tester.takeException(), isNull);
        });
      }
    }
  }
  testWidgets('host opening and profile review are separate actions', (
    tester,
  ) async {
    final draft = TextEditingController();
    final scroll = ScrollController();
    addTearDown(draft.dispose);
    addTearDown(scroll.dispose);
    await pumpRoom(
      tester,
      fixture(joined: false, host: true, claim: true),
      draft,
      scroll,
    );
    expect(find.text('Open event chat'), findsOneWidget);
    expect(find.text('Review my profile'), findsOneWidget);
    expect(find.text('Join event chat'), findsNothing);
    await capture(tester, 'host-open-profile-review');
  });
  for (final room in [
    'scheduled',
    'paused',
    'announcementsOnly',
    'removed',
    'muted',
  ]) {
    testWidgets('fixture room state $room has appropriate access and capture', (
      tester,
    ) async {
      final draft = TextEditingController();
      final scroll = ScrollController();
      addTearDown(draft.dispose);
      addTearDown(scroll.dispose);
      final state = fixture(
        roomStatus: room == 'removed' || room == 'muted' ? 'open' : room,
        removed: room == 'removed',
        muted: room == 'muted',
      );
      await pumpRoom(tester, state, draft, scroll);
      expect(tester.takeException(), isNull);
      expect(
        find.byType(ChatInput),
        room == 'muted' ? findsOneWidget : findsNothing,
      );
      if (room == 'paused') {
        expect(find.textContaining('Posting is paused'), findsOneWidget);
      }
      if (room == 'announcementsOnly') {
        expect(find.textContaining('Only hosts can post'), findsOneWidget);
      }
      if (room == 'removed') {
        expect(
          find.textContaining('membership is unavailable'),
          findsOneWidget,
        );
      }
      if (room == 'removed' || room == 'scheduled') {
        expect(state.access.canJoin, isFalse);
        expect(find.text('Join event chat'), findsNothing);
      }
      await capture(tester, 'fixture-$room');
    });
  }
  for (final room in ['closed', 'archived']) {
    testWidgets('terminal room $room hides messages and member actions', (
      tester,
    ) async {
      final draft = TextEditingController();
      final scroll = ScrollController();
      addTearDown(draft.dispose);
      addTearDown(scroll.dispose);
      final state = fixture(roomStatus: room, host: room == 'archived');
      expect(state.access.canReadMessages, isFalse);
      expect(state.access.canPostMessages, isFalse);
      expect(state.access.canJoin, isFalse);
      await pumpRoom(tester, state, draft, scroll);
      expect(find.byType(ChatInput), findsNothing);
      expect(find.text('Join event chat'), findsNothing);
      expect(find.text('Open event chat'), findsNothing);
      expect(find.text('Looking forward to meeting everyone!'), findsNothing);
      expect(tester.takeException(), isNull);
      await capture(tester, 'fixture-$room');
    });
  }
  testWidgets('desktop room preserves readable conversation and composer', (
    tester,
  ) async {
    final draft = TextEditingController();
    final scroll = ScrollController();
    addTearDown(draft.dispose);
    addTearDown(scroll.dispose);
    await pumpRoom(
      tester,
      fixture(),
      draft,
      scroll,
      scale: 2,
      viewport: const Size(1280, 900),
    );
    expect(find.byType(ChatInput), findsOneWidget);
    expect(
      find.textContaining('Looking forward to meeting everyone!'),
      findsWidgets,
    );
    expect(tester.takeException(), isNull);
    await capture(tester, 'desktop-room-open-2x');
  });
  for (final reactions in [false, true]) {
    testWidgets(
      'large text with keyboard and ${reactions ? 'reactions' : 'reply'}',
      (tester) async {
        final draft = TextEditingController(text: 'A draft');
        final scroll = ScrollController();
        addTearDown(draft.dispose);
        addTearDown(scroll.dispose);
        tester.view.viewInsets = const FakeViewPadding(bottom: 300);
        addTearDown(tester.view.resetViewInsets);
        await pumpRoom(
          tester,
          fixture(),
          draft,
          scroll,
          scale: 2,
          replyId: 'first',
          reactionId: reactions ? 'reply' : null,
        );
        expect(tester.takeException(), isNull);
        await capture(
          tester,
          reactions ? 'keyboard-reactions' : 'keyboard-reply',
        );
      },
    );
  }
  testWidgets('reaction choices wrap and retain full touch targets', (
    tester,
  ) async {
    final selected = <EventChatReaction?>[];
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: 320,
              child: EventChatReactionSection(
                selected: EventChatReaction.love,
                onSelected: selected.add,
                onClose: () {},
              ),
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    for (final reaction in EventChatReaction.values) {
      final button = find.widgetWithText(CatchButton, reaction.emoji);
      expect(tester.getSize(button).height, greaterThanOrEqualTo(44));
      await tester.tap(button);
    }
    expect(selected, [
      EventChatReaction.like,
      null,
      EventChatReaction.laugh,
      EventChatReaction.wow,
      EventChatReaction.sad,
      EventChatReaction.thanks,
    ]);
    expect(tester.takeException(), isNull);
  });
}

Future<void> pumpRoom(
  WidgetTester tester,
  EventChatState state,
  TextEditingController draft,
  ScrollController scroll, {
  bool dark = false,
  double scale = 1,
  Size viewport = const Size(390, 844),
  ValueChanged<EventChatAction>? onAction,
  String? replyId,
  String? reactionId,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = viewport;
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
            title: 'RSVP coffee afternoon',
            navigation: CatchTopBarNavigation(
              mode: CatchTopBarNavigationMode.back,
            ),
          ),
          body: CatchRouteBody.fullBleed(
            child: EventChatPageBody(
              state: state,
              draft: draft,
              scrollController: scroll,
              now: state.receivedAt,
              replyId: replyId,
              reactionId: reactionId,
              onSend: () {},
              onLoadEarlier: () {},
              onAction: onAction ?? (_) {},
              onReviewProfile: () {},
              onReply: (_) {},
              onShowReactions: (_) {},
              onReaction: (_, _) {},
            ),
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

Future<void> capture(WidgetTester tester, String name) async {
  final directory =
      Platform.environment['CATCH_EVENT_CHAT_REVIEW_DIR'] ??
      '/tmp/catch-event-chat-review';
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(captureKey),
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    final file = File('$directory/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes!.buffer.asUint8List());
  });
}
