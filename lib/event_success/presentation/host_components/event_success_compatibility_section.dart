import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/event_success/domain/event_success_plan.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessCompatibilitySection extends StatelessWidget {
  const EventSuccessCompatibilitySection({super.key, required this.plan});

  final EventSuccessPlan plan;

  @override
  Widget build(BuildContext context) {
    final rankingOn = plan.compatibilityAffectsRanking;
    final pack = plan.questionnaireConfig.pack;
    return CatchSection.fieldRows(
      children: [
        CatchField.content(
          copy: catchFieldCopy(context.l10n),
          title: context
              .l10n
              .eventSuccessEventSuccessHostSharedTextMatchClueQuestions,
          body: rankingOn
              ? context
                    .l10n
                    .eventSuccessEventSuccessHostSharedTextSuggestedPairingsCanUse
              : context
                    .l10n
                    .eventSuccessEventSuccessHostSharedTextAnswersCanStillShape,
          valueText: pack.title,
          icon: CatchIcons.mind,
          actions: CatchBadge(
            label: rankingOn
                ? context
                      .l10n
                      .eventSuccessEventSuccessHostSharedLabelCanGuidePairings
                : context.l10n.eventSuccessEventSuccessHostSharedLabelCluesOnly,
            tone: rankingOn ? CatchBadgeTone.success : CatchBadgeTone.neutral,
          ),
        ),
      ],
    );
  }
}
