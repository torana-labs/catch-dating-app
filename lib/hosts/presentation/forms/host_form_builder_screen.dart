import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_editor_actions.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_editor_notice.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_editor_viewport.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_overview_section_list.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payments_section_list.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_questions_page_body.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_responses_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_settings_section_list.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_workspace_header.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_workspace_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

enum _BuilderAction { preview, share, settings, pause, resume, archive }

class HostFormBuilderScreen extends ConsumerStatefulWidget {
  const HostFormBuilderScreen({
    super.key,
    required this.organizerId,
    required this.formId,
    this.initialView,
  });

  final String organizerId;
  final String formId;
  final HostFormWorkspaceView? initialView;

  @override
  ConsumerState<HostFormBuilderScreen> createState() =>
      _HostFormBuilderScreenState();
}

class _HostFormBuilderScreenState extends ConsumerState<HostFormBuilderScreen> {
  int? _selectedSection;
  int? _selectedQuestion;
  HostFormWorkspaceView? _view;

  @override
  void initState() {
    super.initState();
    _view = widget.initialView;
  }

  @override
  void didUpdateWidget(covariant HostFormBuilderScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.formId != widget.formId ||
        oldWidget.organizerId != widget.organizerId) {
      _selectedSection = null;
      _selectedQuestion = null;
      _view = widget.initialView;
    } else if (oldWidget.initialView != widget.initialView) {
      _view = widget.initialView;
    }
  }

  @override
  Widget build(BuildContext context) {
    final actor = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final responseAccountId = actor.isSettledData ? actor.value : null;
    final editor = ref.watch(
      hostFormEditorControllerProvider(widget.organizerId, widget.formId),
    );
    final notifier = ref.read(
      hostFormEditorControllerProvider(
        widget.organizerId,
        widget.formId,
      ).notifier,
    );
    final editorState = catchAsyncStateFromAsyncValue(editor);
    final editorValue =
        editorState.isSettledData && notifier.editorBoundTo(responseAccountId)
        ? editorState.value
        : null;
    // CatchAsyncBoundary may retain a previous account's AsyncData on refresh.
    // Only the actor-bound editor can reach the body or its actions.
    final safeEditor = editorValue != null
        ? AsyncData<HostFormEditorState>(editorValue)
        : editorState.isTerminalError
        ? AsyncError<HostFormEditorState>(
            editorState.error!,
            editorState.stackTrace ?? StackTrace.current,
          )
        : const AsyncLoading<HostFormEditorState>();
    final compact =
        MediaQuery.sizeOf(context).width <
        CatchFormWorkspaceTokens.formBuilderExpandedBreakpoint;
    final view =
        _view ??
        (editorValue?.editor.form.activeVersionId == null
            ? HostFormWorkspaceView.questions
            : HostFormWorkspaceView.overview);
    final settings = view == HostFormWorkspaceView.settings;

    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: settings
            ? context.l10n.hostFormSettings
            : context.l10n.hostAudienceFormWorkspaceTitle,
        subtitle: settings && editorValue != null
            ? hostFormSaveLabel(context, editorValue)
            : null,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        actions: [
          if (view == HostFormWorkspaceView.questions && compact)
            CatchIconAction.toolbar(
              icon: CatchIcons.show,
              tooltip: context.l10n.hostFormPreview,
              onPressed: editorValue == null ? null : _openPreview,
            ),
          if (view == HostFormWorkspaceView.questions &&
              !compact &&
              editorValue != null &&
              editorValue.editor.form.status !=
                  HostFormLifecycleStatus.archived)
            CatchTopBarPrimaryButton(
              label:
                  editorValue.editor.form.status ==
                      HostFormLifecycleStatus.published
                  ? context.l10n.hostFormReviewPublishChanges
                  : context.l10n.hostFormReviewPublish,
              icon: CatchIcons.success,
              onPressed: editorValue.operationInProgress
                  ? null
                  : () => _reviewAndPublish(notifier, editorValue),
            ),
          if (editorValue != null &&
              _builderActions(
                context,
                editorValue,
                includePreview: !compact,
              ).isNotEmpty)
            CatchActionMenu<_BuilderAction>(
              tooltip: context.l10n.hostFormsActions,
              items: _builderActions(
                context,
                editorValue,
                includePreview: !compact,
              ),
              onSelected: (action) => _runBuilderAction(notifier, action),
            ),
        ],
      ),
      footer: _HostFormBuilderBottomAction(
        state: editorValue,
        visible: compact && view == HostFormWorkspaceView.questions,
        onReviewAndPublish: editorValue == null
            ? null
            : () => _reviewAndPublish(notifier, editorValue),
      ),
      body: CatchRouteBody.fullBleed(
        child: SafeArea(
          top: false,
          bottom: false,
          child: CatchAsyncBoundary<HostFormEditorState>(
            value: safeEditor,
            onRetry: notifier.reload,
            initialLoadTimeout: null,
            loadingBuilder: (_) => const CatchStateViewport.loading(
              accountForBottomOverlay: false,
            ),
            errorBuilder: (_, error, _, onBoundaryRetry) => CatchPageBody(
              child: CatchLocalizedErrorState(
                error,
                context: AppErrorContext.forms,
                onRetry: onBoundaryRetry,
              ),
            ),
            builder: (context, value) {
              final header = Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  HostFormWorkspaceHeader(
                    state: value,
                    selected: view,
                    onChanged: (next) => setState(() => _view = next),
                  ),
                  if ((view == HostFormWorkspaceView.questions || settings) &&
                      (value.canUndo || value.canRedo)) ...[
                    gapH12,
                    Wrap(
                      alignment: WrapAlignment.end,
                      spacing: CatchSpacing.s2,
                      children: [
                        CatchIconAction(
                          tooltip: context.l10n.hostFormUndo,
                          onPressed: value.canUndo && !value.operationInProgress
                              ? notifier.undo
                              : null,
                          child: Icon(CatchIcons.undo),
                        ),
                        CatchIconAction(
                          tooltip: context.l10n.hostFormRedo,
                          onPressed: value.canRedo && !value.operationInProgress
                              ? notifier.redo
                              : null,
                          child: Icon(CatchIcons.redo),
                        ),
                      ],
                    ),
                  ],
                ],
              );
              if (!compact && view == HostFormWorkspaceView.questions) {
                final definition = value.editor.definition;
                final sectionIndex = _validSectionIndex(definition);
                return Column(
                  children: [
                    CatchPageBody.screen(
                      variant: CatchPageBodyVariant.fixed,
                      pb: CatchSpacing.s4,
                      child: header,
                    ),
                    Expanded(
                      child: HostFormEditorViewport(
                        organizerId: widget.organizerId,
                        state: value,
                        notifier: notifier,
                        sectionIndex: sectionIndex,
                        questionIndex: _validQuestionIndex(
                          definition,
                          sectionIndex,
                        ),
                        onSelectionChanged: (section, question) => setState(() {
                          _selectedSection = section;
                          _selectedQuestion = question;
                        }),
                      ),
                    ),
                  ],
                );
              }
              final body = switch (view) {
                HostFormWorkspaceView.overview => HostFormOverviewSectionList(
                  organizerId: widget.organizerId,
                  state: value,
                  onQuestions: () =>
                      setState(() => _view = HostFormWorkspaceView.questions),
                  onReviewResponses: () =>
                      setState(() => _view = HostFormWorkspaceView.responses),
                  onSettings: () => openHostFormSettings(
                    context,
                    organizerId: widget.organizerId,
                    formId: widget.formId,
                  ),
                  onShare: () =>
                      _runBuilderAction(notifier, _BuilderAction.share),
                  onPreview: _openPreview,
                ),
                HostFormWorkspaceView.questions => HostFormQuestionsPageBody(
                  organizerId: widget.organizerId,
                  formId: widget.formId,
                  state: value,
                  notifier: notifier,
                  onSelectionChanged: (section, question) => setState(() {
                    _selectedSection = section;
                    _selectedQuestion = question;
                  }),
                ),
                HostFormWorkspaceView.responses => HostFormResponsesSection(
                  key: ValueKey(
                    'form-responses-${widget.organizerId}-'
                    '${widget.formId}-$responseAccountId',
                  ),
                  organizerId: widget.organizerId,
                  accountId: responseAccountId,
                  requireAccount: true,
                  formId: widget.formId,
                  formTitle: value.editor.definition.title,
                  showFormContext: false,
                  queryCapability: value.editor.form.activeVersionId != null
                      ? hostResponseQueryCapability(
                          context.l10n,
                          versionId: value.editor.form.activeVersionId!,
                        )
                      : null,
                ),
                HostFormWorkspaceView.payments => HostFormPaymentsSectionList(
                  organizerId: widget.organizerId,
                  formId: widget.formId,
                ),
                HostFormWorkspaceView.settings => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    HostFormEditorNotice(state: value, notifier: notifier),
                    HostFormSettingsSectionList(
                      organizerId: widget.organizerId,
                      definition: value.editor.definition,
                      notifier: notifier,
                      accountId: responseAccountId,
                      enableEventTargetSettings: true,
                      hasPublishedVersion:
                          value.editor.form.activeVersionId != null,
                    ),
                  ],
                ),
              };
              if (view == HostFormWorkspaceView.responses ||
                  view == HostFormWorkspaceView.payments) {
                return CustomScrollView(
                  key: PageStorageKey('host-form-builder-${view.name}'),
                  slivers: [
                    CatchPageBody.sliver(
                      child: SliverToBoxAdapter(child: header),
                    ),
                    body,
                    const SliverToBoxAdapter(child: gapH40),
                  ],
                );
              }
              return CatchPageBody.screen(
                key: ValueKey('host-form-builder-${view.name}'),
                pb: CatchSpacing.s10,
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(
                      maxWidth: CatchLayout.maxContentWidth,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [header, gapH24, body],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  int? _validSectionIndex(HostFormDefinition definition) {
    if (definition.sections.isEmpty) return null;
    final selected = _selectedSection ?? 0;
    return selected.clamp(0, definition.sections.length - 1).toInt();
  }

  int? _validQuestionIndex(HostFormDefinition definition, int? sectionIndex) {
    if (sectionIndex == null) return null;
    final questions = definition.sections[sectionIndex].questions;
    if (questions.isEmpty || _selectedQuestion == null) return null;
    return _selectedQuestion!.clamp(0, questions.length - 1).toInt();
  }

  List<CatchActionMenuItem<_BuilderAction>> _builderActions(
    BuildContext context,
    HostFormEditorState state, {
    required bool includePreview,
  }) {
    final status = state.editor.form.status;
    return [
      CatchActionMenuItem(
        value: _BuilderAction.settings,
        label: context.l10n.hostFormSettings,
        icon: CatchIcons.settings,
      ),
      if (includePreview)
        CatchActionMenuItem(
          value: _BuilderAction.preview,
          label: context.l10n.hostFormPreview,
          icon: CatchIcons.show,
        ),
      if (state.editor.form.activeVersionId != null)
        CatchActionMenuItem(
          value: _BuilderAction.share,
          label: context.l10n.hostFormShare,
          icon: CatchIcons.share,
        ),
      if (status == HostFormLifecycleStatus.published)
        CatchActionMenuItem(
          value: _BuilderAction.pause,
          label: context.l10n.hostFormsPause,
          icon: CatchIcons.pause,
        ),
      if (status == HostFormLifecycleStatus.paused)
        CatchActionMenuItem(
          value: _BuilderAction.resume,
          label: context.l10n.hostFormsResume,
          icon: CatchIcons.play,
        ),
      if (status != HostFormLifecycleStatus.archived)
        CatchActionMenuItem(
          value: _BuilderAction.archive,
          label: context.l10n.hostFormsArchive,
          icon: CatchIcons.archive,
          isDestructive: true,
        ),
    ];
  }

  void _openPreview() => context.pushNamed(
    Routes.hostFormPreviewScreen.name,
    pathParameters: {'formId': widget.formId},
    queryParameters: {'organizerId': widget.organizerId},
  );

  Future<void> _runBuilderAction(
    HostFormEditorController notifier,
    _BuilderAction action,
  ) async {
    switch (action) {
      case _BuilderAction.settings:
        await openHostFormSettings(
          context,
          organizerId: widget.organizerId,
          formId: widget.formId,
        );
      case _BuilderAction.preview:
        _openPreview();
      case _BuilderAction.share:
        await context.pushNamed(
          Routes.hostFormShareScreen.name,
          pathParameters: {'formId': widget.formId},
          queryParameters: {'organizerId': widget.organizerId},
        );
      case _BuilderAction.pause ||
          _BuilderAction.resume ||
          _BuilderAction.archive:
        await _setLifecycle(notifier, action);
    }
  }

  Future<void> _reviewAndPublish(
    HostFormEditorController notifier,
    HostFormEditorState state,
  ) async {
    final definition = state.editor.definition;
    final questionCount = definition.sections.fold<int>(
      0,
      (count, section) => count + section.questions.length,
    );
    final shouldPublish = await showCatchBottomSheet<bool>(
      context: context,
      builder: (sheetContext) => CatchSheet.standard(
        title: state.editor.form.status == HostFormLifecycleStatus.published
            ? context.l10n.hostFormReviewChangesTitle
            : context.l10n.hostFormReviewPublishTitle,
        subtitle: context.l10n.hostFormReviewPublishSubtitle,
        footer: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CatchButton.sheet(
              role: CatchButtonEmphasis.alternative,
              label: context.l10n.hostFormPreview,

              onPressed: () {
                Navigator.of(sheetContext).pop(false);
                _openPreview();
              },
            ),
            gapH8,
            CatchButton.sheet(
              role: CatchButtonEmphasis.commit,
              label:
                  state.editor.form.status == HostFormLifecycleStatus.published
                  ? context.l10n.hostFormPublishChanges
                  : context.l10n.hostFormPublish,

              onPressed: () => Navigator.of(sheetContext).pop(true),
            ),
          ],
        ),
        child: CatchSection.fieldRows(
          first: true,
          children: [
            CatchField.read(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostFormQuestionsTitle,
              body: context.l10n.hostFormQuestionCount(count: questionCount),
            ),
            CatchField.read(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostFormIdentityLabel,
              body: hostFormIdentityLabel(context, definition.identityPolicy),
            ),
            CatchField.read(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostFormConsequencesTitle,
              body: hostFormBuilderConsequenceSummary(
                context,
                purpose: definition.purpose,
                identityPolicy: definition.identityPolicy,
                consequences: state.editor.form.consequences,
              ),
              bodyMaxLines: 8,
            ),
            CatchField.read(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostFormMessagingPermissionTitle,
              body: context.l10n.hostFormConsequenceNoMessagingPermission,
              bodyMaxLines: 4,
            ),
            CatchField.read(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostFormPaymentTitle,
              body: definition.payment == null
                  ? context.l10n.hostFormPaymentFree
                  : '₹${definition.payment!.rupees} · ${definition.payment!.description}\n'
                        '${definition.payment!.refundPolicy}\n'
                        '${context.l10n.hostFormPaymentPublishHelp}',
              bodyMaxLines: 12,
            ),
            CatchField.read(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostFormAvailability,
              body: hostFormAvailabilitySummary(context, definition),
            ),
          ],
        ),
      ),
    );
    if (shouldPublish == true) await _publish(notifier);
  }

  Future<void> _publish(HostFormEditorController notifier) async {
    final published = await notifier.publish();
    if (!mounted) return;
    if (published) {
      showCatchNotice(context, context.l10n.hostFormPublished);
    } else if (ref
            .read(
              hostFormEditorControllerProvider(
                widget.organizerId,
                widget.formId,
              ),
            )
            .asData
            ?.value
            .error
        case final error?) {
      showCatchNoticeError(context, error);
    }
  }

  Future<void> _setLifecycle(
    HostFormEditorController notifier,
    _BuilderAction action,
  ) async {
    final lifecycle = switch (action) {
      _BuilderAction.pause => HostFormLifecycleAction.pause,
      _BuilderAction.resume => HostFormLifecycleAction.resume,
      _BuilderAction.archive => HostFormLifecycleAction.archive,
      _BuilderAction.preview ||
      _BuilderAction.settings ||
      _BuilderAction.share => throw StateError('Expected a lifecycle action.'),
    };
    final changed = await notifier.setLifecycle(lifecycle);
    if (!mounted || changed) return;
    final error = ref
        .read(
          hostFormEditorControllerProvider(widget.organizerId, widget.formId),
        )
        .asData
        ?.value
        .error;
    if (error != null) showCatchNoticeError(context, error);
  }
}

class _HostFormBuilderBottomAction extends StatelessWidget {
  const _HostFormBuilderBottomAction({
    required this.state,
    required this.visible,
    required this.onReviewAndPublish,
  });

  final HostFormEditorState? state;
  final bool visible;
  final VoidCallback? onReviewAndPublish;

  @override
  Widget build(BuildContext context) {
    final current = state;
    if (current == null ||
        !visible ||
        current.editor.form.status == HostFormLifecycleStatus.archived) {
      return const SizedBox.shrink();
    }
    final isLoading = current.operationInProgress;
    return CatchDock.primary(
      label: current.editor.form.status == HostFormLifecycleStatus.published
          ? context.l10n.hostFormReviewPublishChanges
          : context.l10n.hostFormReviewPublish,
      isLoading: isLoading,
      buttonMode: CatchButtonMode.rounded,
      onPressed: isLoading ? null : onReviewAndPublish,
    );
  }
}
