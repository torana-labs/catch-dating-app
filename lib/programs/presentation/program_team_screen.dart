import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_dating_app/programs/presentation/program_workspace_controller.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Program team roster — active staff grants with their duty scopes, plus
/// grant/invite/revoke actions. Duty sets are program-wide in W1 (empty
/// resource scopes); per-station/hotel/function scoping lands with the
/// assignment picker surfaces.
class ProgramTeamScreen extends ConsumerWidget {
  const ProgramTeamScreen({super.key, required this.programId});

  final String programId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final staffAsync = ref.watch(programStaffListProvider(programId));
    return CatchAsyncBoundary<ProgramStaffList>(
      retainDataOn: const {},
      value: staffAsync,
      onRetry: () => ref.invalidate(programStaffListProvider(programId)),
      loadingBuilder: (_) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsTeamTitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: const CatchRouteBody.standardViewport(
          child: CatchStateViewport.loading(accountForBottomOverlay: false),
        ),
      ),
      errorBuilder: (_, error, _, onBoundaryRetry) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsTeamTitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchLocalizedErrorState(
            error,
            context: AppErrorContext.event,
            onRetry: onBoundaryRetry,
          ),
        ),
      ),
      builder: (context, staff) =>
          ProgramTeamPageBody(programId: programId, staff: staff),
    );
  }
}

class ProgramTeamPageBody extends ConsumerStatefulWidget {
  const ProgramTeamPageBody({
    super.key,
    required this.programId,
    required this.staff,
  });

  final String programId;
  final ProgramStaffList staff;

  @override
  ConsumerState<ProgramTeamPageBody> createState() =>
      _ProgramTeamPageBodyState();
}

class _ProgramTeamPageBodyState extends ConsumerState<ProgramTeamPageBody> {
  Object? _mutationError;
  bool _pending = false;

