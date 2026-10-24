part of 'host_form_response_detail_screen.dart';

final RegExp _hostResponsePhoneE164Pattern = RegExp(r'^\+[1-9][0-9]{7,14}$');

Uri? hostResponsePhoneUri(String? value) {
  final phone = value?.trim();
  if (phone == null || !_hostResponsePhoneE164Pattern.hasMatch(phone)) {
    return null;
  }
  return Uri.parse('tel:$phone');
}

Uri? hostResponseWhatsappUri({
  required String? value,
  required String? displayName,
  required AppLocalizations l10n,
}) {
  final phone = value?.trim();
  if (phone == null || !_hostResponsePhoneE164Pattern.hasMatch(phone)) {
    return null;
  }
  final name = displayName?.trim();
  final parameters = (name == null || name.isEmpty)
      ? null
      : <String, String>{
          'text': l10n.hostCustomersWhatsappDefaultMessage(name: name),
        };
  return Uri.https('wa.me', '/${phone.substring(1)}', parameters);
}

Uri? hostResponseSocialUri(String? value, String domain) {
  final uri = Uri.tryParse(value?.trim() ?? '');
  if (uri == null ||
      uri.scheme != 'https' ||
      (uri.host != domain && uri.host != 'www.$domain') ||
      uri.userInfo.isNotEmpty ||
      uri.hasPort) {
    return null;
  }
  return uri;
}

