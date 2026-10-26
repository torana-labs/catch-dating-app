import 'dart:async';

import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum _HostCustomerRecordAction { message, logOutreach, remove }

class HostCustomerRecordMenu extends StatelessWidget {
  const HostCustomerRecordMenu({
    super.key,
    required this.enabled,
    required this.canMessage,
    required this.onMessage,
    required this.onLogOutreach,
    required this.onRemove,
  });

  final bool enabled;
  final bool canMessage;
  final Future<void> Function() onMessage;
  final Future<void> Function() onLogOutreach;
  final Future<void> Function() onRemove;

  @override
  Widget build(BuildContext context) =>
      CatchActionMenu<_HostCustomerRecordAction>(
        key: const ValueKey('host-customer-record-actions'),
        tooltip: context.l10n.hostCustomersMoreActions,
        enabled: enabled,
        items: [
          if (MediaQuery.textScalerOf(context).scale(1) >=
                  CatchRecordTokens.largeTextBreakpoint &&
              canMessage)
            CatchActionMenuItem(
              value: _HostCustomerRecordAction.message,
              label: context.l10n.hostCustomersWhatsappMessage,
              icon: CatchIcons.chat,
            ),
          CatchActionMenuItem(
            value: _HostCustomerRecordAction.logOutreach,
            label: context.l10n.hostCustomersLogOutreach,
            icon: CatchIcons.phone,
          ),
          CatchActionMenuItem(
            value: _HostCustomerRecordAction.remove,
            label: context.l10n.hostsHostAudienceRemoveAction,
            icon: CatchIcons.delete,
            isDestructive: true,
          ),
        ],
        onSelected: (action) => unawaited(switch (action) {
          _HostCustomerRecordAction.message => onMessage(),
          _HostCustomerRecordAction.logOutreach => onLogOutreach(),
          _HostCustomerRecordAction.remove => onRemove(),
        }),
      );
}
