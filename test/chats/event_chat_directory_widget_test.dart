import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/chats/presentation/inbox/chat_inbox_screen.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/chats/presentation/inbox/event_chat_directory_controller.dart';
import 'package:catch_dating_app/chats/presentation/inbox/event_chat_directory_section.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_directory.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_chat_controller_test.dart' show roomAccess;

class FixtureDirectory extends EventChatDirectoryController {
  FixtureDirectory(this.page);
  final EventChatDirectoryPage page;
  int _refreshes = 0;
  @override
  Future<void> refresh() async {
    _refreshes++;
  }

  @override
  Future<EventChatDirectoryPage> build() async => page;
}

void main() {
  setUpAll(loadCatchTestFonts);
  setUp(() => AppConfig.configureEntrypointRole(AppRole.consumer));
  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets('event inbox $dark $scale works without dating data', (
        tester,
      ) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(390, 844);
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        var directReads = 0;
        late FixtureDirectory directory;
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              uidProvider.overrideWith((_) => Stream.value('person')),
              eventChatDirectoryControllerProvider.overrideWith(
                () => directory = FixtureDirectory(
                  EventChatDirectoryPage(
                    items: [roomAccess(join: true)],
                    nextCursor: null,
                  ),
                ),
              ),
              chatsListViewModelProvider.overrideWith((_) {
                directReads++;
                return const AsyncData(
                  ChatsListViewModel(
                    newMatches: [],
                    conversations: [],
                    totalThreadCount: 0,
                  ),
                );
              }),
              watchMatchesForUserProvider(
                'person',
              ).overrideWith((_) => Stream.value([])),
            ],
            child: RepaintBoundary(
              key: const ValueKey('capture'),
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
                home: const ChatsListScreen(),
              ),
            ),
          ),
        );
        await pumpFeatureUi(tester);
        expect(find.text('Demo event'), findsOneWidget);
        expect(find.text('Ready to join'), findsOneWidget);
        expect(directReads, 0);
        tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
        tester.binding.handleAppLifecycleStateChanged(
          AppLifecycleState.resumed,
        );
        await pumpFeatureUi(tester);
        expect(directory._refreshes, 1);
        expect(tester.takeException(), isNull);
        final boundary = tester.renderObject<RenderRepaintBoundary>(
          find.byKey(const ValueKey('capture')),
        );
        await tester.runAsync(() async {
          final image = await boundary.toImage(pixelRatio: 2);
          final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
          image.dispose();
          final file = File(
            '/tmp/catch-event-chat-review/directory-${dark ? 'dark' : 'light'}-$scale.png',
          );
          await file.parent.create(recursive: true);
          await file.writeAsBytes(bytes!.buffer.asUint8List());
        });
        await tester.tap(find.text('Direct messages'));
        await pumpFeatureUi(tester);
        expect(directReads, 1);
        expect(find.text('Demo event'), findsNothing);
        expect(tester.takeException(), isNull);
        await tester.tap(find.text('Events'));
        await pumpFeatureUi(tester);
        expect(find.text('Demo event'), findsOneWidget);
      });
    }
  }
  testWidgets('empty scan page keeps the continuation action accessible', (
    tester,
  ) async {
    var more = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: CustomScrollView(
            slivers: [
              EventChatDirectoryRowList(
                page: EventChatDirectoryPage(
                  items: const [],
                  nextCursor: const {'source': 'attendees'},
                ),
                onSelected: (_) {},
                onLoadMore: () => more++,
              ),
            ],
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    final button = find.widgetWithText(CatchButton, 'Check more events');
    expect(tester.getSize(button).height, greaterThanOrEqualTo(44));
    await tester.tap(button);
    expect(more, 1);
    expect(tester.takeException(), isNull);
  });
}
