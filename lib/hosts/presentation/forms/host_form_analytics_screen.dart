import 'dart:async';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_analytics.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_export.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_metric_row.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class HostFormAnalyticsScreen extends ConsumerStatefulWidget {
  const HostFormAnalyticsScreen({
    super.key,
    required this.organizerId,
    required this.formId,
  });

  final String organizerId;
  final String formId;

  @override
  ConsumerState<HostFormAnalyticsScreen> createState() =>
      _HostFormAnalyticsScreenState();
}

class _HostFormAnalyticsScreenState
    extends ConsumerState<HostFormAnalyticsScreen> {
  HostFormExportFormat? _exporting;

  @override
  Widget build(BuildContext context) {
    final provider = hostFormAnalyticsProvider(
      organizerId: widget.organizerId,
      formId: widget.formId,
    );
    final analytics = ref.watch(provider);
    final editorProvider = hostFormEditorControllerProvider(
      widget.organizerId,
      widget.formId,
    );
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.hostFormAnalyticsTitle,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: CatchRouteBody.standardConstrainedSlivers(
        slivers: [
          CatchAsyncBoundary<HostFormAnalytics>.sliver(
            value: analytics,
            onRetry: () => ref.invalidate(provider),
            initialLoadTimeout: null,
            errorContext: AppErrorContext.forms,
            builder: (context, value) => SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CatchAsyncBoundary<HostFormEditorState>(
                    value: ref.watch(editorProvider),
                    onRetry: () => ref.read(editorProvider.notifier).reload(),
                    loadingBuilder: (_) => CatchSkeleton.content(
                      child: CatchText(
                        context.l10n.hostFormAnalyticsTitle,
                        variant: CatchTextVariant.headline,
                      ),
                    ),
                    errorBuilder: (_, error, _, onBoundaryRetry) =>
                        CatchLocalizedErrorState(
                          error,
                          context: AppErrorContext.forms,
                          mode: CatchErrorStateMode.compact,
                          onRetry: onBoundaryRetry,
                        ),
                    builder: (context, editor) => CatchText(
                      editor.editor.definition.title,
                      variant: CatchTextVariant.headline,
                    ),
                  ),
                  gapH8,
                  CatchText(
                    context.l10n.hostAudienceResultsVersion(
                      version: value.version,
                    ),
                    variant: CatchTextVariant.supporting,
                  ),
                  gapH24,
                  HostFormMetricRow(
                    items: [
                      (
                        value: '${value.opens}',
                        label: context.l10n.hostFormAnalyticsOpens,
                      ),
                      (
                        value: '${value.starts}',
                        label: context.l10n.hostFormAnalyticsStarts,
                      ),
                      (
                        value: '${value.submissions}',
                        label: context.l10n.hostFormAnalyticsSubmissions,
                      ),
                    ],
                  ),
                  gapH24,
                  CatchSection.divided(
                    title: context.l10n.hostFormAnalyticsCompletionRate,
                    first: true,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        CatchText(
                          value.starts == 0
                              ? '—'
                              : '${(value.completionRate * 100).round()}%',
                          variant: CatchTextVariant.headline,
                        ),
                        gapH8,
                        CatchText(
                          context.l10n.hostAudienceCompletionDenominator(
                            submissions: value.submissions,
                            starts: value.starts,
                          ),
                          variant: CatchTextVariant.supporting,
                        ),
                        if (value.medianCompletionMillis
                            case final milliseconds?) ...[
                          gapH8,
                          CatchText(
                            context.l10n.hostAudienceMedianCompletion(
                              duration: _duration(milliseconds),
                            ),
                            variant: CatchTextVariant.supporting,
                          ),
                        ],
                      ],
                    ),
                  ),
                  gapH24,
                  CatchText(
                    context.l10n.hostFormAnalyticsPrivacyNotice,
                    variant: CatchTextVariant.supporting,
                  ),
                  for (final question in value.questions) ...[
                    gapH24,
                    CatchSection.divided(
                      first: true,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          CatchText(
                            question.label,
                            variant: CatchTextVariant.sectionTitle,
                            color: CatchTokens.of(context).ink,
                          ),
                          gapH8,
                          CatchText(
                            context.l10n.hostFormAnalyticsQuestionSummary(
                              count: question.responseCount,
                            ),
                            variant: CatchTextVariant.bodyS,
                            color: CatchTokens.of(context).ink2,
                          ),
                          if (question.kind == 'multiChoice') ...[
                            gapH8,
                            CatchText(
                              context.l10n.hostAudienceMultipleChoiceResults,
                              variant: CatchTextVariant.supporting,
                            ),
                          ],
                          for (final choice in question.choiceCounts) ...[
                            gapH16,
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: CatchText(
                                    choice.label,
                                    variant: CatchTextVariant.bodyL,
                                    color: CatchTokens.of(context).ink,
                                  ),
                                ),
                                gapW12,
                                CatchText(
                                  '${choice.count}',
                                  variant: CatchTextVariant.sectionTitle,
                                  color: CatchTokens.of(context).ink,
                                ),
                              ],
                            ),
                            gapH8,
                            LinearProgressIndicator(
                              value: question.responseCount == 0
                                  ? 0
                                  : (choice.count / question.responseCount)
                                        .clamp(0, 1),
                              backgroundColor: CatchTokens.of(context).line,
                              valueColor: AlwaysStoppedAnimation(
                                CatchTokens.of(context).ink,
                              ),
                              minHeight: CatchSpacing.s1,
                              semanticsLabel: context.l10n
                                  .hostAudienceChoiceDenominator(
                                    count: choice.count,
                                    total: question.responseCount,
                                  ),
                            ),
                          ],
                          if (question.numericCount > 0) ...[
                            gapH16,
                            CatchText(
                              context.l10n.hostAudienceNumericResult(
                                average:
                                    (question.numericSum /
                                            question.numericCount)
                                        .toStringAsFixed(1),
                                count: question.numericCount,
                              ),
                              variant: CatchTextVariant.bodyL,
                              color: CatchTokens.of(context).ink,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                  gapH24,
                  CatchButton.command(
                    label: context.l10n.hostAudienceViewAllResponses,
                    leading: Icon(CatchIcons.forwardArrow),
                    onPressed: () => context.pushNamed(
                      Routes.hostFormBuilderScreen.name,
                      pathParameters: {'formId': widget.formId},
                      queryParameters: {
                        'organizerId': widget.organizerId,
                        'view': 'responses',
                      },
                    ),
                  ),
                  CatchText(
                    context.l10n.hostAudienceResponsesAllVersions,
                    variant: CatchTextVariant.bodyS,
                    color: CatchTokens.of(context).ink2,
                  ),
                  if (value.sources.isNotEmpty) ...[
                    gapH24,
                    CatchSection.containedRows(
                      title: context.l10n.hostFormAnalyticsSources,
                      children: [
                        for (final source in value.sources)
                          CatchField.read(
                            content: CatchRecordLayout(
                              title: source.label,
                              icon: CatchIcons.linkOutlined,
                              facts: [
                                context.l10n.hostFormAnalyticsSourceSummary(
                                  opens: source.opens,
                                  starts: source.starts,
                                  submissions: source.submissions,
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ],
                  if (value.sources.isNotEmpty) ...[
                    gapH8,
                    CatchText(
                      context.l10n.hostAudienceSourceTotalsScope,
                      variant: CatchTextVariant.bodyS,
                      color: CatchTokens.of(context).ink2,
                    ),
                  ],
                  gapH24,
                  Wrap(
                    spacing: CatchSpacing.s4,
                    runSpacing: CatchSpacing.s2,
                    children: [
                      for (final format in HostFormExportFormat.values)
                        CatchButton.command(
                          label: _exporting == format
                              ? context.l10n.hostAudiencePreparingExport
                              : format == HostFormExportFormat.csv
                              ? context.l10n.hostFormExportCsv
                              : context.l10n.hostFormExportXlsx,
                          leading: Icon(CatchIcons.downloadRounded),
                          onPressed: _exporting == null
                              ? () => _export(format, value.versionId)
                              : null,
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _export(HostFormExportFormat format, String versionId) async {
    setState(() => _exporting = format);
    final controller = ref.read(hostFormsControllerProvider);
    final requestId = 'export_${DateTime.now().microsecondsSinceEpoch}';
    try {
      var receipt = await controller.requestExport(
        organizerId: widget.organizerId,
        formId: widget.formId,
        requestId: requestId,
        format: format,
        statuses: HostFormResponseStatus.values.toSet(),
        versionId: versionId,
      );
      for (
        var attempt = 0;
        mounted &&
            attempt < 12 &&
            (receipt.status == HostFormExportStatus.pending ||
                receipt.status == HostFormExportStatus.running);
        attempt++
      ) {
        await Future<void>.delayed(CatchMotion.formExportPoll);
        receipt = await controller.requestExport(
          organizerId: widget.organizerId,
          formId: widget.formId,
          requestId: requestId,
          format: format,
          statuses: HostFormResponseStatus.values.toSet(),
          versionId: versionId,
        );
      }
      if (!mounted) return;
      if (receipt.status == HostFormExportStatus.completed &&
          receipt.downloadUrl != null) {
        final opened = await ref
            .read(externalLinkControllerProvider)
            .open(Uri.parse(receipt.downloadUrl!));
        if (!mounted) return;
        showCatchNotice(
          context,
          opened
              ? context.l10n.hostFormExportReady
              : context.l10n.hostFormExportFailed,
        );
      } else if (receipt.status == HostFormExportStatus.pending ||
          receipt.status == HostFormExportStatus.running) {
        showCatchNotice(context, context.l10n.hostFormExportStillPreparing);
      } else {
        throw StateError(
          receipt.errorMessage ?? context.l10n.hostFormExportFailed,
        );
      }
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    } finally {
      if (mounted) setState(() => _exporting = null);
    }
  }
}

String _duration(int milliseconds) {
  final seconds = (milliseconds / 1000).round();
  if (seconds < 60) return '${seconds}s';
  final minutes = seconds ~/ 60;
  final remainder = seconds % 60;
  return remainder == 0 ? '${minutes}m' : '${minutes}m ${remainder}s';
}