class HostResponseDetailSection extends ConsumerWidget {
  const HostResponseDetailSection({
    super.key,
    required this.value,
    required this.organizerId,
    required this.note,
    required this.busy,
    required this.saving,
    required this.onReview,
    required this.onOpenPerson,
    required this.onConvert,
    required this.onOpenAsset,
    required this.onContact,
    required this.onOpenPayment,
    this.onChooseEvent,
  });
  final VoidCallback? onChooseEvent;
  final HostResponseReviewDetail value;
  final String organizerId;
  final TextEditingController note;
  final bool busy;
  final bool saving;
  final Future<void> Function(
    HostApplicationDetail,
    HostApplicationReviewStatus,
  )
  onReview;
  final ValueChanged<String> onOpenPerson;
  final Future<void> Function(HostFormResponseDetail, HostFormConversionKind)
  onConvert;
  final Future<void> Function(HostFormAssetDownload) onOpenAsset;
  final Future<void> Function(Uri) onContact;
  final ValueChanged<HostFormPaymentRecord> onOpenPayment;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final response = value.response;
    final application = value.application;
    final sources = response == null
        ? catchAsyncStateFromAsyncValue(
            ref.watch(hostSavedAudienceFilterOptionsProvider(organizerId)),
          )
        : null;
    final formTitle =
        response?.response.formTitle ??
        (application == null
            ? ''
            : hostApplicationContextLabel(
                context,
                formId: application.formId,
                targetKind: application.targetKind,
                targetId: application.targetId,
                sources: sources?.value,
              ));
    final submitted =
        response?.response.submittedAt ?? application!.submittedAt;
    final origins =
        response?.answers.map((answer) => answer.origin).toSet() ?? {};
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(
          formTitle,
          variant: CatchTextVariant.sectionTitle,
          color: CatchTokens.of(context).ink,
        ),
        gapH8,
        CatchText(
          AppTimeFormatters.dateTime(submitted),
          variant: CatchTextVariant.supporting,
        ),
        gapH8,
        Align(
          alignment: Alignment.centerLeft,
          child: CatchBadge(
            label: application == null
                ? value.withdrawn
                      ? context.l10n.hostFormResponsesWithdrawn
                      : context.l10n.hostFormResponsesSubmitted
                : hostApplicationStatusLabel(context, application.reviewStatus),
            tone: application == null
                ? CatchBadgeTone.neutral
                : hostApplicationStatusTone(application.reviewStatus),
          ),
        ),
        if (sources?.isTerminalError == true && response == null)
          CatchButton.command(
            label: context.l10n.hostAudienceRetrySourceNames,
            onPressed: () => ref.invalidate(
              hostSavedAudienceFilterOptionsProvider(organizerId),
            ),
          ),
        if (!value.revoked) ...[
          gapH24,
          Semantics(
            label: context.l10n.hostResponseContactDetails,
            child: HostResponseContactSection(
              value: value,
              onContact: onContact,
            ),
          ),
          if (value.contactId != null ||
              (onChooseEvent != null &&
                  value.canChooseEvent &&
                  !value.canOfferEvent))
            CatchFieldLanes.divided(
              children: [
                if (onChooseEvent != null &&
                    value.canChooseEvent &&
                    !value.canOfferEvent)
                  CatchField.nav(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostResponseOfferEvent,
                    emphasis: CatchFieldEmphasis.title,
                    body: value.application != null
                        ? context.l10n.hostResponseChooseBeforeAcceptance
                        : null,
                    bodyMaxLines: 3,
                    onTap: busy ? null : onChooseEvent,
                  ),
                if (value.contactId != null)
                  CatchField.nav(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostApplicationOpenPerson,
                    onTap: busy ? null : () => onOpenPerson(value.contactId!),
                  ),
              ],
            ),
        ],
        if (response?.payment case final payment? when !value.revoked) ...[
          gapH24,
          CatchSection.fieldRows(
            children: [
              CatchField.nav(
                key: const ValueKey('host-response-payment'),
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostFormPaymentsAmount,
                body:
                    '${hostFormPaymentAmount(payment.amountPaise)} · '
                    '${hostFormPaymentStatusLabel(context.l10n, payment.status)}'
                    '${payment.mode == HostFormPaymentMode.test ? ' · ${context.l10n.hostFormPaymentTest}' : ''}',
                bodyMaxLines: 3,
                onTap: () => onOpenPayment(payment),
              ),
            ],
          ),
        ],
        gapH24,
        CatchSection.divided(
          title: context.l10n.hostFormResponseAnswersSection,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (value.revoked)
                CatchText(
                  context.l10n.hostFormResponseOriginRevoked,
                  variant: CatchTextVariant.supporting,
                )
              else if (response != null) ...[
                if (origins.length == 1)
                  CatchText(
                    _originLabel(context, origins.single),
                    variant: CatchTextVariant.supporting,
                  ),
                for (final answer in response.answers) ...[
                  HostResponseAnswerRow(
                    label: answer.label,
                    answer: _answerText(context, answer.answer),
                    origin: origins.length == 1
                        ? null
                        : _originLabel(context, answer.origin),
                  ),
                  for (final asset in answer.assetDownloads)
                    CatchField.nav(
                      copy: catchFieldCopy(context.l10n),
                      title: context.l10n.hostFormResponseDownloadFile(
                        fileName: asset.fileName,
                      ),
                      body: asset.contentType,
                      icon: CatchIcons.downloadRounded,
                      onTap: () => onOpenAsset(asset),
                    ),
                ],
              ] else if (application != null)
                for (final answer in application.answers)
                  HostResponseAnswerRow(
                    label: answer.questionLabel,
                    answer: hostApplicationAnswerText(context, answer.value),
                  ),
            ],
          ),
        ),
        if (value.canReview) ...[
          gapH24,
          CatchSection.fieldRows(
            children: [
              CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostResponseReviewDecision,
                body: hostApplicationStatusLabel(
                  context,
                  application!.reviewStatus,
                ),
                onTap: busy
                    ? null
                    : () async {
                        final status =
                            await showCatchSelectionSheet<
                              HostApplicationReviewStatus
                            >(
                              context: context,
                              title: context.l10n.hostResponseReviewDecision,
                              value: application.reviewStatus,
                              items: [
                                for (final status in [
                                  HostApplicationReviewStatus.inReview,
                                  HostApplicationReviewStatus.waitlisted,
                                  HostApplicationReviewStatus.declined,
                                ])
                                  CatchSelectionMenuItem(
                                    value: status,
                                    label: hostApplicationStatusLabel(
                                      context,
                                      status,
                                    ),
                                  ),
                              ],
                            );
                        if (context.mounted &&
                            status != null &&
                            status != application.reviewStatus) {
                          await onReview(application, status);
                        }
                      },
              ),
            ],
          ),
        ],
        if (value.canReview) ...[
          gapH24,
          HostResponseReviewNoteField(
            key: ValueKey('review-note-${application!.applicationId}'),
            application: application,
            controller: note,
            busy: busy,
            saving: saving,
            onSave: () => onReview(application, application.reviewStatus),
          ),
        ] else if (application?.reviewNote case final String note
            when !value.revoked) ...[
          gapH24,
          CatchSection.divided(
            title: context.l10n.hostApplicationReviewNote,
            child: CatchText(
              note,
              variant: CatchTextVariant.bodyL,
              color: CatchTokens.of(context).ink,
            ),
          ),
        ],
        gapH24,
        CatchFieldLanes.single(
          child: CatchField.control(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostAudienceSubmissionDetails,
            contractExemption:
                'Read-only disclosure of authorized submission and review metadata.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                CatchField.read(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostFormResponseSubmittedAt,
                  valueText: AppTimeFormatters.dateTime(submitted),
                ),
                if (response != null && !value.revoked) ...[
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostAudienceResultsVersion(
                      version: response.response.version,
                    ),
                    valueText: AppTimeFormatters.dateTime(
                      response.response.submittedAt,
                    ),
                  ),
                  HostResponseMetadataSection(detail: response),
                ],
                if (application?.reviewedAt case final DateTime date)
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: hostApplicationStatusLabel(
                      context,
                      application!.reviewStatus,
                    ),
                    valueText: AppTimeFormatters.dateTime(date),
                  ),
              ],
            ),
          ),
        ),
        if (value.canConvert && application == null)
          HostResponseStartReviewAction(
            organizerId: organizerId,
            response: response!,
            busy: busy,
            onConvert: onConvert,
          ),
        if (value.canReview) ...[
          gapH16,
          CatchText(
            application!.reviewStatus == HostApplicationReviewStatus.approved
                ? value.contactId != null
                      ? context.l10n.hostAudienceApplicationAccepted
                      : context.l10n.hostAudienceApplicationApprovedUnlinked
                : context.l10n.hostAudienceApplicationAdmission,
            variant: CatchTextVariant.supporting,
          ),
        ],
        gapH32,
      ],
    );
  }
}

