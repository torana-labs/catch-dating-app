import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_draft_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/draft_picker_sheet.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

Future<HostEventEntrySelection?> showHostEventEntrySheet({
  required BuildContext context,
  required HostEventEntryState state,
  Future<void> Function(EventDraft)? onDeleteDraft,
}) {
  assert(state.hasOrganizer, 'Event entry requires an organizer.');
  return showCatchBottomSheet<HostEventEntrySelection>(
    context: context,
    builder: (sheetContext) => Consumer(
      builder: (context, ref, _) => HostEventEntrySheet(
        state: state,
        onDeleteDraft:
            onDeleteDraft ??
            (draft) async {
              await CreateEventDraftController.deleteDraftMutation.run(ref, (
                tx,
              ) {
                return tx
                    .get(createEventDraftControllerProvider.notifier)
                    .deleteDraft(clubId: draft.clubId, draftId: draft.id);
              });
              ref.invalidate(
                organizerEventDraftsProvider(clubId: draft.clubId),
              );
            },
      ),
    ),
  );
}

class HostEventEntrySheet extends StatefulWidget {
  const HostEventEntrySheet({
    super.key,
    required this.state,
    this.onDeleteDraft,
  });

  final HostEventEntryState state;
  final Future<void> Function(EventDraft)? onDeleteDraft;

  /// Drafts already materialized as saved events are reachable from the
  /// events timeline instead of the entry sheet.

  @override
  State<HostEventEntrySheet> createState() => _HostEventEntrySheetState();
}

enum _HostCreateEntryTab { event, program }

class _HostEventEntrySheetState extends State<HostEventEntrySheet> {
  _HostCreateEntryTab _tab = _HostCreateEntryTab.event;
  late final List<EventDraft> _drafts = List.of(
    widget.state.drafts.where(
      (draft) => draft.eventCreateReceiptEventId == null,
    ),
  );
  String? _deletingDraftId;

  Future<void> _deleteDraft(EventDraft draft) async {
    final confirmed = await showDraftDeleteConfirmationDialog(
      context: context,
      draft: draft,
    );
    if (confirmed != true || !mounted) return;
    setState(() => _deletingDraftId = draft.id);
    try {
      await widget.onDeleteDraft!(draft);
      if (mounted) setState(() => _drafts.removeWhere((d) => d.id == draft.id));
    } catch (error) {
      if (mounted) {
        showCatchNoticeError(context, error);
      }
    } finally {
      if (mounted) setState(() => _deletingDraftId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return CatchSheet.standard(
      key: const ValueKey<String>('host-event-entry-sheet'),
      title: context.l10n.programsEntryTitle,
      child: CatchSectionList(
        emptyStateOmitted: true,
        mainAxisSize: MainAxisSize.min,
        children: [
          CatchPageTabBar<_HostCreateEntryTab>(
            groupKey: const ValueKey('host-create-entry-tabs'),
            selected: _tab,
            options: [
              CatchOption(
                value: _HostCreateEntryTab.event,
                label: context.l10n.programsEntryEventTab,
              ),
              CatchOption(
                value: _HostCreateEntryTab.program,
                label: context.l10n.programsEntryProgramTab,
              ),
            ],
            onChanged: (tab) => setState(() => _tab = tab),
          ),
          if (_tab == _HostCreateEntryTab.event &&
              (_drafts.isNotEmpty || widget.state.repeatSource != null))
            CatchSection.fieldRows(
              first: true,
              title:
                  context.l10n.hostsHostEventEntrySheetSectionContinueExisting,
              children: [
                for (final draft in _drafts)
                  DraftCard(
                    draft: draft,
                    titleOverride: draft.eventCreateReceiptEventId == null
                        ? null
                        : context.l10n.hostsPrivateEventContinueSaved,
                    bodyOverride: draft.eventCreateReceiptEventId == null
                        ? null
                        : draft.summary,
                    isDeleting: _deletingDraftId == draft.id,
                    onSelect: () => Navigator.of(
                      context,
                    ).pop(HostEventEntrySelection.resume(draft)),
                    onDelete: widget.onDeleteDraft == null
                        ? null
                        : () => _deleteDraft(draft),
                  ),
                for (final intent in widget.state.continueIntents.where(
                  (intent) => intent != HostEventEntryIntent.resumeDraft,
                ))
                  _HostEventEntryRow(
                    intent: intent,
                    state: widget.state,
                    onTap: () => Navigator.of(
                      context,
                    ).pop(HostEventEntrySelection.start(intent)),
                  ),
              ],
            ),
          CatchSection.fieldRows(
            first: true,
            title: context.l10n.hostsHostEventEntrySheetSectionStartNew,
            children: [
              for (final intent in widget.state.startIntents.where(
                (intent) => _tab == _HostCreateEntryTab.event
                    ? intent == HostEventEntryIntent.createEvent
                    : intent == HostEventEntryIntent.createProgram,
              ))
                _HostEventEntryRow(
                  intent: intent,
                  state: widget.state,
                  onTap: () => Navigator.of(
                    context,
                  ).pop(HostEventEntrySelection.start(intent)),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HostEventEntryRow extends StatelessWidget {
  const _HostEventEntryRow({
    required this.intent,
    required this.state,
    required this.onTap,
  });

  final HostEventEntryIntent intent;
  final HostEventEntryState state;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return CatchFieldLanes.single(
      child: CatchField.action(
        copy: catchFieldCopy(context.l10n),
        key: ValueKey<String>('host-event-entry-${intent.name}'),
        title: _title(context),
        body: _body(context),
        bodyMaxLines: intent == HostEventEntryIntent.createEvent ? 3 : 2,
        icon: _icon,
        emphasis: CatchFieldEmphasis.title,
        onTap: onTap,
      ),
    );
  }

  String _title(BuildContext context) => switch (intent) {
    HostEventEntryIntent.resumeDraft =>
      context.l10n.hostsHostEventEntrySheetTitleContinueDraft,
    HostEventEntryIntent.repeatLastEvent =>
      context.l10n.hostsHostEventEntrySheetTitleRepeatLastEvent,
    HostEventEntryIntent.createEvent =>
      context.l10n.hostsHostEventsListLabelNewEvent,
    HostEventEntryIntent.resumePrivateEvent =>
      context.l10n.hostsPrivateEventContinueSaved,
    HostEventEntryIntent.createProgram => context.l10n.programsListCreateLabel,
  };

  String _body(BuildContext context) => switch (intent) {
    HostEventEntryIntent.resumeDraft when state.hasMultipleDrafts =>
      context.l10n.hostsHostEventEntrySheetBodySavedDraftCount(
        count: state.drafts.length,
      ),
    HostEventEntryIntent.resumeDraft => state.mostRecentDraft?.summary ?? '',
    HostEventEntryIntent.repeatLastEvent =>
      context.l10n.hostsHostEventEntrySheetBodyReuseEventSetup(
        eventTitle: state.repeatSource?.title ?? '',
      ),
    HostEventEntryIntent.createEvent => context.l10n.hostsPrivateEventEntryBody,
    HostEventEntryIntent.resumePrivateEvent => '',
    HostEventEntryIntent.createProgram => context.l10n.programsEntryProgramBody,
  };

  IconData get _icon => switch (intent) {
    HostEventEntryIntent.resumeDraft => CatchIcons.note,
    HostEventEntryIntent.repeatLastEvent => CatchIcons.refresh,
    HostEventEntryIntent.createEvent => CatchIcons.eventConfirmed,
    HostEventEntryIntent.resumePrivateEvent => CatchIcons.note,
    HostEventEntryIntent.createProgram => CatchIcons.date,
  };
}
