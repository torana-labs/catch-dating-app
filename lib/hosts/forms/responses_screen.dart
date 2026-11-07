import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_analytics.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_labels.dart';
import 'package:catch_dating_app/hosts/forms/responses_body.dart';
import 'package:catch_dating_app/hosts/forms/responses_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The answers to one form, or to every form when [formId] is null.
///
/// Reads the answers page by page (with each application's review status),
/// filtered by review status on an application form; the form itself for
/// its title and count; and, on Results, the published version's
/// per-question counts. Opening an answer carries the filtered queue so the
/// answer page can step through it.
class HostResponsesScreen extends ConsumerStatefulWidget {
  const HostResponsesScreen({
    super.key,
    required this.organizerId,
    this.formId,
    this.now,
  });

  final String organizerId;
  final String? formId;

  /// A fixed clock for previews and tests; null reads the device clock.
  final DateTime? now;

  @override
  ConsumerState<HostResponsesScreen> createState() =>
      _HostResponsesScreenState();
}

class _HostResponsesScreenState extends ConsumerState<HostResponsesScreen> {
  HostApplicationReviewStatus _filter = HostApplicationReviewStatus.submitted;
  HostResponsesView _view = HostResponsesView.responses;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final actor = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = actor.isSettledData ? actor.value : null;
    final formId = widget.formId;
    final editor = formId == null
        ? null
        : catchAsyncStateFromAsyncValue(
            ref.watch(
              hostFormEditorControllerProvider(widget.organizerId, formId),
            ),
          ).value;
    final form = editor?.editor.form;
    final reviewed =
        formId != null && form?.purpose == HostFormPurpose.application;
    final waitingForForm = formId != null && form == null;
    final request = uid == null || waitingForForm
        ? null
        : _request(uid, reviewed ? _filter : null);
    final value = _responses(request);
    final page = value?.value;
    final versionId = form?.activeVersionId;
    final results = _view == HostResponsesView.results
        ? _results(versionId)
        : null;
    final state = HostResponsesState(
      status: page == null
          ? HostResponsesStatus.loading
          : HostResponsesStatus.content,
      view: _view,
      forForm: formId != null,
      filter: reviewed ? _filter : null,
      entries: page?.inboxEntries ?? const [],
      canLoadMore: page?.canLoadMore ?? false,
      loadingMore: page?.loadingMore ?? false,
      loadMoreError: page?.loadMoreError,
      results: results?.value?.questions ?? const [],
      resultsPending:
          _view == HostResponsesView.results &&
          versionId != null &&
          results?.value == null &&
          results?.error == null,
    );
    final Widget body;
    final error = value?.error;
    if (error != null && page == null) {
      body = CatchLocalizedErrorState(
        error,
        context: AppErrorContext.formResponses,
        onRetry: () =>
            ref.invalidate(hostFormResponsesControllerProvider(request!)),
      );
    } else {
      body = HostResponsesBody(
        state: state,
        now: widget.now ?? DateTime.now(),
        onView: (view) {
          if (view == HostResponsesView.questions) {
            context.pushNamed(
              Routes.hostFormBuilderScreen.name,
              pathParameters: {'formId': formId!},
              queryParameters: {
                'organizerId': widget.organizerId,
                'view': 'questions',
              },
            );
            return;
          }
          setState(() => _view = view);
        },
        onFilter: (status) => setState(() => _filter = status),
        onOpen: _open,
        onLoadMore: () {
          if (request == null) return;
          unawaited(
            ref
                .read(hostFormResponsesControllerProvider(request).notifier)
                .loadMore(),
          );
        },
      );
    }
    return CatchRoot(
      child: CatchScreen(
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: form?.title ?? l10n.hostFormsResponsesTitle,
          kicker: form == null
              ? null
              : l10n.hostFormsResponsesKicker(
                  kind: hostFormKindLabel(l10n, form.purpose),
                  count: form.submittedResponseCount,
                ),
          back: CatchTopBarBack(label: l10n.hostFormsBack),
          action: formId == null
              ? null
              : CatchTopBarAction(
                  label: l10n.hostFormsShareTitle,
                  onPressed: () => context.pushNamed(
                    Routes.hostFormShareScreen.name,
                    pathParameters: {'formId': formId},
                    queryParameters: {'organizerId': widget.organizerId},
                  ),
                ),
        ),
        body: body,
      ),
    );
  }

  CatchAsyncState<HostFormResponsesState>? _responses(
    HostFormResponseListRequest? request,
  ) => request == null
      ? null
      : catchAsyncStateFromAsyncValue(
          ref.watch(hostFormResponsesControllerProvider(request)),
        );

  CatchAsyncState<HostFormAnalytics>? _results(String? versionId) {
    final formId = widget.formId;
    if (formId == null || versionId == null) return null;
    return catchAsyncStateFromAsyncValue(
      ref.watch(
        hostFormAnalyticsProvider(
          organizerId: widget.organizerId,
          formId: formId,
          versionId: versionId,
        ),
      ),
    );
  }

  HostFormResponseListRequest _request(
    String uid,
    HostApplicationReviewStatus? status,
  ) => HostFormResponseListRequest(
    organizerId: widget.organizerId,
    accountUid: uid,
    formId: widget.formId,
    includeApplications: true,
    reviewStatus: status,
  );

  void _open(HostFormInboxEntry entry) {
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
}