  String _dutyLabel(ProgramStaffDuty duty) {
    if (duty == ProgramStaffDuty.programAdmin) {
      return context.l10n.programsTeamProgramAdmin;
    }
    // camelCase enum names → sentence-case labels for the roster.
    final words = duty.name.replaceAllMapped(
      RegExp('([a-z])([A-Z])'),
      (m) => '${m[1]} ${m[2]}'.toLowerCase(),
    );
    return words[0].toUpperCase() + words.substring(1);
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _pending = true;
      _mutationError = null;
    });
    try {
      // provider-graph: ownership-widget-async-callback:_ProgramTeamPageBodyState._run:await:action planned CAT156 -- Owns pending/mutation error around a Future callback whose callers delegate invite/grant commands to ProgramWorkspaceController. Delegate lifecycle without weakening access checks.
      await action();
      ref.invalidate(programStaffListProvider(widget.programId));
    } catch (error) {
      if (mounted) setState(() => _mutationError = error);
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  Future<void> _grantOrInvite({required bool invite}) async {
    final draft = await showDialog<_StaffDraft>(
      context: context,
      builder: (_) => ProgramStaffAccessDialog(invite: invite),
    );
    if (draft == null || !mounted) return;
    await _run(() async {
      final actions = ref.read(programWorkspaceControllerProvider.notifier);
      if (invite) {
        await actions.inviteStaff(
          programId: widget.programId,
          phoneNumber: draft.phone,
          displayName: draft.displayName ?? '',
          duties: draft.duties,
          expiresAt: draft.expiresAt,
        );
      } else {
        await actions.grantStaff(
          programId: widget.programId,
          phoneNumber: draft.phone,
          duties: draft.duties,
          expiresAt: draft.expiresAt,
        );
      }
    });
  }

  Future<void> _revoke(ProgramStaffMember member) async {
    final confirmed = await showCatchConfirmDialog(
      copy: catchDialogCopy(context.l10n),
      context: context,
      title: context.l10n.programsTeamRevokeTitle,
      message: context.l10n.programsTeamRevokeMessage(name: member.displayName),
      confirmLabel: context.l10n.programsTeamRevoke,
      danger: true,
    );
    if (confirmed != true || !mounted) return;
    await _run(
      () => ref
          .read(programWorkspaceControllerProvider.notifier)
          .revokeStaff(programId: widget.programId, member: member),
    );
  }

  @override
  Widget build(BuildContext context) => CatchRouteScaffold(
    topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
      title: context.l10n.programsTeamTitle,
      emphasis: scrolledUnder
          ? CatchTopBarEmphasis.divided
          : CatchTopBarEmphasis.plain,
      navigation: const CatchTopBarNavigation(
        mode: CatchTopBarNavigationMode.back,
      ),
    ),
    body: CatchRouteBody.standardSections(
      sections: [
        if (_mutationError != null)
          CatchSectionListItem(
            child: CatchBanner(
              title: context.l10n.programsGuestsMutationFailed,
              message: appErrorMessage(
                _mutationError!,
                l10n: context.l10n,
                context: AppErrorContext.event,
              ),
              icon: CatchIcons.info,
              tone: CatchBannerTone.danger,
            ),
          ),
        CatchSectionListItem(
          child: CatchSection.contained(
            title: context.l10n.programsTeamTitle,
            subtitle: context.l10n.programsTeamSubtitle,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Wrap(
                  spacing: CatchSpacing.s2,
                  runSpacing: CatchSpacing.s2,
                  children: [
                    CatchButton(
                      label: context.l10n.programsTeamGrant,
                      leading: Icon(CatchIcons.checkIn, size: CatchIconSize.md),
                      variant: CatchButtonVariant.secondary,
                      size: CatchButtonSize.md,
                      onPressed: _pending
                          ? null
                          : () => _grantOrInvite(invite: false),
                    ),
                    CatchButton(
                      label: context.l10n.programsTeamInvite,
                      leading: Icon(CatchIcons.send, size: CatchIconSize.md),
                      variant: CatchButtonVariant.secondary,
                      size: CatchButtonSize.md,
                      onPressed: _pending
                          ? null
                          : () => _grantOrInvite(invite: true),
                    ),
                  ],
                ),
                const SizedBox(height: CatchSpacing.s3),
                if (widget.staff.members.isEmpty)
                  CatchEmptyState(
                    icon: CatchIcons.work,
                    title: context.l10n.programsTeamEmptyTitle,
                    message: context.l10n.programsTeamEmptyMessage,
                  )
                else
                  for (final member in widget.staff.members)
                    CatchFieldRow.standard(
                      leading: Icon(CatchIcons.person),
                      body: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CatchText(
                            member.displayName.isEmpty
                                ? '•••${member.phoneLastFour}'
                                : member.displayName,
                            variant: CatchTextVariant.sectionTitle,
                          ),
                          const SizedBox(height: CatchSpacing.s1),
                          Wrap(
                            spacing: CatchSpacing.s1,
                            runSpacing: CatchSpacing.s1,
                            children: [
                              CatchBadge(
                                label:
                                    member.status ==
                                        ProgramStaffStatus.approvalRequired
                                    ? context.l10n.programsTeamApprovalRequired
                                    : member.status.name,
                                tone: switch (member.status) {
                                  ProgramStaffStatus.active =>
                                    CatchBadgeTone.success,
                                  ProgramStaffStatus.expired =>
                                    CatchBadgeTone.warning,
                                  ProgramStaffStatus.approvalRequired =>
                                    CatchBadgeTone.warning,
                                  ProgramStaffStatus.revoked =>
                                    CatchBadgeTone.danger,
                                },
                              ),
                              for (final duty in member.duties)
                                CatchBadge(label: _dutyLabel(duty.duty)),
                              CatchBadge(
                                label: context.l10n.programsTeamExpires(
                                  date: AppTimeFormatters.dateTime(
                                    member.expiresAt,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      trailing: member.status == ProgramStaffStatus.revoked
                          ? null
                          : CatchIconAction.icon(
                              icon: CatchIcons.block,
                              variant: CatchIconActionVariant.plain,
                              accent: CatchTokens.of(context).danger,
                              tooltip: context.l10n.programsTeamRevoke,
                              status: _pending
                                  ? CatchIconActionStatus.disabled
                                  : CatchIconActionStatus.enabled,
                              onPressed: _pending
                                  ? null
                                  : () => _revoke(member),
                            ),
                    ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}

class _StaffDraft {
  const _StaffDraft({
    required this.phone,
    required this.duties,
    required this.expiresAt,
    this.displayName,
  });

  final String phone;
  final String? displayName;
  final List<ProgramDutyAssignment> duties;
  final DateTime expiresAt;
}

class ProgramStaffAccessDialog extends StatefulWidget {
  const ProgramStaffAccessDialog({super.key, required this.invite});

  final bool invite;

  @override
  State<ProgramStaffAccessDialog> createState() =>
      _ProgramStaffAccessDialogState();
}

class _ProgramStaffAccessDialogState extends State<ProgramStaffAccessDialog> {
  final _phoneController = TextEditingController();
  final _nameController = TextEditingController();
  final Set<ProgramStaffDuty> _duties = {};
  DateTime? _expiresAt;

  @override
  void dispose() {
    _phoneController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _pickExpiry() async {
    final now = DateTime.now();
    final picked = await showCatchDatePicker(
      copy: catchDatePickerCopy(context.l10n),
      context: context,
      initialDate: _expiresAt ?? now.add(const Duration(days: 14)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 14)),
    );
    if (picked != null && mounted) {
      setState(() => _expiresAt = picked);
    }
  }

  void _submit() {
    final phone = _phoneController.text.trim();
    final name = _nameController.text.trim();
    final expiresAt = _expiresAt;
    if (phone.isEmpty || _duties.isEmpty || expiresAt == null) return;
    if (widget.invite && name.isEmpty) return;
    Navigator.of(context).pop(
      _StaffDraft(
        phone: phone,
        displayName: name.isEmpty ? null : name,
        duties: [
          for (final duty in _duties)
            ProgramDutyAssignment(
              duty: duty,
              pickupPointIds: const {},
              hotelIds: const {},
              functionIds: const {},
              expiresAt: expiresAt,
            ),
        ],
        expiresAt: expiresAt,
      ),
    );
  }

  @override
  Widget build(BuildContext context) => CatchDialog<void>(
    title: widget.invite
        ? context.l10n.programsTeamInvite
        : context.l10n.programsTeamGrant,
    actions: [
      CatchButton(
        label: context.l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
        variant: CatchButtonVariant.secondary,
        onPressed: () => Navigator.of(context).pop(),
      ),
      CatchButton(
        label: context.l10n.programsWorkspaceFunctionSave,
        onPressed: _submit,
      ),
    ],
    child: CatchSection.containedFieldRows(
      children: [
        if (widget.invite)
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.programsTeamNameLabel,
            controller: _nameController,
            contract: CatchContractConstraints
                .inviteProgramStaffCallablePayloadDisplayName,
            textCapitalization: TextCapitalization.words,
          ),
        CatchField.input(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.programsTeamPhoneLabel,
          controller: _phoneController,
          contract: CatchContractConstraints
              .grantProgramStaffCallablePayloadPhoneNumber,
          keyboardType: TextInputType.phone,
          inputHint: '+14155552671',
        ),
        CatchFieldRow.standard(
          leading: Icon(CatchIcons.date),
          body: CatchText(
            _expiresAt == null
                ? context.l10n.programsTeamExpiryLabel
                : AppTimeFormatters.shortDate(_expiresAt!),
            variant: CatchTextVariant.bodyM,
          ),
          trailing: Icon(CatchIcons.disclosure),
          onTap: _pickExpiry,
        ),
        gapH8,
        CatchText(
          context.l10n.programsTeamDutiesLabel,
          variant: CatchTextVariant.statusLabel,
        ),
        for (final duty in ProgramStaffDuty.values)
          CatchFieldRow.standard(
            body: CatchText(
              duty == ProgramStaffDuty.programAdmin
                  ? context.l10n.programsTeamProgramAdmin
                  : duty.name.replaceAllMapped(
                      RegExp('([a-z])([A-Z])'),
                      (m) => '${m[1]} ${m[2]}'.toLowerCase(),
                    ),
              variant: CatchTextVariant.bodyM,
            ),
            trailing: _duties.contains(duty)
                ? Icon(CatchIcons.check, size: CatchIconSize.md)
                : null,
            onTap: () => setState(
              () => _duties.contains(duty)
                  ? _duties.remove(duty)
                  : _duties.add(duty),
            ),
          ),
      ],
    ),
  );
}
