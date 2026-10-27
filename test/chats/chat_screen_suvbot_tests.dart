part of 'chat_screen_test.dart';

void _registerChatScreenSuvbotTests() {
  group('ChatScreen Suvbot', () {
    testWidgets('retries failed Suvbot controls through the typed target', (
      tester,
    ) async {
      final matchRepository = FakeMatchRepository(
        match: buildMatch(
          id: 'suvbot_runner-1',
          user1Id: suvbotUid,
          user2Id: 'runner-1',
          eventIds: const ['suvbot'],
        ),
      );
      final conversationRepository = FakeConversationRepository();
      var actionsProviderBuilds = 0;
      await tester.pumpWidget(
        ProviderScope(
          retry: (_, _) => null,
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            matchRepositoryProvider.overrideWithValue(matchRepository),
            conversationRepositoryProvider.overrideWithValue(
              conversationRepository,
            ),
            suvbotActionsProvider.overrideWith((ref) async {
              actionsProviderBuilds += 1;
              throw Exception('controls failed');
            }),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const ChatScreen(matchId: 'suvbot_runner-1'),
          ),
        ),
      );

      await pumpFeatureUi(tester);

      expect(find.text('Reload controls'), findsOneWidget);
      final buildsBeforeRetry = actionsProviderBuilds;

      await tester.tap(find.text('Reload controls'));
      await pumpFeatureUi(tester);

      expect(actionsProviderBuilds, greaterThan(buildsBeforeRetry));
    });

    testWidgets('shows Suvbot controls without chat composer', (tester) async {
      final matchRepository = FakeMatchRepository(
        match: buildMatch(
          id: 'suvbot_runner-1',
          user1Id: suvbotUid,
          user2Id: 'runner-1',
          eventIds: const ['suvbot'],
          lastMessagePreview: 'I can refresh your seeded demo state.',
          lastMessageSenderId: suvbotUid,
        ),
      );
      final conversationRepository = FakeConversationRepository();
      final suvbotRepository = FakeSuvbotRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            matchRepositoryProvider.overrideWithValue(matchRepository),
            conversationRepositoryProvider.overrideWithValue(
              conversationRepository,
            ),
            suvbotRepositoryProvider.overrideWithValue(suvbotRepository),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const ChatScreen(matchId: 'suvbot_runner-1'),
          ),
        ),
      );

      await pumpFeatureUi(tester);

      expect(find.text('Suvbot'), findsOneWidget);
      expect(find.text('Suvbot controls'), findsOneWidget);
      expect(find.text('No typing needed'), findsOneWidget);
      expect(find.text('Refresh all'), findsOneWidget);
      expect(find.text('Check setup'), findsOneWidget);
      expect(find.text('CREATE A TEST STATE'), findsOneWidget);
      expect(find.text('Signups'), findsOneWidget);
      expect(find.text('Post-event'), findsOneWidget);
      expect(find.text('Chats'), findsOneWidget);
      expect(find.text('Payments'), findsOneWidget);
      expect(find.text('Reset...'), findsOneWidget);
      expect(find.text('YOU BOTH RAN'), findsNothing);
      expect(find.byType(TextField), findsNothing);
      expect(find.byIcon(CatchIcons.photo), findsNothing);
      expect(find.byIcon(CatchIcons.send), findsNothing);

      await tester.tap(find.text('Check setup'));
      await pumpFeatureUi(tester);

      expect(suvbotRepository.calls.single.actionId, 'checkDemoState');

      await tester.tap(find.text('Reset...'));
      await pumpFeatureUi(tester);
      expect(find.text('Reset demo state'), findsOneWidget);
      expect(find.text('Delete demo chat state.'), findsOneWidget);
      expect(find.byType(ListTile), findsNothing);
      await tester.tap(find.text('Reset chats'));
      await pumpFeatureUi(tester);

      expect(suvbotRepository.calls.last.actionId, 'resetChats');

      await tester.tap(find.text('Match tester'));
      await pumpFeatureUi(tester);
      expect(find.byType(TextField), findsOneWidget);
      await tester.enterText(find.byType(TextField), '+919999999999');
      await tester.tap(find.text('Create match'));
      await pumpFeatureUi(tester);

      expect(suvbotRepository.calls.last.actionId, 'matchTesterByPhone');
      expect(suvbotRepository.calls.last.text, '+919999999999');
    });
  });
}
