import 'package:catch_dating_app/core/celebration/celebration_effects_controller.dart';
import 'package:catch_dating_app/core/celebration/celebration_screen.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/matches/domain/match.dart';
import 'package:catch_dating_app/public_profile/data/public_profile_repository.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class MatchCelebrationDialog extends ConsumerWidget {
  const MatchCelebrationDialog({
    super.key,
    required this.match,
    required this.otherUid,
    required this.onSendMessage,
    required this.onKeepSwiping,
  });

  final Match match;
  final String otherUid;
  final VoidCallback onSendMessage;
  final VoidCallback onKeepSwiping;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(watchPublicProfileProvider(otherUid));
    final t = CatchTokens.of(context);

    final profile = profileAsync.asData?.value;
    final name = profile?.name ?? '…';
    final photoUrl = profile?.primaryPhotoThumbnailUrl;

    return CelebrationScreen(
      kind: CelebrationMomentKind.match,
      eyebrow: context.l10n.matchesMatchCelebrationDialogEyebrowNewCatch,
      title: context.l10n.matchesMatchCelebrationDialogTitleItSACatch,
      message: context.l10n.matchesMatchCelebrationDialogMessageYouAndNameBoth(
        name: name,
      ),
      icon: CatchIcons.like,
      visual: CatchAvatar(
        size: 108,
        name: name,
        imageUrl: photoUrl,
        borderWidth: CatchStroke.selection,
        borderColor: t.primary,
      ),
      details: [
        CelebrationDetail(
          icon: CatchIcons.like,
          label: context.l10n.matchesMatchCelebrationDialogLabelMatch,
          value: context.l10n.matchesCelebrationLikedBack(name: name),
        ),
      ],
      note: context
          .l10n
          .matchesMatchCelebrationDialogNoteStartWithSomethingSpecific,
      primaryAction: CelebrationAction(
        label: context.l10n.matchesMatchCelebrationDialogLabelSendAMessage,
        onPressed: onSendMessage,
        icon: Icon(CatchIcons.send),
      ),
      secondaryAction: CelebrationAction(
        label: context.l10n.matchesMatchCelebrationDialogLabelKeepCatching,
        onPressed: onKeepSwiping,
      ),
      onClose: onKeepSwiping,
    );
  }
}
