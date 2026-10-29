import 'dart:math' as math;

import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessReadinessField extends StatelessWidget {
  const EventSuccessReadinessField({super.key, required this.issues});

  final List<String> issues;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchFieldLanes.single(
      child: CatchField.content(
        copy: catchFieldCopy(context.l10n),
        title: context.l10n.eventSuccessEventSuccessHostSetupTitleBeforeLaunch,
        body: issues.join('\n'),
        bodyMaxLines: math.max(3, issues.length * 2),
        icon: CatchIcons.error,
        iconColor: t.warning,
      ),
    );
  }
}
