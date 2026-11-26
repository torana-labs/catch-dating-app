import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_answers_sheet.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

// One wedding guest's answers, opened from a household on the planner.

@widgetbook.UseCase(
  name: 'A guest with mixed answers',
  type: HostProgrammeAnswersSheet,
  path: '[P1 product surfaces]/Host/Programmes',
)
Widget hostProgrammeAnswersSheetUseCase(BuildContext context) => CatchRoot(
  format: CatchFormat.nightsOut,
  child: Align(
    alignment: Alignment.bottomCenter,
    child: HostProgrammeAnswersSheet(
      guestName: 'Kamla Mehra',
      household: 'The Mehra family',
      answers: const [
        HostProgrammeAnswer(
          functionId: 'mehendi',
          name: 'Mehendi',
          reply: HostProgrammeReply.coming,
        ),
        HostProgrammeAnswer(
          functionId: 'sangeet',
          name: 'Sangeet',
          reply: HostProgrammeReply.maybe,
        ),
        HostProgrammeAnswer(
          functionId: 'haldi',
          name: 'Haldi',
          reply: HostProgrammeReply.noReply,
        ),
        HostProgrammeAnswer(
          functionId: 'reception',
          name: 'Reception',
          reply: HostProgrammeReply.notInvited,
        ),
      ],
      onAnswer: (_, _) async => true,
    ),
  ),
);
