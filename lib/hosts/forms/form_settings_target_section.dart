import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Where the form is used: reusable for the organizer, or tied to one
/// upcoming event chosen from a paged list. A campaign form shows its
/// campaign and cannot be moved.
///
/// Reads the organizer's upcoming events through the editor's target list
/// and binds the draft through the editor's target command, only while the
/// signed-in account is still the one the editor is bound to.
class HostFormSettingsTargetSection extends ConsumerStatefulWidget {
  const HostFormSettingsTargetSection({
    super.key,
    required this.organizerId,
    required this.accountId,
    required this.definition,
    required this.editor,
    required this.hasPublishedVersion,
  });

  final String organizerId;
  final String accountId;
  final HostFormDefinition definition;
  final HostFormEditorController editor;

  /// A version is live; a new target applies from the next publish.
  final bool hasPublishedVersion;

  @override
  ConsumerState<HostFormSettingsTargetSection> createState() =>
      _HostFormSettingsTargetSectionState();
}

class _HostFormSettingsTargetSectionState
    extends ConsumerState<HostFormSettingsTargetSection> {
  HostFormTargetController? _targets;
  bool _choosing = false;

  @override
  void initState() {
    super.initState();
    _bind();
  }

  @override
  void didUpdateWidget(covariant HostFormSettingsTargetSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.organizerId != widget.organizerId ||
        oldWidget.accountId != widget.accountId ||
        oldWidget.editor != widget.editor) {
      _bind();
    }
  }

  @override
  void dispose() {
    _targets
      ?..removeListener(_changed)
      ..dispose();
    super.dispose();
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  String? _currentAccountId() {
    final uid = catchAsyncStateFromAsyncValue(ref.read(uidProvider));
    if (!uid.isSettledData) return null;
    final value = uid.value;
    return value != null &&
            ref.read(firebaseAuthProvider).currentUser?.uid == value
        ? value
        : null;
  }

  void _bind() {
    _targets
      ?..removeListener(_changed)
      ..dispose();
    _choosing = false;
    _targets = HostFormTargetController(
      organizerId: widget.organizerId,
      accountId: widget.accountId,
      loadPage: ({required organizerId, cursor}) =>
          widget.editor.listTargetEvents(cursor: cursor),
      currentAccountId: _currentAccountId,
    )..addListener(_changed);
  }

  void _reusable() {
    final targets = _targets;
    if (targets == null || !targets.isCurrentAccount) return;
    widget.editor.updateTarget(
      kind: HostFormTargetKind.organizer,
      accountId: widget.accountId,
    );
    setState(() => _choosing = false);
  }

  void _openEvents() {
    final targets = _targets;
    if (targets == null || !targets.isCurrentAccount) return;
    setState(() => _choosing = true);
    if (!targets.loaded && !targets.loading) targets.refresh();
  }

  void _chooseEvent(HostOfferEventTarget event) {
    final targets = _targets;
    if (targets == null ||
        !targets.isCurrentAccount ||
        targets.event(event.eventId) != event) {
      return;
    }
    widget.editor.updateTarget(
      kind: HostFormTargetKind.event,
      eventId: event.eventId,
      accountId: widget.accountId,
    );
    setState(() => _choosing = false);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final targets = _targets;
    final uid = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final visible =
        uid.isSettledData &&
        uid.value == widget.accountId &&
        ref.watch(firebaseAuthProvider).currentUser?.uid == widget.accountId &&
        targets?.isCurrentAccount == true;
    if (!visible || targets == null) return const SizedBox.shrink();
    final definition = widget.definition;
    final kind = definition.defaultTargetKind;
    final currentEventId = definition.defaultTargetId;
    if (kind == HostFormTargetKind.event &&
        !targets.loaded &&
        !targets.loading &&
        !targets.hasLoadFailure) {
      // Name the bound event once its page arrives.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted &&
            identical(_targets, targets) &&
            targets.isCurrentAccount &&
            !targets.loaded &&
            !targets.loading) {
          targets.refresh();
        }
      });
    }
    final currentEvent = currentEventId == null
        ? null
        : targets.event(currentEventId);
    return CatchSection(
      title: l10n.hostFormTargetTitle,
      dividers: CatchSectionPlacement.none,
      children: [
        if (widget.hasPublishedVersion)
          CatchText(
            l10n.hostFormTargetPublishedNotice,
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
        if (kind == HostFormTargetKind.campaign)
          CatchIndexRow(
            title: l10n.hostFormTargetTitle,
            subtitle: currentEventId ?? l10n.hostFormTargetUnavailable,
            onTap: null,
          )
        else ...[
          CatchChoiceTile(
            key: const ValueKey<String>('host-form-target-reusable'),
            variant: CatchChoiceTileVariant.row,
            title: l10n.hostFormTargetReusable,
            selected: kind == HostFormTargetKind.organizer,
            contractExemption:
                'The versioned form definition validates its exact target.',
            onTap: kind == HostFormTargetKind.organizer ? null : _reusable,
          ),
          CatchChoiceTile(
            key: const ValueKey<String>('host-form-target-event'),
            variant: CatchChoiceTileVariant.row,
            title: l10n.hostFormTargetEvent,
            subtitle: kind == HostFormTargetKind.event && currentEventId != null
                ? (currentEvent?.name?.trim().isNotEmpty ?? false)
                      ? currentEvent!.name!
                      : currentEventId
                : null,
            selected: kind == HostFormTargetKind.event,
            contractExemption:
                'The versioned form definition validates its exact target.',
            onTap: _openEvents,
          ),
          if (kind == HostFormTargetKind.event &&
              currentEventId != null &&
              targets.bindingUnavailable(currentEventId))
            CatchNotice.inline(
              body: l10n.hostFormTargetUnavailable,
              tone: CatchNoticeTone.warning,
            ),
          CatchIndexRow(
            key: const ValueKey<String>('host-form-target-choose-event'),
            title: l10n.hostFormTargetSelectEvent,
            icon: CatchIcons.eventConfirmed,
            chevron: true,
            onTap: _openEvents,
          ),
          if (_choosing)
            HostFormTargetEventList(
              targets: targets,
              definition: definition,
              onChoose: _chooseEvent,
            ),
        ],
      ],
    );
  }
}

