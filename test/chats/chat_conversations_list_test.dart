import 'dart:ui' show Tristate;

import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chat_conversations_list.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('selected conversation owns a visible semantic row state', (
    tester,
  ) async {
    final selected = _preview('selected', 'Selected guest');
    final other = _preview('other', 'Other guest');
    final semantics = tester.ensureSemantics();
    ChatThreadPreview? tapped;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CustomScrollView(
            slivers: [
              ChatConversationsList(
                matches: [selected, other],
                selectedMatchId: selected.matchId,
                onThreadSelected: (preview) => tapped = preview,
              ),
            ],
          ),
        ),
      ),
    );

    final selectedRow = find.byKey(ValueKey(selected.matchId));
    final otherRow = find.byKey(ValueKey(other.matchId));
    Finder rowAction(Finder row) => find.descendant(
      of: row,
      matching: find.byWidgetPredicate(
        (widget) => widget is Semantics && widget.properties.button == true,
      ),
    );
    expect(
      tester.getSemantics(rowAction(selectedRow)).flagsCollection.isSelected,
      Tristate.isTrue,
    );
    expect(
      tester.getSemantics(rowAction(otherRow)).flagsCollection.isSelected,
      isNot(Tristate.isTrue),
    );
    final activePaint = find.descendant(
      of: selectedRow,
      matching: find.byKey(const ValueKey('catch-field-active-overlay')),
    );
    expect(
      (tester.widget<AnimatedContainer>(activePaint).decoration!
              as BoxDecoration)
          .color,
      isNot(Colors.transparent),
    );

    await tester.tap(find.text('Selected guest'));
    expect(tapped?.matchId, selected.matchId);
    semantics.dispose();
  });
}

ChatThreadPreview _preview(String id, String name) {
  final match = Match(
    id: 'match-$id',
    user1Id: 'host',
    user2Id: 'guest-$id',
    createdAt: DateTime(2026, 8, 31),
    lastMessageAt: DateTime(2026, 8, 31, 9),
    lastMessagePreview: 'Can you help?',
    lastMessageSenderId: 'guest-$id',
  );
  return ChatThreadPreview(
    match: match,
    matchId: match.id,
    otherUid: 'guest-$id',
    displayName: name,
    photoUrl: null,
    previewText: 'Can you help?',
    timestamp: match.lastMessageAt!,
    unreadCount: 0,
    hasConversation: true,
    eventIds: const [],
  );
}
