part of '../event_success_companion_screen.dart';

@immutable
class WingmanRequestActionState {
  const WingmanRequestActionState({this.isSaving = false});

  final bool isSaving;
}

class WingmanRequestSection extends StatefulWidget {
  const WingmanRequestSection({
    super.key,
    required this.event,
    required this.candidates,
    required this.actionState,
    required this.onSaveRequest,
    required this.onWithdrawRequest,
    this.existingRequest,
  });

  final Event event;
  final List<PublicProfile> candidates;
  final WingmanRequestActionState actionState;
  final Future<void> Function(PublicProfile target, String note) onSaveRequest;
  final Future<void> Function() onWithdrawRequest;
  final EventSuccessWingmanRequest? existingRequest;

  @override
  State<WingmanRequestSection> createState() => _WingmanRequestSectionState();
}

class _WingmanRequestSectionState extends State<WingmanRequestSection> {
  late final TextEditingController _noteController = TextEditingController(
    text: widget.existingRequest?.isActive == true
        ? widget.existingRequest?.note ?? ''
        : '',
  );
  String? _optimisticTargetUid;
  String? _savingTargetUid;
  bool _withdrawing = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final saving = widget.actionState.isSaving || _savingTargetUid != null;
    final withdrawing = widget.actionState.isSaving || _withdrawing;
    final activeRequest = widget.existingRequest?.isActive == true
        ? widget.existingRequest
        : null;
    final requestedTargetUid = _optimisticTargetUid ?? activeRequest?.targetUid;
    final requestedTargetName = requestedTargetUid == null
        ? null
        : _profileNameForUid(widget.candidates, requestedTargetUid);

    final t = CatchTokens.of(context);
    return CompanionStageSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: CatchText(
                  context
                      .l10n
                      .eventSuccessEventSuccessCompanionWingmanTextAskTheHostFor,
                  variant: CatchTextVariant.titleL,
                ),
              ),
              CatchPrivacyBadge(
                copy: catchPrivacyBadgeCopy(context.l10n),
                variant: CatchPrivacyBadgeVariant.hostCanSee,
              ),
            ],
          ),
          gapH4,
          CatchText(
            context
                .l10n
                .eventSuccessEventSuccessCompanionWingmanTextTellTheHostWho,
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
          if (requestedTargetUid != null) ...[
            gapH12,
            CompanionStageBanner(
              child: Row(
                children: [
                  Expanded(
                    child: CatchText(
                      context.l10n
                          .eventSuccessEventSuccessCompanionWingmanTextRequestSentForValue1(
                            value1:
                                requestedTargetName ??
                                context
                                    .l10n
                                    .eventSuccessEventSuccessCompanionWingmanTextThisAttendee,
                          ),
                      variant: CatchTextVariant.supporting,
                    ),
                  ),
                  gapW8,
                  CatchButton(
                    label: context
                        .l10n
                        .eventSuccessEventSuccessCompanionWingmanLabelWithdraw,
                    size: CatchButtonSize.sm,
                    variant: CatchButtonVariant.secondary,
                    status: (withdrawing)
                        ? CatchButtonStatus.loading
                        : CatchButtonStatus.idle,
                    onPressed: withdrawing ? null : _withdrawRequest,
                  ),
                ],
              ),
            ),
          ],
          gapH12,
          CompanionStageBanner(
            child: CatchFieldLanes.single(
              child: CatchField.input(
                copy: catchFieldCopy(context.l10n),
                title: context
                    .l10n
                    .eventSuccessEventSuccessCompanionWingmanTitlePrivateNoteToHost,
                contract: CatchContractConstraints
                    .eventSuccessWingmanRequestDocumentNote,
                controller: _noteController,
                maxLines: 2,
              ),
            ),
          ),
          gapH12,
          if (widget.candidates.isEmpty)
            CatchText(
              context
                  .l10n
                  .eventSuccessEventSuccessCompanionWingmanTextNoCheckedInAttendees,
              variant: CatchTextVariant.supporting,
            )
          else
            CatchSection.containedRows(
              children: [
                for (final candidate in widget.candidates)
                  CatchField.read(
                    secondaryAction: CatchFieldSecondaryAction.button(
                      label: candidate.uid == requestedTargetUid
                          ? context
                                .l10n
                                .eventSuccessEventSuccessCompanionWingmanLabelRequested
                          : requestedTargetUid == null
                          ? context
                                .l10n
                                .eventSuccessEventSuccessCompanionWingmanLabelAskHost
                          : context
                                .l10n
                                .eventSuccessEventSuccessCompanionWingmanLabelSwitch,
                      onActivate: saving || candidate.uid == requestedTargetUid
                          ? null
                          : () => _saveRequest(candidate),
                      loading:
                          ((saving && candidate.uid != requestedTargetUid)
                              ? CatchButtonStatus.loading
                              : CatchButtonStatus.idle) ==
                          CatchButtonStatus.loading,
                    ),
                    content: CatchPersonLayout(
                      name: candidate.name,
                      imageUrl: candidate.primaryPhotoThumbnailUrl,
                      supportingText: candidate.uid == requestedTargetUid
                          ? context
                                .l10n
                                .eventSuccessEventSuccessCompanionWingmanVisiblecopyHostHelpRequestActive
                          : context
                                .l10n
                                .eventSuccessEventSuccessCompanionWingmanVisiblecopyCheckedInToThis,
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }

  Future<void> _saveRequest(PublicProfile candidate) async {
    setState(() => _savingTargetUid = candidate.uid);
    try {
      await widget.onSaveRequest(candidate, _noteController.text);
      if (!mounted) return;
      setState(() => _optimisticTargetUid = candidate.uid);
    } finally {
      if (mounted) setState(() => _savingTargetUid = null);
    }
  }

  Future<void> _withdrawRequest() async {
    setState(() => _withdrawing = true);
    try {
      await widget.onWithdrawRequest();
      if (!mounted) return;
      setState(() => _optimisticTargetUid = null);
    } finally {
      if (mounted) setState(() => _withdrawing = false);
    }
  }
}

String? _profileNameForUid(List<PublicProfile> profiles, String uid) {
  for (final profile in profiles) {
    if (profile.uid == uid) return profile.name;
  }
  return null;
}
