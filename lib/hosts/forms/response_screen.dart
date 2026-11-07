import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_conversion.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_response_row.dart';
import 'package:catch_dating_app/hosts/forms/response_body.dart';
import 'package:catch_dating_app/hosts/forms/response_state.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_applications_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_review_detail.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// One answer, from a form response or an imported application.
///
/// Reads the joined review detail (the response, its application and its
/// payment). Offer a place lets the person in through the existing
/// application review command when they are not in yet and opens the offer;
/// Not now marks the application declined; Add to People runs the
/// response's contact conversion; Message opens WhatsApp or email.
class HostResponseScreen extends ConsumerStatefulWidget {
  const HostResponseScreen({
    super.key,
    required this.organizerId,
    required String this.responseId,
    this.returnToOffer = false,
  }) : applicationId = null;

  const HostResponseScreen.application({
    super.key,
    required this.organizerId,
    required String this.applicationId,
    this.returnToOffer = false,
  }) : responseId = null;

  final String organizerId;
  final String? responseId;
  final String? applicationId;

  /// Opened from an offer to add the person to People; the primary action
  /// goes back to that offer.
  final bool returnToOffer;

  @override
  ConsumerState<HostResponseScreen> createState() => _HostResponseScreenState();
}

class _HostResponseScreenState extends ConsumerState<HostResponseScreen> {
  final _note = TextEditingController();
  int? _noteRevision;
  bool _busy = false;

