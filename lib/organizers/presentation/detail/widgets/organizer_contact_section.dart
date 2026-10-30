import 'dart:async';

import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_screen_state.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

typedef OrganizerContactActionHandler =
    Future<void> Function(OrganizerContactAction action);

class OrganizerContactSection extends StatelessWidget {
  const OrganizerContactSection({
    super.key,
    required this.actions,
    this.showTitle = true,
    this.onContactSelected,
  });

  final List<OrganizerContactAction> actions;
  final bool showTitle;
  final OrganizerContactActionHandler? onContactSelected;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CatchSection.fieldRows(
      title: showTitle
          ? context.l10n.organizersOrganizerContactSectionTitleContact
          : null,
      children: [
        for (final action in actions)
          CatchField.action(
            copy: catchFieldCopy(context.l10n),
            icon: _contactActionIcon(action.kind),
            iconColor: t.ink,
            title: action.label,
            onTap: onContactSelected != null
                ? () => unawaited(onContactSelected!(action))
                : null,
            actions: Icon(CatchIcons.goTo, size: CatchIconSize.sm),
          ),
      ],
    );
  }
}

IconData _contactActionIcon(OrganizerContactActionKind kind) {
  return switch (kind) {
    OrganizerContactActionKind.instagram => CatchIcons.handle,
    OrganizerContactActionKind.phone => CatchIcons.phone,
    OrganizerContactActionKind.email => CatchIcons.email,
  };
}
