import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/hosts/data/forms/host_offer_event_targets_gateway.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Draft-only binding for reusable intake or one specifically selected event.
class HostFormTargetSection extends ConsumerStatefulWidget {
  const HostFormTargetSection({
    super.key,
    required this.organizerId,
    required this.definition,
    required this.notifier,
    required this.accountId,
    required this.enableEventTargetSettings,
    required this.hasPublishedVersion,
  });

  final String organizerId;
  final HostFormDefinition definition;
  final HostFormEditorController notifier;
  final String accountId;
  final bool enableEventTargetSettings;
  final bool hasPublishedVersion;

  @override
  ConsumerState<HostFormTargetSection> createState() =>
      _HostFormTargetSectionState();
}

class _HostFormTargetSectionState extends ConsumerState<HostFormTargetSection> {
  HostFormTargetController? _targets;
  bool _showEventChoices = false;

  HostFormDefinition get definition => widget.definition;
  HostFormEditorController get notifier => widget.notifier;
  String get organizerId => widget.organizerId;

  String? _currentAccountId() {
    final uidState = catchAsyncStateFromAsyncValue(ref.read(uidProvider));
    if (!uidState.isSettledData) return null;
    final uid = uidState.value;
    return uid != null && ref.read(firebaseAuthProvider).currentUser?.uid == uid
        ? uid
        : null;
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  void _bindTargetController() {
    _targets
      ?..removeListener(_changed)
      ..dispose();
    _targets = null;
    _showEventChoices = false;
    final accountId = widget.accountId;
    if (!widget.enableEventTargetSettings) return;
    final controller = HostFormTargetController(
      organizerId: organizerId,
      accountId: accountId,
      loadPage: ({required organizerId, cursor}) =>
          notifier.listTargetEvents(cursor: cursor),
      currentAccountId: _currentAccountId,
    )..addListener(_changed);
    _targets = controller;
  }

  @override
  void initState() {
    super.initState();
    _bindTargetController();
  }

  @override
  void didUpdateWidget(covariant HostFormTargetSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.organizerId != organizerId ||
        oldWidget.accountId != widget.accountId ||
        oldWidget.notifier != notifier ||
        oldWidget.enableEventTargetSettings !=
            widget.enableEventTargetSettings) {
      _bindTargetController();
    }
  }

  @override
  void dispose() {
    _targets
      ?..removeListener(_changed)
      ..dispose();
    super.dispose();
  }

  void _chooseKind(HostFormTargetKind kind) {
    final accountId = widget.accountId;
    final targets = _targets;
    if (targets == null || !targets.isCurrentAccount) {
      return;
    }
    if (kind == HostFormTargetKind.organizer) {
      notifier.updateTarget(kind: kind, accountId: accountId);
      setState(() => _showEventChoices = false);
    } else if (kind == HostFormTargetKind.event) {
      setState(() => _showEventChoices = true);
      if (!targets.loaded && !targets.loading) {
        targets.refresh();
      }
    }
  }

  void _chooseEvent(HostOfferEventTarget event) {
    final accountId = widget.accountId;
    final targets = _targets;
    if (targets == null ||
        !targets.isCurrentAccount ||
        targets.event(event.eventId) != event) {
      return;
    }
    notifier.updateTarget(
      kind: HostFormTargetKind.event,
      eventId: event.eventId,
      accountId: accountId,
    );
    setState(() => _showEventChoices = false);
  }

