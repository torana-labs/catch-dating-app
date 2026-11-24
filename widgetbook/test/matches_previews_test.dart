import 'package:catch_dating_app/pages/inbox/chats_list_view_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/matches/catalog/fixtures.dart';
import 'package:widgetbook_workspace/matches/catalog/scope.dart';

void main() {
  testWidgets(
    'inbox preview queries are prepared independently and stay editable',
    (tester) async {
      final containers = <String, ProviderContainer>{};
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Column(
              children: [
                for (final query in [' Taylor', '', 'Morgan'])
                  WidgetbookMatchesMatchesListRouteScope(
                    query: query,
                    matches: widgetbookMatchesConsumerMatches,
                    viewModel: AsyncData(widgetbookMatchesConsumerViewModel()),
                    child: Consumer(
                      builder: (context, ref, _) {
                        containers[query] = ProviderScope.containerOf(context);
                        return Text(
                          '$query:${ref.watch(chatSearchQueryProvider)}',
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
      await tester.pump();
      expect(tester.takeException(), isNull);
      expect(find.text(' Taylor:Taylor'), findsOneWidget);
      expect(find.text(':'), findsOneWidget);
      expect(find.text('Morgan:Morgan'), findsOneWidget);
      containers['']!
          .read(chatSearchQueryProvider.notifier)
          .setQuery('  new search');
      await tester.pump();
      expect(find.text(':new search'), findsOneWidget);
      expect(containers[' Taylor']!.read(chatSearchQueryProvider), 'Taylor');
      expect(containers['Morgan']!.read(chatSearchQueryProvider), 'Morgan');
    },
  );

  testWidgets(
    'changing the authored query remounts the initial fixture state',
    (tester) async {
      final query = ValueNotifier('Taylor');
      addTearDown(query.dispose);
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: ValueListenableBuilder(
              valueListenable: query,
              builder: (context, value, _) =>
                  WidgetbookMatchesMatchesListRouteScope(
                    query: value,
                    matches: widgetbookMatchesConsumerMatches,
                    viewModel: AsyncData(widgetbookMatchesConsumerViewModel()),
                    child: Consumer(
                      builder: (context, ref, _) =>
                          Text(ref.watch(chatSearchQueryProvider)),
                    ),
                  ),
            ),
          ),
        ),
      );
      expect(find.text('Taylor'), findsOneWidget);
      query.value = 'Morgan';
      await tester.pump();
      expect(tester.takeException(), isNull);
      expect(find.text('Morgan'), findsOneWidget);
      query.value = '';
      await tester.pump();
      expect(tester.takeException(), isNull);
      expect(find.text(''), findsOneWidget);
    },
  );
}
