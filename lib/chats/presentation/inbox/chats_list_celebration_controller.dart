import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/matches/presentation/match_celebration_controller.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ChatsListCelebrationController {
  const ChatsListCelebrationController();

  List<Match> newMatchesToCelebrate({
    required AsyncValue<List<Match>>? previous,
    required AsyncValue<List<Match>> next,
    required bool isHostApp,
  }) {
    if (isHostApp || previous == null || !previous.hasValue || !next.hasValue) {
      return const [];
    }

    final previousIds = previous.value!.map((match) => match.id).toSet();
    return List.unmodifiable(
      next.value!.where(
        (match) =>
            match.conversationType == MatchConversationType.match &&
            !previousIds.contains(match.id),
      ),
    );
  }

  void showNewMatchCelebrations({
    required BuildContext context,
    required String uid,
    required AsyncValue<List<Match>>? previous,
    required AsyncValue<List<Match>> next,
    required bool isHostApp,
  }) {
    if (!context.mounted) return;

    final matches = newMatchesToCelebrate(
      previous: previous,
      next: next,
      isHostApp: isHostApp,
    );
    for (final match in matches) {
      showMatchCelebration(context, match, uid);
    }
  }
}
