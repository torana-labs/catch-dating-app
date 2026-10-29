import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/matches/shared/match_celebration_dialog.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

void showMatchCelebration(
  BuildContext context,
  Match match,
  String currentUid,
) {
  final otherUid = match.otherId(currentUid);

  Navigator.of(context, rootNavigator: true).push(
    MaterialPageRoute<void>(
      fullscreenDialog: true,
      builder: (routeContext) => Consumer(
        builder: (_, ref, _) => MatchCelebrationDialog(
          match: match,
          otherUid: otherUid,
          onSendMessage: () {
            Navigator.of(routeContext).pop();
            final otherProfile = ref
                .read(watchPublicProfileProvider(otherUid))
                .asData
                ?.value;
            context.goNamed(
              Routes.chatScreen.name,
              pathParameters: {'matchId': match.id},
              extra: otherProfile,
            );
          },
          onKeepSwiping: () => Navigator.of(routeContext).pop(),
        ),
      ),
    ),
  );
}