class HostResponseStartReviewAction extends ConsumerWidget {
  const HostResponseStartReviewAction({
    super.key,
    required this.organizerId,
    required this.response,
    required this.busy,
    required this.onConvert,
  });
  final String organizerId;
  final HostFormResponseDetail response;
  final bool busy;
  final Future<void> Function(HostFormResponseDetail, HostFormConversionKind)
  onConvert;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = hostFormResponseCanApplyProvider(
      organizerId: organizerId,
      responseId: response.response.responseId,
    );
    return CatchAsyncBoundary<bool>(
      value: ref.watch(provider),
      initialLoadTimeout: null,
      onRetry: () => ref.invalidate(provider),
      loadingBuilder: (_) => const SizedBox.shrink(),
      builder: (context, canApply) => !canApply
          ? const SizedBox.shrink()
          : CatchButton(
              label: context.l10n.hostResponseStartReview,
              variant: CatchButtonVariant.secondary,
              onPressed: busy
                  ? null
                  : () =>
                        onConvert(response, HostFormConversionKind.application),
            ),
    );
  }
}

class HostResponseContactSection extends StatelessWidget {
  const HostResponseContactSection({
    super.key,
    required this.value,
    required this.onContact,
  });
  final HostResponseReviewDetail value;
  final Future<void> Function(Uri) onContact;
  @override
  Widget build(BuildContext context) {
    final outreach = value.application?.outreach;
    final identity = value.response?.response.identity;
    final actions = <({String label, IconData icon, Uri uri})>[
      if (hostResponsePhoneUri(outreach?.phoneE164 ?? identity?.phoneE164)
          case final Uri phone)
        (
          label: context.l10n.hostApplicationCall,
          icon: CatchIcons.phoneOutlined,
          uri: phone,
        ),
      if (hostResponseWhatsappUri(
            value: outreach?.phoneE164 ?? identity?.phoneE164,
            displayName: identity?.displayName,
            l10n: context.l10n,
          )
          case final Uri whatsapp)
        (
          label: context.l10n.hostsHostOrganizerCrmWhatsapp,
          icon: CatchIcons.chatBubbleOutlineRounded,
          uri: whatsapp,
        ),
      if (outreach?.email ?? identity?.email case final String email)
        (
          label: context.l10n.hostApplicationEmail,
          icon: CatchIcons.emailOutlined,
          uri: Uri(scheme: 'mailto', path: email),
        ),
      if (hostResponseSocialUri(outreach?.instagramUrl, 'instagram.com')
          case final Uri uri)
        (
          label: context.l10n.hostApplicationInstagram,
          icon: CatchIcons.openInNewRounded,
          uri: uri,
        ),
      if (hostResponseSocialUri(outreach?.linkedinUrl, 'linkedin.com')
          case final Uri uri)
        (
          label: context.l10n.hostApplicationLinkedin,
          icon: CatchIcons.openInNewRounded,
          uri: uri,
        ),
    ];
    final singleColumn = MediaQuery.textScalerOf(context).scale(16) > 24;
    final buttons = [
      for (final action in actions)
        CatchButton(
          key: ValueKey(
            'response-contact-${action.uri.scheme}-${action.label}',
          ),
          label: action.label,
          leading: Icon(action.icon),
          fullWidth: singleColumn,
          variant: singleColumn
              ? CatchButtonVariant.secondary
              : CatchButtonVariant.ghost,
          onPressed: () => onContact(action.uri),
        ),
    ];
    if (singleColumn) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var index = 0; index < buttons.length; index++) ...[
            if (index > 0) gapH8,
            buttons[index],
          ],
        ],
      );
    }
    return Wrap(
      spacing: CatchSpacing.s2,
      runSpacing: CatchSpacing.s2,
      children: buttons,
    );
  }
}

