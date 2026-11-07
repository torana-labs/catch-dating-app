import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:catch_dating_app/hosts/forms/form_body.dart';
import 'package:catch_dating_app/hosts/forms/form_state.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_applications_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// One form: whether it is taking answers, its funnel, the answers waiting
/// for the host and what happens when the host lets someone in.
///
/// Reads the form editor (summary and questions) bound to the signed-in
/// manager, the published version's analytics and the unreviewed answers.
/// Let in commits the existing application review command; Publish the
/// editor's publish command; Settings opens the form's settings view.
class HostFormScreen extends ConsumerStatefulWidget {
  const HostFormScreen({
    super.key,
    required this.organizerId,
    required this.formId,
    this.now,
  });

  final String organizerId;
  final String formId;

  /// A fixed clock for previews and tests; null reads the device clock.
  final DateTime? now;

  @override
  ConsumerState<HostFormScreen> createState() => _HostFormScreenState();
}

class _HostFormScreenState extends ConsumerState<HostFormScreen> {
  final Set<String> _lettingIn = {};

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final actor = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = actor.isSettledData ? actor.value : null;
    final editorProvider = hostFormEditorControllerProvider(
      widget.organizerId,
      widget.formId,
    );
    final editorValue = catchAsyncStateFromAsyncValue(
      ref.watch(editorProvider),
    );
    final notifier = ref.read(editorProvider.notifier);
    // A refresh may keep the last account's editor; only the bound one shows.
    final editor = editorValue.isSettledData && notifier.editorBoundTo(uid)
        ? editorValue.value
        : null;
    final form = editor?.editor.form;
    final versionId = form?.activeVersionId;
    final analytics = versionId == null
        ? null
        : catchAsyncStateFromAsyncValue(
            ref.watch(
              hostFormAnalyticsProvider(
                organizerId: widget.organizerId,
                formId: widget.formId,
                versionId: versionId,
              ),
            ),
          ).value;
    final waitingValue = uid == null || form == null
        ? null
        : catchAsyncStateFromAsyncValue(
            ref.watch(hostFormResponsesControllerProvider(_waiting(uid))),
          );
    final state = editor == null
        ? const HostFormState.loading()
        : HostFormState(
            status: HostFormStatus.content,
            form: editor.editor.form,
            questionLabels: [
              for (final section in editor.editor.definition.sections)
                for (final question in section.questions)
                  if (question.label.trim().isNotEmpty) question.label.trim(),
            ],
            analytics: analytics,
            waiting: [
              for (final entry
                  in waitingValue?.value?.inboxEntries ??
                      const <HostFormInboxEntry>[])
                if (entry.application?.reviewStatus ==
                    HostApplicationReviewStatus.submitted)
                  entry,
            ],
            waitingPending: waitingValue?.value == null,
            lettingIn: _lettingIn,
            busy: editor.operationInProgress,
          );
    final body = editorValue.hasError && editor == null
        ? CatchLocalizedErrorState(
            editorValue.error!,
            context: AppErrorContext.forms,
            onRetry: notifier.reload,
          )
        : HostFormBody(
            state: state,
            now: widget.now ?? DateTime.now(),
            onOpenResponse: _openResponse,
            onLetIn: (entry) => _letIn(uid, entry),
            onSeeAll: () => _openForm(view: 'responses'),
            onChangeConsequences: () => context.pushNamed(
              Routes.hostFormAutomationsScreen.name,
              pathParameters: {'formId': widget.formId},
              queryParameters: {'organizerId': widget.organizerId},
            ),
            onShare: () => context.pushNamed(
              Routes.hostFormShareScreen.name,
              pathParameters: {'formId': widget.formId},
              queryParameters: {'organizerId': widget.organizerId},
            ),
            onEditQuestions: () => _openForm(view: 'questions'),
            onPublish: _publish,
          );
    return CatchRoot(
      child: CatchScreen(
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: form?.title ?? l10n.hostFormsFormTitle,
          kicker: l10n.hostFormsFormTitle,
          back: CatchTopBarBack(label: l10n.hostFormsBack),
          action: CatchTopBarAction(
            label: l10n.hostFormsSettings,
            onPressed: form == null ? null : () => _openForm(view: 'settings'),
          ),
        ),
        body: body,
      ),
    );
  }

  HostFormResponseListRequest _waiting(String uid) =>
      HostFormResponseListRequest(
        organizerId: widget.organizerId,
        accountUid: uid,
        formId: widget.formId,
        includeApplications: true,
        reviewStatus: HostApplicationReviewStatus.submitted,
      );

  void _openForm({required String view}) => context.pushNamed(
    Routes.hostFormBuilderScreen.name,
    pathParameters: {'formId': widget.formId},
    queryParameters: {'organizerId': widget.organizerId, 'view': view},
  );

  void _openResponse(HostFormInboxEntry entry) {
    if (entry.application case final application?) {
      context.pushNamed(
        Routes.hostApplicationDetailScreen.name,
        pathParameters: {'applicationId': application.applicationId},
        queryParameters: {'organizerId': widget.organizerId},
      );
    } else if (entry.response case final response?) {
      context.pushNamed(
        Routes.hostFormResponseDetailScreen.name,
        pathParameters: {'responseId': response.responseId},
        queryParameters: {'organizerId': widget.organizerId},
      );
    }
  }

  Future<void> _letIn(String? uid, HostFormInboxEntry entry) async {
    final application = entry.application;
    if (uid == null || application == null) return;
    setState(() => _lettingIn.add(application.applicationId));
    try {
      await ref
          .read(hostApplicationsControllerProvider)
          .reviewApplication(
            organizerId: widget.organizerId,
            applicationId: application.applicationId,
            expectedRevision: application.revision,
            reviewStatus: HostApplicationReviewStatus.approved,
          );
      ref.invalidate(hostFormResponsesControllerProvider(_waiting(uid)));
      if (mounted) {
        showCatchNotice(context, context.l10n.hostFormsLetInDone);
      }
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.applications,
        );
      }
    } finally {
      if (mounted) {
        setState(() => _lettingIn.remove(application.applicationId));
      }
    }
  }

  Future<void> _publish() async {
    final notifier = ref.read(
      hostFormEditorControllerProvider(
        widget.organizerId,
        widget.formId,
      ).notifier,
    );
    final published = await notifier.publish();
    if (!mounted) return;
    if (published) {
      showCatchNotice(context, context.l10n.hostFormsPublished);
      ref.invalidate(hostFormsDirectoryControllerProvider);
      return;
    }
    final error = ref
        .read(
          hostFormEditorControllerProvider(widget.organizerId, widget.formId),
        )
        .asData
        ?.value
        .error;
    showCatchNoticeError(
      context,
      error ?? StateError(context.l10n.hostFormsPublishBlocked),
      errorContext: AppErrorContext.forms,
    );
  }
}
