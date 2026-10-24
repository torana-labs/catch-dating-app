import 'dart:math';

import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_checkpoint.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_visit_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Original departure members without an arrival observation, including resolved
/// visits. A visit outcome never removes a person from this denominator.
class EventAssistanceCheckpointVisitsSection extends StatefulWidget {
  const EventAssistanceCheckpointVisitsSection({
    super.key,
    required this.members,
    required this.names,
    required this.reviewableGuestIds,
    required this.onReview,
  });
  final List<AssistanceCheckpointMember> members;
  final Map<String, String> names;
  final Set<String> reviewableGuestIds;
  final ValueChanged<String>? onReview;
  @override
  State<EventAssistanceCheckpointVisitsSection> createState() =>
      _EventAssistanceCheckpointVisitsSectionState();
}

class _EventAssistanceCheckpointVisitsSectionState
    extends State<EventAssistanceCheckpointVisitsSection> {
  String _search = '';
  int _page = 0;
  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final unconfirmed = widget.members.where((m) => !m.accountedFor).toList();
    final matches = unconfirmed
        .where(
          (m) =>
              (widget.names[m.attendeeId] ??
                      l10n.eventAssistanceCheckpointUnknownGuest)
                  .toLowerCase()
                  .contains(_search.trim().toLowerCase()),
        )
        .toList();
    final page = min(_page, max(0, (matches.length - 1) ~/ 12));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        CatchText(
          l10n.eventAssistanceCheckpointVisitsTitle,
          variant: CatchTextVariant.titleL,
        ),
        gapH8,
        CatchText(
          l10n.eventAssistanceCheckpointVisitsBody,
          variant: CatchTextVariant.supporting,
        ),
        if (unconfirmed.length > 12) ...[
          gapH8,
          CatchSearchField.expanded(
            copy: catchSearchFieldCopy(l10n),
            value: _search,
            placeholder: l10n.eventAssistanceDepartureSearch,
            contractExemption:
                'Local search of original unconfirmed departure members.',
            onChanged: (value) => setState(() {
              _search = value;
              _page = 0;
            }),
          ),
        ],
        if (matches.isEmpty)
          CatchText(
            l10n.eventAssistanceDepartureNoGuests,
            variant: CatchTextVariant.supporting,
          ),
        if (matches.isNotEmpty)
          CatchSection.containedRows(
            children: matches.skip(page * 12).take(12).map((member) {
              final content = CatchRecordLayout(
                icon: CatchIcons.group,
                title:
                    widget.names[member.attendeeId] ??
                    l10n.eventAssistanceCheckpointUnknownGuest,
                description: widget.names[member.attendeeId] == null
                    ? l10n.eventAssistanceCheckpointUnknownGuestBody
                    : switch (member.disposition) {
                        AssistanceCheckpointResolvedDisposition(
                          :final disposition,
                        ) =>
                          assistanceVisitLabel(l10n, disposition),
                        AssistanceCheckpointDispositionUnresolved() =>
                          l10n.eventSuccessAccountabilityUnresolved,
                        AssistanceCheckpointDispositionNotProvided() =>
                          l10n.eventAssistanceCheckpointVisitUnknown,
                        AssistanceCheckpointDispositionUnavailable(
                          :final reason,
                        ) =>
                          reason ==
                                  AssistanceCheckpointDispositionUnavailableReason
                                      .beforeDeparture
                              ? l10n.eventAssistanceCheckpointVisitBeforeDeparture
                              : l10n.eventAssistanceCheckpointVisitChanged,
                      },
              );
              final key = ValueKey('checkpoint.visit.${member.attendeeId}');
              final reviewable =
                  widget.onReview != null &&
                  widget.reviewableGuestIds.contains(member.attendeeId);
              return reviewable
                  ? CatchField.navigate(
                      key: key,
                      content: content,
                      onActivate: () => widget.onReview!(member.attendeeId),
                    )
                  : CatchField.read(key: key, content: content);
            }).toList(),
          ),
        if (matches.length > 12)
          Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              CatchButton(
                label: l10n.eventAssistanceDeparturePreviousPeople,
                variant: CatchButtonVariant.ghost,
                onPressed: page == 0
                    ? null
                    : () => setState(() => _page = page - 1),
              ),
              CatchButton(
                label: l10n.eventAssistanceDepartureNextPeople,
                variant: CatchButtonVariant.ghost,
                onPressed: (page + 1) * 12 >= matches.length
                    ? null
                    : () => setState(() => _page = page + 1),
              ),
            ],
          ),
      ],
    );
  }
}
