import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/hosts/forms/form_publish_review_sheet.dart';
import 'package:catch_dating_app/hosts/forms/form_settings_body.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// What the settings menu can do to the form.
enum HostFormSettingsAction { preview, share, pause, resume, archive }

/// One form's settings: its details, where it is used, who can answer,
/// the WhatsApp choices it offers, its fee, its look, when it is open,
/// its consent copy, what people see after sending and its logic rules.
///
/// Reads the form editor bound to the signed-in manager. Every edit goes
/// through the editor controller, which keeps the draft and saves it a
/// moment later; Undo and Redo step through this visit's edits. The menu
/// previews, shares, pauses, resumes or archives the form, and Review and
/// publish shows what will go live before running the publish command.
class HostFormSettingsScreen extends ConsumerWidget {
  const HostFormSettingsScreen({
    super.key,
    required this.organizerId,
    required this.formId,
  });

  final String organizerId;
  final String formId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final actor = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = actor.isSettledData ? actor.value : null;
    final provider = hostFormEditorControllerProvider(organizerId, formId);
    final value = catchAsyncStateFromAsyncValue(ref.watch(provider));
    final notifier = ref.read(provider.notifier);
    // A refresh may keep the last account's editor; only the bound one shows.
    final editor = value.isSettledData && notifier.editorBoundTo(uid)
        ? value.value
        : null;
    final form = editor?.editor.form;
    final actions = _HostFormSettingsActions(
      context: context,
      ref: ref,
      organizerId: organizerId,
      formId: formId,
    );
    final Widget body;
    if (value.hasError && editor == null) {
      body = CatchPageBody.screen(
        child: CatchLocalizedErrorState(
          value.error!,
          context: AppErrorContext.forms,
          onRetry: notifier.reload,
        ),
      );
    } else if (editor == null) {
      body = const CatchPageBody.screen(child: CatchLoadingIndicator());
    } else {
      body = HostFormSettingsBody(
        organizerId: organizerId,
        accountId: uid,
        state: editor,
        editor: notifier,
      );
    }
    final canPublish =
        form != null && form.status != HostFormLifecycleStatus.archived;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-form-settings-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostFormSettings,
          kicker: editor?.editor.definition.title,
          back: CatchTopBarBack(label: l10n.hostFormsBack),
          actions: [
            if (editor != null && (editor.canUndo || editor.canRedo)) ...[
              CatchIconAction(
                key: const ValueKey<String>('host-form-settings-undo'),
                tooltip: l10n.hostFormUndo,
                size: GeneratedCatchSizeTokens.controlMd,
                onPressed: editor.canUndo && !editor.operationInProgress
                    ? notifier.undo
                    : null,
                child: CatchIcon(CatchIcons.undo),
              ),
              CatchIconAction(
                key: const ValueKey<String>('host-form-settings-redo'),
                tooltip: l10n.hostFormRedo,
                size: GeneratedCatchSizeTokens.controlMd,
                onPressed: editor.canRedo && !editor.operationInProgress
                    ? notifier.redo
                    : null,
                child: CatchIcon(CatchIcons.redo),
              ),
            ],
            if (editor != null)
              HostFormSettingsMenu(
                status: editor.editor.form.status,
                published: editor.editor.form.activeVersionId != null,
                onSelected: (action) => unawaited(actions.run(action)),
              ),
          ],
        ),
        body: body,
        dock: !canPublish
            ? null
            : CatchDock(
                primary: CatchDockAction(
                  label: form.status == HostFormLifecycleStatus.published
                      ? l10n.hostFormReviewPublishChanges
                      : l10n.hostFormReviewPublish,
                  loading: editor!.operationInProgress,
                  onPressed: editor.operationInProgress
                      ? null
                      : () => unawaited(actions.reviewAndPublish(editor)),
                ),
              ),
      ),
    );
  }
}

/// The settings menu: preview and share the form, and pause, resume or
/// archive it as its status allows.
class HostFormSettingsMenu extends StatelessWidget {
  const HostFormSettingsMenu({
    super.key,
    required this.status,
    required this.published,
    required this.onSelected,
  });

