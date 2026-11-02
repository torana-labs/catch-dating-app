import 'dart:async';

import 'package:catch_dating_app/chats/presentation/event_profile_controller.dart';
import 'package:catch_dating_app/chats/presentation/widgets/event_profile_editor_section.dart';
import 'package:catch_dating_app/chats/presentation/widgets/event_profile_identity_section.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_profile.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Account-bound editor and protected participant view for one event chat.
class EventProfileScreen extends ConsumerStatefulWidget {
  const EventProfileScreen({
    super.key,
    required this.eventId,
    this.participantUid,
  });
  final String eventId;
  final String? participantUid;
  @override
  ConsumerState<EventProfileScreen> createState() => _EventProfileScreenState();
}

class _EventProfileScreenState extends ConsumerState<EventProfileScreen>
    with WidgetsBindingObserver {
  bool _resumed = true;
  bool? _active;
  bool _ownedPreviewOpen = false;
  final ValueNotifier<bool> _previewValid = ValueNotifier(true);
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _resumed =
        WidgetsBinding.instance.lifecycleState == null ||
        WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed;
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _previewValid.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) _previewValid.value = false;
    setState(() => _resumed = state == AppLifecycleState.resumed);
  }

  void _syncActive(bool active) {
    if (_active == active) return;
    _active = active;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _active != active) return;
      if (widget.participantUid case final uid?) {
        ref
            .read(
              eventParticipantProfileControllerProvider(
                widget.eventId,
                uid,
              ).notifier,
            )
            .setForeground(active);
      } else {
        ref
            .read(eventProfileEditorControllerProvider(widget.eventId).notifier)
            .setForeground(active);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final own = widget.participantUid == null;
    final editor = eventProfileEditorControllerProvider(widget.eventId);
    final viewer = eventParticipantProfileControllerProvider(
      widget.eventId,
      widget.participantUid ?? '',
    );
    final editorValue = own ? ref.watch(editor) : null;
    final editorDisplay = editorValue == null
        ? null
        : catchAsyncStateFromAsyncValue(editorValue);
    final busy =
        editorDisplay?.isSettledData == true &&
        editorDisplay?.value?.busy == true;
    final route = ModalRoute.of(context);
    final active =
        _resumed &&
        ((route?.isCurrent ?? true) ||
            (_ownedPreviewOpen && (route?.isActive ?? false)));
    _syncActive(active);
    final profileDisplay = own
        ? catchAsyncStateFromAsyncValue(ref.watch(watchUserProfileProvider))
        : null;
    final profile = profileDisplay?.isSettledData == true
        ? profileDisplay?.value
        : null;
    final account = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final uid = account.isSettledData ? account.value : null;
    return PopScope(
      canPop: !busy,
      child: AbsorbPointer(
        absorbing: busy,
        child: CatchRouteScaffold(
          topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
            title: own
                ? context.l10n.eventProfileMine
                : context.l10n.eventProfileTitle,
            navigation: const CatchTopBarNavigation(
              mode: CatchTopBarNavigationMode.back,
            ),
            emphasis: scrolledUnder
                ? CatchTopBarEmphasis.divided
                : CatchTopBarEmphasis.plain,
            actions: [
              CatchIconAction.toolbar(
                tooltip: context.l10n.eventChatRefresh,
                icon: CatchIcons.refresh,
                onPressed: !active || busy
                    ? null
                    : () => unawaited(
                        own
                            ? ref.read(editor.notifier).refresh()
                            : ref.read(viewer.notifier).refresh(),
                      ),
              ),
            ],
          ),
          body: CatchRouteBody.standardConstrained(
            child: !active
                ? const SizedBox.shrink()
                : own
                ? CatchAsyncBoundary<EventProfileEditorState>(
                    value: editorValue!,
                    retainDataOn: const {},
                    onRetry: () =>
                        unawaited(ref.read(editor.notifier).refresh()),
                    builder: (context, state) => EventProfileEditorSection(
                      key: ValueKey(state.uid),
                      state: state,
                      photos: {
                        if (profile != null &&
                            profile.uid == state.uid &&
                            uid == state.uid)
                          for (final photo in profile.profilePhotos)
                            if (state.settings.photoIds.contains(photo.id))
                              photo.id: NetworkImage(photo.thumbnailUrl),
                      },
                      onSave: (selection) async {
                        if (selection != null) {
                          // provider-graph: ownership-widget-async:_EventProfileScreenState.build:await:eventProfileEditorControllerProvider.preview watch CAT156 -- Existing bounded review signal at _EventProfileScreenState.build (await:eventProfileEditorControllerProvider.preview). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
                          final preview = await ref
                              .read(editor.notifier)
                              .preview(
                                selection,
                                reviewedUid: state.uid,
                                reviewedRevision: state.settings.revision,
                              );
                          if (!context.mounted || preview == null) return;
                          _previewValid.value = true;
                          setState(() => _ownedPreviewOpen = true);
                          bool? confirmed;
                          try {
                            confirmed = await showDialog<bool>(
                              context: context,
                              builder: (dialogContext) => ValueListenableBuilder<bool>(
                                valueListenable: _previewValid,
                                builder: (dialogContext, valid, _) => Consumer(
                                  builder: (dialogContext, dialogRef, _) {
                                    final account =
                                        catchAsyncStateFromAsyncValue(
                                          dialogRef.watch(uidProvider),
                                        );
                                    if (!valid ||
                                        !account.isSettledData ||
                                        account.value != state.uid) {
                                      WidgetsBinding.instance
                                          .addPostFrameCallback((_) {
                                            if (dialogContext.mounted &&
                                                ModalRoute.of(
                                                      dialogContext,
                                                    )?.isCurrent ==
                                                    true) {
                                              Navigator.of(
                                                dialogContext,
                                              ).pop(false);
                                            }
                                          });
                                      return const SizedBox.shrink();
                                    }
                                    return CatchDialog<bool>(
                                      title: context.l10n.eventProfilePreview,
                                      actions: [
                                        CatchButton(
                                          label: context
                                              .l10n
                                              .coreCatchAdaptivePickerTextCancel,
                                          variant: CatchButtonVariant.secondary,
                                          onPressed: () => Navigator.of(
                                            dialogContext,
                                          ).pop(false),
                                        ),
                                        CatchButton(
                                          label: context.l10n.eventProfileSave,
                                          onPressed: () => Navigator.of(
                                            dialogContext,
                                          ).pop(true),
                                        ),
                                      ],
                                      child: SizedBox(
                                        height:
                                            MediaQuery.sizeOf(
                                              dialogContext,
                                            ).height *
                                            0.48,
                                        child: SingleChildScrollView(
                                          child: EventProfileIdentitySection(
                                            profile: preview,
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            );
                          } finally {
                            if (mounted) {
                              setState(() => _ownedPreviewOpen = false);
                            }
                          }
                          if (confirmed != true || !context.mounted) return;
                        }
                        // provider-graph: ownership-widget-async:_EventProfileScreenState.build:await:eventProfileEditorControllerProvider.save watch CAT156 -- Existing bounded review signal at _EventProfileScreenState.build (await:eventProfileEditorControllerProvider.save). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
                        final saved = await ref
                            .read(editor.notifier)
                            .save(
                              selection,
                              reviewedUid: state.uid,
                              reviewedRevision: state.settings.revision,
                            );
                        if (context.mounted &&
                            ref.read(uidProvider).asData?.value == state.uid &&
                            saved) {
                          showCatchNotice(
                            context,
                            context.l10n.eventProfileSaved,
                          );
                        }
                      },
                      onChooseCard: (id) => unawaited(
                        ref
                            .read(editor.notifier)
                            .chooseCard(id, reviewedUid: state.uid),
                      ),
                      onLoadMore: () =>
                          unawaited(ref.read(editor.notifier).loadMore()),
                      onReload: () =>
                          unawaited(ref.read(editor.notifier).refresh()),
                    ),
                  )
                : CatchAsyncBoundary<EventParticipantProfile>(
                    value: ref.watch(viewer),
                    retainDataOn: const {},
                    onRetry: () =>
                        unawaited(ref.read(viewer.notifier).refresh()),
                    builder: (context, value) => EventProfileIdentitySection(
                      key: ValueKey(uid),
                      profile: value,
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}