  HostResponseReviewKey get _key => (
    organizerId: widget.organizerId,
    responseId: widget.responseId,
    applicationId: widget.applicationId,
  );

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final value = catchAsyncStateFromAsyncValue(
      ref.watch(hostResponseReviewDetailProvider(_key)),
    );
    final detail = value.value;
    final application = detail?.application;
    if (application != null && _noteRevision != application.revision) {
      _noteRevision = application.revision;
      _note.text = application.reviewNote ?? '';
    }
    final state = detail == null
        ? const HostResponseState.loading()
        : _state(l10n, detail);
    final body = value.hasError && detail == null
        ? CatchLocalizedErrorState(
            value.error!,
            context: AppErrorContext.formResponses,
            onRetry: _reload,
          )
        : HostResponseBody(state: state, note: _note, onOpenFile: _openFile);
    final response = detail?.response?.response;
    final primary = state.primary;
    return CatchRoot(
      child: CatchScreen(
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: detail?.displayName ?? l10n.hostFormsResponseTitle,
          kicker: response == null
              ? null
              : l10n.hostFormsResponseKicker(
                  form: response.formTitle,
                  ago: hostFormAgo(response.submittedAt, DateTime.now()),
                ),
          back: CatchTopBarBack(label: l10n.hostFormsBack),
          action: CatchTopBarAction(
            label: l10n.hostFormsResponseMessage,
            onPressed: state.canMessage && detail != null
                ? () => _message(detail)
                : null,
          ),
        ),
        body: body,
        dock: detail == null || primary == null
            ? null
            : CatchDock(
                primary: CatchDockAction(
                  label: switch (primary) {
                    HostResponsePrimary.offer => l10n.hostFormsResponseOffer,
                    HostResponsePrimary.addToPeople =>
                      l10n.hostFormsResponseAddToPeople,
                    HostResponsePrimary.continueOffer =>
                      l10n.hostFormsResponseContinueOffer,
                  },
                  loading: _busy,
                  onPressed: _busy ? null : () => _primary(primary, detail),
                ),
                secondary: state.canDecline
                    ? CatchDockAction(
                        label: l10n.hostFormsReviewNotNow,
                        onPressed: _busy
                            ? null
                            : () => _review(
                                detail.application!,
                                HostApplicationReviewStatus.declined,
                              ),
                      )
                    : null,
              ),
      ),
    );
  }

  HostResponseState _state(
    AppLocalizations l10n,
    HostResponseReviewDetail detail,
  ) {
    final response = detail.response;
    final application = detail.application;
    final identity = response?.response.identity;
    final email = identity?.email ?? application?.outreach.email;
    final phone = identity?.phoneE164 ?? application?.outreach.phoneE164;
    final payment = response?.payment;
    final converted =
        response?.response.conversionKinds.contains(
          HostFormConversionKind.crmContact,
        ) ??
        false;
    final HostResponsePrimary? primary;
    if (detail.revoked) {
      primary = null;
    } else if (widget.returnToOffer &&
        (detail.canOfferEvent || detail.contactId != null)) {
      primary = HostResponsePrimary.continueOffer;
    } else if (detail.canChooseEvent &&
        (detail.contactId != null || detail.canReview)) {
      primary = HostResponsePrimary.offer;
    } else if (application == null &&
        response != null &&
        detail.canConvert &&
        !converted) {
      primary = HostResponsePrimary.addToPeople;
    } else {
      primary = null;
    }
    return HostResponseState(
      status: HostResponseStatus.content,
      name: detail.displayName,
      review: application?.reviewStatus,
      withdrawn: detail.withdrawn,
      facts: [?response?.response.sourceLabel, ?email, ?phone],
      answers: response != null
          ? [
              for (final answer in response.answers)
                HostResponseAnswer(
                  question: answer.label,
                  answer: answer.assetDownloads.isNotEmpty
                      ? answer.assetDownloads
                            .map((file) => file.fileName)
                            .join(', ')
                      : hostFormAnswerText(answer.answer),
                  files: answer.assetDownloads,
                ),
            ]
          : [
              for (final answer
                  in application?.answers ?? const <HostApplicationAnswer>[])
                HostResponseAnswer(
                  question: answer.questionLabel,
                  answer: hostFormAnswerText(
                    <Object?>[
                      answer.value.textValue,
                      answer.value.numberValue,
                      answer.value.booleanValue,
                      answer.value.dateValue,
                      ...answer.value.optionValues,
                    ].nonNulls.toList(),
                  ),
                ),
            ],
      payment: payment == null
          ? null
          : l10n.hostFormsResponsePaymentLine(
              amount: hostFormPaymentAmount(payment.amountPaise),
              status: hostFormPaymentStatusLabel(l10n, payment.status),
            ),
      showNote: detail.canReview,
      primary: primary,
      canDecline:
          detail.canReview &&
          application!.reviewStatus != HostApplicationReviewStatus.declined,
      canMessage: email != null || phone != null,
      busy: _busy,
    );
  }

  void _reload() {
    final detail = ref
        .read(hostResponseReviewDetailProvider(_key))
        .asData
        ?.value;
    final responseId =
        widget.responseId ?? detail?.response?.response.responseId;
    final applicationId =
        widget.applicationId ?? detail?.application?.applicationId;
    if (responseId != null) {
      ref.invalidate(
        hostFormResponseDetailProvider(
          organizerId: widget.organizerId,
          responseId: responseId,
        ),
      );
    }
    if (applicationId != null) {
      ref.invalidate(
        hostApplicationDetailProvider(widget.organizerId, applicationId),
      );
    }
    ref.invalidate(hostResponseReviewDetailProvider(_key));
    ref.invalidate(hostFormResponsesControllerProvider);
  }

  Future<void> _primary(
    HostResponsePrimary primary,
    HostResponseReviewDetail detail,
  ) async {
    switch (primary) {
      case HostResponsePrimary.continueOffer:
        context.pop();
      case HostResponsePrimary.addToPeople:
        await _addToPeople(detail.response!);
      case HostResponsePrimary.offer:
        final application = detail.application;
        if (application != null &&
            application.reviewStatus != HostApplicationReviewStatus.approved) {
          final approved = await _review(
            application,
            HostApplicationReviewStatus.approved,
          );
          if (!approved || !mounted) return;
        }
        final response = detail.response?.response;
        if (response == null) return;
        await context.pushNamed<void>(
          Routes.hostResponseOfferScreen.name,
          pathParameters: {'responseId': response.responseId},
          queryParameters: {
            'organizerId': widget.organizerId,
            'recipientLabel': ?detail.displayName,
          },
        );
        if (mounted) _reload();
    }
  }

  Future<bool> _review(
    HostApplicationDetail application,
    HostApplicationReviewStatus status,
  ) async {
    setState(() => _busy = true);
    try {
      await ref
          .read(hostApplicationsControllerProvider)
          .reviewApplication(
            organizerId: widget.organizerId,
            applicationId: application.applicationId,
            expectedRevision: application.revision,
            reviewStatus: status,
            reviewNote: _note.text,
          );
      _reload();
      if (mounted) {
        showCatchNotice(context, context.l10n.hostFormsResponseReviewed);
      }
      return true;
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.applications,
        );
      }
      return false;
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _addToPeople(HostFormResponseDetail response) async {
    setState(() => _busy = true);
    try {
      final controller = ref.read(hostFormsControllerProvider);
      final responseId = response.response.responseId;
      final preview = await controller.previewConversion(
        organizerId: widget.organizerId,
        responseId: responseId,
        kind: HostFormConversionKind.crmContact,
      );
      if (!preview.allowed) {
        throw StateError(
          preview.warnings.firstOrNull ??
              (mounted ? context.l10n.hostFormsResponseAddBlocked : ''),
        );
      }
      await controller.convertResponse(
        organizerId: widget.organizerId,
        responseId: responseId,
        kind: HostFormConversionKind.crmContact,
        requestId: 'conversion_${DateTime.now().microsecondsSinceEpoch}',
      );
      _reload();
      if (mounted) {
        showCatchNotice(context, context.l10n.hostFormsResponseAdded);
      }
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _message(HostResponseReviewDetail detail) async {
    final identity = detail.response?.response.identity;
    final phone = identity?.phoneE164 ?? detail.application?.outreach.phoneE164;
    final email = identity?.email ?? detail.application?.outreach.email;
    final links = ref.read(externalLinkControllerProvider);
    try {
      final digits = phone?.replaceAll(RegExp(r'[^0-9]'), '');
      final opened = digits != null && digits.isNotEmpty
          ? await links.openExternal(Uri.https('wa.me', '/$digits'))
          : email != null
          ? await links.open(Uri(scheme: 'mailto', path: email))
          : false;
      if (!opened && mounted) {
        showCatchNoticeError(
          context,
          StateError(context.l10n.hostFormsResponseMessageFailed),
        );
      }
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    }
  }

  Future<void> _openFile(HostFormAssetDownload file) async {
    try {
      final opened = await ref
          .read(externalLinkControllerProvider)
          .open(Uri.parse(file.downloadUrl));
      if (!opened && mounted) {
        showCatchNoticeError(
          context,
          StateError(context.l10n.hostFormsResponseFileFailed),
        );
      }
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    }
  }
}