/// The organizer's upcoming events to bind the form to, a page at a time,
/// with their loading, failed and empty states.
class HostFormTargetEventList extends StatelessWidget {
  const HostFormTargetEventList({
    super.key,
    required this.targets,
    required this.definition,
    required this.onChoose,
  });

  final HostFormTargetController targets;
  final HostFormDefinition definition;
  final ValueChanged<HostOfferEventTarget> onChoose;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchStack(
      gap: CatchStackGap.g8,
      children: [
        if (targets.loading && targets.events.isEmpty)
          const CatchLoadingIndicator(),
        if (targets.hasLoadFailure)
          CatchNotice.inline(
            body: l10n.hostFormTargetLoadFailed,
            tone: CatchNoticeTone.danger,
            action: CatchNoticeAction(
              label: l10n.sharedActionTryAgain,
              onPressed: targets.canLoadMore
                  ? targets.loadMore
                  : targets.refresh,
            ),
          ),
        if (targets.loaded && targets.events.isEmpty && !targets.hasLoadFailure)
          CatchText(
            l10n.hostFormTargetNoUpcomingEvents,
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
        for (final event in targets.events)
          CatchIndexRow(
            key: ValueKey<String>('host-form-target-event-${event.eventId}'),
            title: (event.name?.trim().isNotEmpty ?? false)
                ? event.name!
                : l10n.hostEventOfferUntitledEvent,
            subtitle: AppTimeFormatters.dateTime(event.startTime.toLocal()),
            selected:
                definition.defaultTargetKind == HostFormTargetKind.event &&
                definition.defaultTargetId == event.eventId,
            chevron: true,
            onTap: () => onChoose(event),
          ),
        if (targets.canLoadMore && !targets.hasLoadFailure)
          CatchButton(
            label: l10n.hostEventOfferLoadMoreEvents,
            variant: CatchButtonVariant.secondary,
            fullWidth: true,
            onPressed: targets.loadMore,
          ),
      ],
    );
  }
}