  @override
  Widget build(BuildContext context) {
    final accountId = widget.accountId;
    final targets = _targets;
    final uidState = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final targetVisible =
        widget.enableEventTargetSettings &&
        uidState.isSettledData &&
        uidState.value == accountId &&
        ref.watch(firebaseAuthProvider).currentUser?.uid == accountId &&
        targets?.isCurrentAccount == true;
    if (!targetVisible) return const SizedBox.shrink();
    if (definition.defaultTargetKind == HostFormTargetKind.event &&
        targets != null &&
        !targets.loaded &&
        !targets.loading &&
        !targets.hasLoadFailure) {
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
    final currentEventId = definition.defaultTargetId;
    final currentEvent = currentEventId == null
        ? null
        : targets?.event(currentEventId);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchSection.fieldRows(
          title: context.l10n.hostFormTargetTitle,
          footer: widget.hasPublishedVersion
              ? CatchText(
                  context.l10n.hostFormTargetPublishedNotice,
                  variant: CatchTextVariant.supporting,
                )
              : null,
          children: [
            if (definition.defaultTargetKind == HostFormTargetKind.campaign)
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostFormTargetTitle,
                body: currentEventId ?? context.l10n.hostFormTargetUnavailable,
              )
            else
              CatchField<HostFormTargetKind>.select(
                copy: catchFieldCopy(context.l10n),
                key: const ValueKey('host-form-target-kind'),
                title: context.l10n.hostFormTargetTitle,
                contractExemption:
                    'The versioned form definition validates its exact target.',
                values: const [
                  HostFormTargetKind.organizer,
                  HostFormTargetKind.event,
                ],
                value: definition.defaultTargetKind,
                itemLabelBuilder: (kind) => kind == HostFormTargetKind.organizer
                    ? context.l10n.hostFormTargetReusable
                    : context.l10n.hostFormTargetEvent,
                onChanged: (kind) {
                  if (kind != null) _chooseKind(kind);
                },
              ),
            if (definition.defaultTargetKind == HostFormTargetKind.event &&
                currentEventId != null) ...[
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                key: const ValueKey('host-form-target-current'),
                title: context.l10n.hostFormTargetEvent,
                body: currentEvent?.name?.trim().isNotEmpty == true
                    ? currentEvent!.name!
                    : currentEventId,
              ),
              if (targets!.bindingUnavailable(currentEventId))
                CatchField.read(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostFormTargetSelectEvent,
                  body: context.l10n.hostFormTargetUnavailable,
                  bodyMaxLines: 4,
                ),
            ],
            if (definition.defaultTargetKind != HostFormTargetKind.campaign)
              CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                key: const ValueKey('host-form-target-choose-event'),
                title: context.l10n.hostFormTargetSelectEvent,
                icon: CatchIcons.eventAvailableOutlined,
                onTap: () => _chooseKind(HostFormTargetKind.event),
              ),
            if (_showEventChoices && targets != null) ...[
              if (targets.loading && targets.events.isEmpty)
                CatchField.read(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostFormTargetSelectEvent,
                  body: context.l10n.hostResponseQueryLoading,
                ),
              if (targets.hasLoadFailure) ...[
                CatchField.read(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostFormTargetSelectEvent,
                  body: context.l10n.hostFormTargetLoadFailed,
                ),
                CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.sharedActionTryAgain,
                  icon: CatchIcons.refreshRounded,
                  onTap: () => targets.canLoadMore
                      ? targets.loadMore()
                      : targets.refresh(),
                ),
              ],
              if (targets.loaded &&
                  targets.events.isEmpty &&
                  !targets.hasLoadFailure)
                CatchField.read(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostFormTargetSelectEvent,
                  body: context.l10n.hostFormTargetNoUpcomingEvents,
                ),
              for (final event in targets.events)
                CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  key: ValueKey('host-form-target-event-${event.eventId}'),
                  title: event.name?.trim().isNotEmpty == true
                      ? event.name!
                      : context.l10n.hostEventOfferUntitledEvent,
                  body: AppTimeFormatters.dateTime(event.startTime.toLocal()),
                  icon: CatchIcons.eventAvailableOutlined,
                  onTap: () => _chooseEvent(event),
                ),
              if (targets.canLoadMore && !targets.hasLoadFailure)
                CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostEventOfferLoadMoreEvents,
                  icon: CatchIcons.addRounded,
                  onTap: targets.loadMore,
                ),
            ],
          ],
        ),
        gapH24,
      ],
    );
  }
}
