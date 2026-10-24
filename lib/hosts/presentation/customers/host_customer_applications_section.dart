import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/hosts/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/hosts/data/host_application_repository.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_application_context.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_application_copy.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_applications_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Loads organizer-scoped submissions only when the Details tab is mounted.
class HostCustomerApplicationsSection extends ConsumerWidget {
  const HostCustomerApplicationsSection({
    super.key,
    required this.organizerId,
    required this.contactId,
    required this.onOpenApplication,
    required this.onOpenContact,
  });

  final String organizerId;
  final String contactId;
  final ValueChanged<String> onOpenApplication;
  final ValueChanged<Uri> onOpenContact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sources = catchAsyncStateFromAsyncValue(
      ref.watch(hostSavedAudienceFilterOptionsProvider(organizerId)),
    ).value;
    final request = HostApplicationListRequest(
      organizerId: organizerId,
      contactId: contactId,
    );
    final provider = hostApplicationsDirectoryControllerProvider(request);
    return CatchAsyncBoundary<HostApplicationsDirectoryState>(
      value: ref.watch(provider),
      onRetry: () => ref.invalidate(provider),
      loadingBuilder: (_) => CatchSection.loadingRows(
        title: context.l10n.hostApplicationsTitle,
        layouts: [
          CatchRecordLayout.placeholder(
            icon: CatchIcons.tabForms,
            hasMetadata: true,
          ),
          CatchRecordLayout.placeholder(
            icon: CatchIcons.tabForms,
            hasMetadata: true,
          ),
        ],
      ),
      builder: (context, state) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (state.applications.isEmpty)
            CatchSection.content(
              key: const ValueKey('host-customer-applications'),
              title: context.l10n.hostApplicationsTitle,
              child: CatchText(
                context.l10n.hostCustomersNoApplications,
                variant: CatchTextVariant.supporting,
              ),
            )
          else
            CatchSection.rows(
              key: const ValueKey('host-customer-applications'),
              title: context.l10n.hostApplicationsTitle,
              children: [
                if (state.applications.isEmpty)
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    body: context.l10n.hostCustomersNoApplications,
                    bodyMaxLines: 6,
                  ),
                for (final application in state.applications)
                  CatchField.navigate(
                    key: ValueKey(
                      'host-customer-application-${application.applicationId}',
                    ),
                    onActivate: () =>
                        onOpenApplication(application.applicationId),
                    content: CatchRecordLayout(
                      title: hostApplicationContextLabel(
                        context,
                        formId: application.formId,
                        targetKind: application.targetKind,
                        targetId: application.targetId,
                        sources: sources,
                      ),
                      metadata:
                          '${hostApplicationStatusLabel(context, application.reviewStatus)} · ${AppTimeFormatters.shortDate(application.submittedAt)}',
                      icon: CatchIcons.tabForms,
                    ),
                  ),
              ],
            ),
          if (state.loadMoreError case final error?)
            CatchLocalizedErrorState(
              error,
              onRetry: () => ref.read(provider.notifier).loadMore(),
            ),
          if (state.nextCursor != null)
            CatchButton(
              label: context.l10n.hostCustomersLoadMore,
              status: (state.loadingMore)
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              variant: CatchButtonVariant.ghost,
              onPressed: state.canLoadMore
                  ? () => ref.read(provider.notifier).loadMore()
                  : null,
            ),
          if (state.applications.isNotEmpty) ...[
            gapH24,
            CatchSection.rows(
              children: [
                CatchField.control(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostCustomersLatestSubmittedDetails,
                  titleMaxLines: 4,
                  contractExemption:
                      'Read-only disclosure of a grant-filtered application snapshot; no scalar value is persisted.',
                  child: HostCustomerApplicationCard(
                    organizerId: organizerId,
                    applicationId: state.applications.first.applicationId,
                    onOpen: () => onOpenApplication(
                      state.applications.first.applicationId,
                    ),
                    onOpenContact: onOpenContact,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// Displays the same grant-filtered answers as the application detail route.
/// These remain a dated submission rather than becoming editable CRM fields.
class HostCustomerApplicationCard extends ConsumerWidget {
  const HostCustomerApplicationCard({
    super.key,
    required this.organizerId,
    required this.applicationId,
    required this.onOpen,
    required this.onOpenContact,
  });

  final String organizerId;
  final String applicationId;
  final VoidCallback onOpen;
  final ValueChanged<Uri> onOpenContact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = hostApplicationDetailProvider(organizerId, applicationId);
    return CatchAsyncBoundary<HostApplicationDetail>(
      value: ref.watch(provider),
      onRetry: () => ref.invalidate(provider),
      loadingBuilder: (_) => CatchSkeleton.content(
        child: CatchSection.fieldRows(
          title: context.l10n.hostCustomersLatestSubmittedDetails,
          footer: CatchText(
            context.l10n.hostCustomersSubmittedOn(
              date: CatchSkeleton.sampleDateText,
            ),
            variant: CatchTextVariant.bodyS,
            color: CatchTokens.of(context).ink2,
          ),
          children: [
            CatchField.read(
              copy: catchFieldCopy(context.l10n),
              title: CatchSkeleton.sampleQuestionText,
              body: CatchSkeleton.sampleAnswerText,
            ),
            CatchField.read(
              copy: catchFieldCopy(context.l10n),
              title: CatchSkeleton.sampleQuestionText,
              body: CatchSkeleton.sampleAnswerText,
            ),
            CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostCustomersOpenApplication,
              body: CatchSkeleton.sampleStatusText,
              onTap: () {},
            ),
          ],
        ),
      ),
      builder: (context, detail) => CatchSection.fieldRows(
        key: const ValueKey('host-customer-submitted-fields'),
        title: context.l10n.hostCustomersLatestSubmittedDetails,
        footer: CatchText(
          context.l10n.hostCustomersSubmittedOn(
            date: AppTimeFormatters.shortDate(detail.submittedAt),
          ),
          variant: CatchTextVariant.bodyS,
          color: CatchTokens.of(context).ink2,
        ),
        children: [
          if (detail.answers.isEmpty)
            CatchField.read(
              copy: catchFieldCopy(context.l10n),
              body: context.l10n.hostCustomersSubmittedAnswersUnavailable,
            ),
          if (detail.outreach.instagramUrl case final url?)
            CatchField.action(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostApplicationInstagram,
              body: Uri.parse(url).path.replaceAll('/', ''),
              icon: CatchIcons.openInNewRounded,
              onTap: () => onOpenContact(Uri.parse(url)),
            ),
          if (detail.outreach.linkedinUrl case final url?)
            CatchField.action(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostApplicationLinkedin,
              body: url,
              bodyMaxLines: 4,
              icon: CatchIcons.openInNewRounded,
              onTap: () => onOpenContact(Uri.parse(url)),
            ),
          for (final answer
              in detail.answers
                  .where(
                    (answer) =>
                        answer.canonicalFieldId != 'instagramHandle' &&
                        answer.canonicalFieldId != 'linkedinUrl',
                  )
                  .take(8))
            CatchField.read(
              copy: catchFieldCopy(context.l10n),
              title: answer.questionLabel,
              body: hostCustomerApplicationAnswerText(context, answer.value),
              titleMaxLines: 4,
              bodyMaxLines: 8,
            ),
          CatchField.nav(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostCustomersOpenApplication,
            body: hostApplicationStatusLabel(context, detail.reviewStatus),
            onTap: onOpen,
          ),
        ],
      ),
    );
  }
}

String hostCustomerApplicationAnswerText(
  BuildContext context,
  HostApplicationAnswerValue value,
) {
  if (value.textValue != null) return value.textValue!;
  if (value.numberValue != null) return value.numberValue.toString();
  if (value.booleanValue != null) {
    return value.booleanValue!
        ? context.l10n.hostFormRuleTrue
        : context.l10n.hostFormRuleFalse;
  }
  if (value.dateValue != null) return value.dateValue!;
  if (value.optionValues.isNotEmpty) return value.optionValues.join(', ');
  if (value.assetIds.isNotEmpty) {
    return context.l10n.hostCustomersOpenApplication;
  }
  return context.l10n.hostFormResponseNoAnswer;
}
