import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_metric_row.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class HostFormOverviewSectionList extends ConsumerWidget {
  const HostFormOverviewSectionList({
    super.key,
    required this.organizerId,
    required this.state,
    required this.onQuestions,
    required this.onReviewResponses,
    required this.onSettings,
    required this.onShare,
    required this.onPreview,
  });
  final String organizerId;
  final HostFormEditorState state;
  final VoidCallback onQuestions;
  final VoidCallback onReviewResponses;
  final VoidCallback onSettings;
  final VoidCallback onShare;
  final VoidCallback onPreview;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final form = state.editor.form;
    final questionCount = state.editor.definition.sections.fold<int>(
      0,
      (count, section) => count + section.questions.length,
    );
    final request = HostFormResponseListRequest(
      organizerId: organizerId,
      formId: form.formId,
      statuses: const {HostFormResponseStatus.submitted},
      limit: 1,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        HostFormMetricRow(
          key: const ValueKey('host-form-command-center-metrics'),
          items: [
            (
              value: '${form.submittedResponseCount}',
              label: context.l10n.hostFormsViewResponses,
            ),
            (
              value: '$questionCount',
              label: context.l10n.hostFormQuestionsTitle,
            ),
          ],
        ),
        gapH24,
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: CatchButton(
                label: form.activeVersionId != null
                    ? context.l10n.hostFormShare
                    : context.l10n.hostAudienceEditQuestions,
                mode: CatchButtonMode.rounded,
                fullWidth: true,
                onPressed: form.activeVersionId != null ? onShare : onQuestions,
              ),
            ),
            gapW12,
            Expanded(
              child: CatchButton(
                label: context.l10n.hostFormPreview,
                variant: CatchButtonVariant.secondary,
                mode: CatchButtonMode.rounded,
                fullWidth: true,
                onPressed: onPreview,
              ),
            ),
          ],
        ),
        if (form.activeVersionId != null) ...[
          gapH32,
          CatchAsyncBoundary<HostFormResponsesState>(
            value: ref.watch(hostFormResponsesControllerProvider(request)),
            onRetry: () =>
                ref.invalidate(hostFormResponsesControllerProvider(request)),
            loadingBuilder: (_) => CatchSection.containedLoadingRows(
              title: context.l10n.hostAudienceLatestResponse,
              layouts: const [
                CatchPersonLayout.placeholder(
                  hasSupportingText: true,
                  hasContext: true,
                ),
              ],
            ),
            errorBuilder: (_, error, _, onBoundaryRetry) =>
                CatchLocalizedErrorState(
                  error,
                  context: AppErrorContext.formResponses,
                  mode: CatchErrorStateMode.compact,
                  onRetry: onBoundaryRetry,
                ),
            builder: (context, value) {
              final response = value.responses.firstOrNull;
              if (response == null) {
                return CatchText(
                  context.l10n.hostFormResponsesEmptyBody,
                  variant: CatchTextVariant.supporting,
                );
              }
              return CatchSection.containedRows(
                title: context.l10n.hostAudienceLatestResponse,
                children: [
                  CatchField.navigate(
                    key: const ValueKey(
                      'host-form-command-center-recent-response',
                    ),
                    onActivate: () => context.pushNamed(
                      Routes.hostFormResponseDetailScreen.name,
                      pathParameters: {'responseId': response.responseId},
                      queryParameters: {'organizerId': organizerId},
                    ),
                    content: CatchPersonLayout(
                      name:
                          response.identity.primaryLabel ??
                          context.l10n.hostFormResponsesAnonymous,
                      supportingText:
                          response.sourceLabel ??
                          context.l10n.hostFormResponseDirectSource,
                      context: AppTimeFormatters.compactRelativeTime(
                        response.submittedAt,
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
          CatchButton.command(
            label: context.l10n.hostFormsViewResponsesAction,
            leading: Icon(CatchIcons.forwardArrow),
            onPressed: onReviewResponses,
          ),
        ],
        gapH24,
        CatchSection.fieldRows(
          children: [
            if (form.activeVersionId != null)
              CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostFormsAnalyticsAction,
                icon: CatchIcons.insightsOutlined,
                emphasis: CatchFieldEmphasis.title,
                onTap: () => context.pushNamed(
                  Routes.hostFormAnalyticsScreen.name,
                  pathParameters: {'formId': form.formId},
                  queryParameters: {'organizerId': organizerId},
                ),
              ),
            CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostFormSettings,
              icon: CatchIcons.settingsOutlined,
              emphasis: CatchFieldEmphasis.title,
              onTap: onSettings,
            ),
            CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostFormsAutomationsAction,
              icon: CatchIcons.autoAwesomeOutlined,
              emphasis: CatchFieldEmphasis.title,
              onTap: () => context.pushNamed(
                Routes.hostFormAutomationsScreen.name,
                pathParameters: {'formId': form.formId},
                queryParameters: {'organizerId': organizerId},
              ),
            ),
          ],
        ),
        gapH24,
        CatchSection.divided(
          title: context.l10n.hostFormConsequencesTitle,
          child: CatchText(
            hostFormConsequenceSummary(context, form),
            variant: CatchTextVariant.supporting,
          ),
        ),
      ],
    );
  }
}