  final HostFormLifecycleStatus status;

  /// A version is live, so the form has a link to share.
  final bool published;
  final ValueChanged<HostFormSettingsAction> onSelected;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchMenu<HostFormSettingsAction>.anchored(
      key: const ValueKey<String>('host-form-settings-menu'),
      items: [
        CatchMenuItem(
          value: HostFormSettingsAction.preview,
          label: l10n.hostFormPreview,
          icon: CatchIcons.show,
        ),
        if (published)
          CatchMenuItem(
            value: HostFormSettingsAction.share,
            label: l10n.hostFormShare,
            icon: CatchIcons.share,
          ),
        if (status == HostFormLifecycleStatus.published)
          CatchMenuItem(
            value: HostFormSettingsAction.pause,
            label: l10n.hostFormsPause,
            icon: CatchIcons.pause,
          ),
        if (status == HostFormLifecycleStatus.paused)
          CatchMenuItem(
            value: HostFormSettingsAction.resume,
            label: l10n.hostFormsResume,
            icon: CatchIcons.play,
          ),
        if (status != HostFormLifecycleStatus.archived)
          CatchMenuItem(
            value: HostFormSettingsAction.archive,
            label: l10n.hostFormsArchive,
            icon: CatchIcons.archive,
            danger: true,
          ),
      ],
      onSelected: (action, _) => onSelected(action),
      builder: (context, controller, _) => CatchIconAction(
        tooltip: l10n.hostFormsActions,
        size: GeneratedCatchSizeTokens.controlMd,
        onPressed: controller.isOpen ? controller.close : controller.open,
        child: CatchIcon(CatchIcons.more),
      ),
    );
  }
}

/// What the menu and the dock do: open the preview or share page, change
/// the form's lifecycle, and review then publish.
class _HostFormSettingsActions {
  const _HostFormSettingsActions({
    required this.context,
    required this.ref,
    required this.organizerId,
    required this.formId,
  });

  final BuildContext context;
  final WidgetRef ref;
  final String organizerId;
  final String formId;

  HostFormEditorController get _editor =>
      ref.read(hostFormEditorControllerProvider(organizerId, formId).notifier);

  Object? get _error => ref
      .read(hostFormEditorControllerProvider(organizerId, formId))
      .asData
      ?.value
      .error;

  Future<void> run(HostFormSettingsAction action) async {
    switch (action) {
      case HostFormSettingsAction.preview:
        _openPreview();
      case HostFormSettingsAction.share:
        await context.pushNamed(
          Routes.hostFormShareScreen.name,
          pathParameters: {'formId': formId},
          queryParameters: {'organizerId': organizerId},
        );
      case HostFormSettingsAction.pause:
        await _lifecycle(HostFormLifecycleAction.pause);
      case HostFormSettingsAction.resume:
        await _lifecycle(HostFormLifecycleAction.resume);
      case HostFormSettingsAction.archive:
        await _lifecycle(HostFormLifecycleAction.archive);
    }
  }

  void _openPreview() => context.pushNamed(
    Routes.hostFormPreviewScreen.name,
    pathParameters: {'formId': formId},
    queryParameters: {'organizerId': organizerId},
  );

  Future<void> _lifecycle(HostFormLifecycleAction action) async {
    final changed = await _editor.setLifecycle(action);
    if (changed || !context.mounted) return;
    if (_error case final error?) {
      showCatchNoticeError(context, error, errorContext: AppErrorContext.forms);
    }
  }

  Future<void> reviewAndPublish(HostFormEditorState state) async {
    final choice = await showHostFormPublishReview(context, state: state);
    if (!context.mounted) return;
    switch (choice) {
      case HostFormPublishReviewChoice.preview:
        _openPreview();
      case HostFormPublishReviewChoice.publish:
        final published = await _editor.publish();
        if (!context.mounted) return;
        if (published) {
          showCatchNotice(context, context.l10n.hostFormPublished);
        } else if (_error case final error?) {
          showCatchNoticeError(
            context,
            error,
            errorContext: AppErrorContext.forms,
          );
        }
      case null:
        return;
    }
  }
}
