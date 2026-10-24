import 'dart:async';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/events/domain/event_attendee.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum _EventSuccessAccountabilitySelection { unresolved, returned, departed }

class EventSuccessAccountabilitySection extends StatelessWidget {
  const EventSuccessAccountabilitySection({
    super.key,
    required this.attendees,
    required this.isLoading,
    required this.isResolving,
    required this.error,
    required this.onResolve,
  });

  final List<EventAttendee> attendees;
  final bool isLoading;
  final bool isResolving;
  final Object? error;
  final Future<void> Function(
    String attendeeId,
    EventSuccessAccountabilityResolution? resolution,
  )?
  onResolve;

  @override
  Widget build(BuildContext context) {
    final resolvedCount = attendees
        .where((attendee) => attendee.currentAccountabilityResolution != null)
        .length;
    return CatchSurface.card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchSectionHeader(
            padding: EdgeInsets.zero,
            title: context.l10n.eventSuccessAccountabilityTitle,
            subtitle: context.l10n.eventSuccessAccountabilitySubtitle,
          ),
          gapH8,
          CatchText(
            context.l10n.eventSuccessAccountabilityProgress(
              resolved: resolvedCount,
              total: attendees.length,
            ),
            variant: CatchTextVariant.supporting,
          ),
          if (error != null) ...[
            gapH10,
            CatchLocalizedErrorBanner(error!, context: AppErrorContext.event),
          ],
          if (isLoading && attendees.isEmpty) ...[
            gapH12,
            CatchSkeleton.text(width: CatchLayout.skeletonTextSectionWideWidth),
          ] else if (attendees.isEmpty) ...[
            gapH12,
            CatchText(
              context.l10n.eventSuccessAccountabilityEmpty,
              variant: CatchTextVariant.supporting,
            ),
          ] else ...[
            gapH8,
            CatchSection.fieldRows(
              first: true,
              children: [
                for (final indexed in attendees.indexed)
                  CatchField<_EventSuccessAccountabilitySelection>.choices(
                    copy: catchFieldCopy(context.l10n),
                    key: ValueKey(
                      'event_success.accountability.${indexed.$2.id}',
                    ),
                    title: indexed.$2.displayName,
                    body: _accountabilitySelectionLabel(
                      context,
                      _accountabilitySelection(indexed.$2),
                    ),
                    contract: CatchContractConstraints
                        .setEventSuccessAccountabilityResolutionCallablePayloadResolution,
                    contractValueBuilder: (value) => value.name,
                    values: _EventSuccessAccountabilitySelection.values,
                    itemLabelBuilder: (value) =>
                        _accountabilitySelectionLabel(context, value),
                    selected: {_accountabilitySelection(indexed.$2)},
                    onSelectionChanged: isResolving || onResolve == null
                        ? null
                        : (selection) {
                            final value = selection.firstOrNull;
                            if (value == null) return;
                            unawaited(
                              onResolve!(
                                indexed.$2.id,
                                _accountabilityResolution(value),
                              ),
                            );
                          },
                    status: isResolving
                        ? CatchFieldStatus.saving
                        : CatchFieldStatus.idle,
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

_EventSuccessAccountabilitySelection _accountabilitySelection(
  EventAttendee attendee,
) => switch (attendee.currentAccountabilityResolution) {
  EventSuccessAccountabilityResolution.returned =>
    _EventSuccessAccountabilitySelection.returned,
  EventSuccessAccountabilityResolution.departed =>
    _EventSuccessAccountabilitySelection.departed,
  null => _EventSuccessAccountabilitySelection.unresolved,
};

EventSuccessAccountabilityResolution? _accountabilityResolution(
  _EventSuccessAccountabilitySelection selection,
) => switch (selection) {
  _EventSuccessAccountabilitySelection.returned =>
    EventSuccessAccountabilityResolution.returned,
  _EventSuccessAccountabilitySelection.departed =>
    EventSuccessAccountabilityResolution.departed,
  _EventSuccessAccountabilitySelection.unresolved => null,
};

String _accountabilitySelectionLabel(
  BuildContext context,
  _EventSuccessAccountabilitySelection selection,
) => switch (selection) {
  _EventSuccessAccountabilitySelection.unresolved =>
    context.l10n.eventSuccessAccountabilityUnresolved,
  _EventSuccessAccountabilitySelection.returned =>
    context.l10n.eventSuccessAccountabilityReturned,
  _EventSuccessAccountabilitySelection.departed =>
    context.l10n.eventSuccessAccountabilityDeparted,
};
