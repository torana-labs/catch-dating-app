import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_commands.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_setup_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_setup_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_vendor_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// A hotel (RbProgHotelSetup), pickup point (RbProgPickupSetup) or car
/// vendor (RbProgVendorSetup) form.
///
/// Save runs `upsertProgramHotel`, `upsertProgramPickupPoint` (both fenced
/// by the record revision when editing) or `upsertTransportVendor` (a new
/// vendor bound to this programme), then goes back.
class HostProgrammeSetupScreen extends ConsumerStatefulWidget {
  const HostProgrammeSetupScreen({
    super.key,
    required this.programId,
    required this.kind,
    this.id,
  });

  final String programId;
  final HostProgrammeSetupKind kind;

  /// The hotel or pickup point being edited; null adds one.
  final String? id;

  @override
  ConsumerState<HostProgrammeSetupScreen> createState() =>
      _HostProgrammeSetupScreenState();
}

class _HostProgrammeSetupScreenState
    extends ConsumerState<HostProgrammeSetupScreen> {
  HostProgrammeSetupDraft _draft = const HostProgrammeSetupDraft();
  int _revision = 0;
  bool _loaded = false;
  bool _saving = false;

  void _load(HostProgrammeState state) {
    if (_loaded || state.status != HostProgrammeStatus.ready) return;
    _loaded = true;
    final detail = state.detail!;
    final id = widget.id;
    if (id == null) return;
    switch (widget.kind) {
      case HostProgrammeSetupKind.hotel:
        final hotel = detail.hotels.where((h) => h.hotelId == id).firstOrNull;
        if (hotel == null) return;
        _draft = HostProgrammeSetupDraft(
          name: hotel.name,
          address: hotel.address ?? '',
          contact: hotel.receptionContact ?? '',
        );
      case HostProgrammeSetupKind.pickup:
        final point = detail.pickupPoints
            .where((p) => p.pickupPointId == id)
            .firstOrNull;
        if (point == null) return;
        _draft = HostProgrammeSetupDraft(
          name: point.label,
          pickupKind:
              HostProgrammePickupKind.values
                  .where((kind) => kind.name == point.kind)
                  .firstOrNull ??
              HostProgrammePickupKind.other,
          code: point.iataCode ?? '',
          terminal: point.terminal ?? '',
          meetingZone: point.meetingZone ?? '',
          instructions: point.instructions ?? '',
        );
      case HostProgrammeSetupKind.vendor:
        return;
    }
    _revision++;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(hostProgrammeControllerProvider(widget.programId));
    _load(state);
    final program = state.program;
    final vendors =
        widget.kind == HostProgrammeSetupKind.vendor && program != null
        ? ref
                  .watch(
                    programTransportVendorsProvider(
                      program.organizerId,
                      widget.programId,
                    ),
                  )
                  .value ??
              const []
        : const <Never>[];
    final title = switch (widget.kind) {
      HostProgrammeSetupKind.hotel => l10n.hostProgrammeSetupHotel,
      HostProgrammeSetupKind.pickup => l10n.hostProgrammeSetupPickupTitle,
      HostProgrammeSetupKind.vendor => l10n.hostProgrammeSetupVendorTitle,
    };
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: ValueKey<String>('host-programme-setup-${widget.kind.name}'),
        bodyScrolls: false,
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostProgrammeBackToProgramme),
          kicker: program?.title,
          title: title,
          action: CatchTopBarAction(
            label: l10n.hostProgrammeSave,
            onPressed: _saving || !_draft.ready || program == null
                ? null
                : () => unawaited(_save(state)),
          ),
        ),
        body: state.status == HostProgrammeStatus.ready
            ? HostProgrammeSetupBody(
                kind: widget.kind,
                draft: _draft,
                revision: _revision,
                vendors: vendors,
                onChanged: (draft) => setState(() => _draft = draft),
              )
            : HostProgrammeStateBody(
                status: state.status,
                onRetry: () => refreshHostProgramme(ref, widget.programId),
              ),
      ),
    );
  }

  String? _text(String value) => value.trim().isEmpty ? null : value.trim();

  Future<void> _save(HostProgrammeState state) async {
    final detail = state.detail;
    if (detail == null) return;
    final draft = _draft;
    final id = widget.id;
    final programId = widget.programId;
    setState(() => _saving = true);
    final saved = await runHostProgrammeCommand(
      context,
      ref,
      programId: programId,
      reason: 'save programme ${widget.kind.name} setup',
      done: context.l10n.hostProgrammeSetupSaved,
      run: (controller) => switch (widget.kind) {
        HostProgrammeSetupKind.hotel => controller.upsertHotel(
          programId: programId,
          hotelId: id,
          expectedRevision: detail.hotels
              .where((h) => h.hotelId == id)
              .firstOrNull
              ?.revision,
          name: draft.name.trim(),
          address: _text(draft.address),
          receptionContact: _text(draft.contact),
        ),
        HostProgrammeSetupKind.pickup => controller.upsertPickupPoint(
          programId: programId,
          pickupPointId: id,
          expectedRevision: detail.pickupPoints
              .where((p) => p.pickupPointId == id)
              .firstOrNull
              ?.revision,
          kind: draft.pickupKind.name,
          label: draft.name.trim(),
          iataCode: draft.pickupKind == HostProgrammePickupKind.airport
              ? _text(draft.code)?.toUpperCase()
              : null,
          terminal: _text(draft.terminal),
          meetingZone: _text(draft.meetingZone),
          instructions: _text(draft.instructions),
        ),
        HostProgrammeSetupKind.vendor =>
          ref
              .read(hostProgrammeVendorCommandsProvider.notifier)
              .addVendor(
                organizerId: detail.program.organizerId,
                programId: programId,
                name: draft.name.trim(),
                contactName: _text(draft.contact),
                phoneE164: _text(draft.phone),
              ),
      },
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (saved) {
      if (widget.kind == HostProgrammeSetupKind.vendor) {
        ref.invalidate(
          programTransportVendorsProvider(
            detail.program.organizerId,
            programId,
          ),
        );
      }
      if (context.canPop()) context.pop();
    }
  }
}
