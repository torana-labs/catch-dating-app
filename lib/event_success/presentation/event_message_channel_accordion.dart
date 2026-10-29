import 'dart:async';

import 'package:catch_dating_app/event_success/presentation/event_message_preference_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventMessageChannelAccordion extends StatelessWidget {
  const EventMessageChannelAccordion({
    super.key,
    required this.channel,
    required this.summary,
    required this.child,
    this.pending = false,
  });
  final EventMessageChannel channel;
  final String summary;
  final Widget child;
  final bool pending;
  @override
  Widget build(BuildContext context) => CatchFieldLanes.single(
    child: CatchField.control(
      copy: catchFieldCopy(context.l10n),
      key: ValueKey('messages.${channel.name}.disclosure'),
      title: eventMessageChannelLabel(context, channel),
      emphasis: CatchFieldEmphasis.title,
      body: summary,
      contractExemption:
          'Discloses server-reviewed event permission; channel controllers own exact consent and withdrawal commands.',
      disclosureMode: pending
          ? CatchFieldMode.localExpanded
          : CatchFieldMode.localCollapsed,
      child: child,
    ),
  );
}

String eventMessagePermissionLabel(
  BuildContext context,
  EventMessagePermission permission,
) => switch (permission) {
  EventMessagePermission.notSet => context.l10n.eventMessagesNotSet,
  EventMessagePermission.enabled => context.l10n.eventMessagesEnabled,
  EventMessagePermission.disabled => context.l10n.eventMessagesDisabled,
  EventMessagePermission.expired => context.l10n.eventMessagesExpired,
};

void runEventMessageAction(
  BuildContext context,
  Future<Object?> Function() action,
) {
  unawaited(() async {
    try {
      await action();
    } on Object catch (error) {
      if (context.mounted) showCatchNoticeError(context, error);
    }
  }());
}