class HostResponsePrimaryAction extends StatelessWidget {
  const HostResponsePrimaryAction({
    super.key,
    required this.value,
    required this.busy,
    required this.saving,
    required this.converting,
    required this.onReview,
    required this.onOpenPerson,
    required this.onConvert,
    this.onOfferEvent,
    this.offerActionLabel,
  });
  final VoidCallback? onOfferEvent;
  final String? offerActionLabel;
  final HostResponseReviewDetail value;
  final bool busy;
  final bool saving;
  final bool converting;
  final Future<void> Function(
    HostApplicationDetail,
    HostApplicationReviewStatus,
  )
  onReview;
  final ValueChanged<String> onOpenPerson;
  final Future<void> Function(HostFormResponseDetail, HostFormConversionKind)
  onConvert;
  @override
  Widget build(BuildContext context) {
    final application = value.application;
    final response = value.response;
    final contactId = value.contactId;
    if (value.revoked) return const SizedBox.shrink();
    if (application != null &&
        value.canReview &&
        application.reviewStatus != HostApplicationReviewStatus.approved) {
      return CatchDock.pageAction(
        buttonKey: const ValueKey('host-application-primary-action'),
        label: context.l10n.hostApplicationApprove,
        isLoading: saving,
        onPressed: busy
            ? null
            : () => onReview(application, HostApplicationReviewStatus.approved),
      );
    }
    if (value.canOfferEvent && onOfferEvent != null) {
      return CatchDock.pageAction(
        buttonKey: const ValueKey('host-response-offer-event'),
        label: offerActionLabel ?? context.l10n.hostResponseOfferEvent,
        onPressed: busy ? null : onOfferEvent,
      );
    }
    if (contactId != null) {
      return CatchDock.pageAction(
        buttonKey: const ValueKey('host-application-open-person'),
        label: context.l10n.hostApplicationOpenPerson,
        onPressed: busy ? null : () => onOpenPerson(contactId),
      );
    }
    if (application == null &&
        response != null &&
        value.canConvert &&
        !response.response.conversionKinds.contains(
          HostFormConversionKind.crmContact,
        )) {
      return CatchDock.pageAction(
        buttonKey: const ValueKey('host-form-response-convert-crm-primary'),
        label: context.l10n.hostFormConvertCrm,
        isLoading: converting,
        onPressed: busy
            ? null
            : () => onConvert(response, HostFormConversionKind.crmContact),
      );
    }
    return const SizedBox.shrink();
  }
}

/// Uses the shared explicit-save field so actions participate in its reveal,
/// keyboard focus and cancellation behavior rather than floating below it.
class HostResponseReviewNoteField extends StatefulWidget {
  const HostResponseReviewNoteField({
    super.key,
    required this.application,
    required this.controller,
    required this.busy,
    required this.saving,
    required this.onSave,
  });
  final HostApplicationDetail application;
  final TextEditingController controller;
  final bool busy;
  final bool saving;
  final Future<void> Function() onSave;
  @override
  State<HostResponseReviewNoteField> createState() =>
      _HostResponseReviewNoteFieldState();
}

class _HostResponseReviewNoteFieldState
    extends State<HostResponseReviewNoteField> {
  bool _open = false;
  @override
  void didUpdateWidget(covariant HostResponseReviewNoteField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.application.revision != oldWidget.application.revision &&
        widget.controller.text.trim() ==
            (widget.application.reviewNote ?? '').trim()) {
      _open = false;
    }
  }

  @override
  Widget build(BuildContext context) => CatchFieldLanes.single(
    child: CatchField.inputActions(
      copy: catchFieldCopy(
        context.l10n,
      ).copyWith(doneLabel: context.l10n.hostResponseSaveReviewNote),
      title: context.l10n.hostApplicationReviewNote,
      controller: widget.controller,
      emptyValueText: context.l10n.hostResponseAddReviewNote,
      inputHint: context.l10n.hostApplicationReviewNoteHint,
      contract: CatchContractConstraints
          .reviewOrganizerApplicationCallablePayloadReviewNote,
      maxLines: 3,
      open: _open,
      status: widget.saving ? CatchFieldStatus.saving : CatchFieldStatus.idle,
      states: {if (widget.busy && !widget.saving) WidgetState.disabled},
      onOpenChanged: (open) => setState(() => _open = open),
      onCancel: () {
        widget.controller.text = widget.application.reviewNote ?? '';
        setState(() => _open = false);
      },
      onSubmit: () {
        if (widget.busy) return;
        if (widget.controller.text.trim() ==
            (widget.application.reviewNote ?? '').trim()) {
          setState(() => _open = false);
        } else {
          widget.onSave();
        }
      },
    ),
  );
}
