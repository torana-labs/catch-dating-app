import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_controller.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_screen.dart';
import 'package:catch_dating_app/hosts/organizer/page_edit_body.dart';
import 'package:catch_dating_app/hosts/organizer/page_edit_state.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_organizer_edit_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Your page: the logo, photos, fields and kinds of night the public page
/// shows. It keeps the typed draft until Save changes sends it through the
/// existing organizer update; a new logo or photo is sent as soon as it is
/// picked, through the existing media update. The organizer listener brings
/// the result back.
class OrganizerPageEditScreen extends ConsumerStatefulWidget {
  const OrganizerPageEditScreen({super.key, this.initialOrganizerId});

  final String? initialOrganizerId;

  @override
  ConsumerState<OrganizerPageEditScreen> createState() =>
      _PageEditScreenState();
}

class _PageEditScreenState extends ConsumerState<OrganizerPageEditScreen> {
  PageEditDraft? _draft;
  String? _draftFor;
  int _revision = 0;
  bool _mediaPending = false;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final read = watchHostOrganizerScope(
      ref,
      organizerId: widget.initialOrganizerId,
    );
    final scope = read.scope;
    final organizer = scope?.organizer;
    final saving = ref
        .watch(HostOrganizerEditController.updateOrganizerMutation)
        .isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        HostOrganizerEditController.updateOrganizerMutation,
        HostOrganizerEditController.updateMediaMutation,
      ],
      errorContext: AppErrorContext.organizer,
    );

    final Widget body;
    OrganizerPageEditState? state;
    if (scope == null || organizer == null) {
      body = HostOrganizerScopeBody(
        gap: read.gap,
        error: read.error,
        onRetry: () => retryHostOrganizerScope(ref),
      );
    } else {
      if (_draftFor != organizer.id) {
        _draftFor = organizer.id;
        _draft = PageEditDraft.of(organizer);
        _revision += 1;
      }
      final pageUri = organizerPageUri(organizer);
      state = OrganizerPageEditState(
        organizer: organizer,
        draft: _draft!,
        revision: _revision,
        isOwner: scope.isOwner,
        saving: saving,
        mediaPending: _mediaPending,
        pageLink: pageUri == null ? null : organizerPageLink(pageUri),
      );
      body = OrganizerPageEditBody(
        state: state,
        onField: (field, value) => setState(() {
          _draft = switch (field) {
            PageEditField.name => _draft!.copyWith(name: value),
            PageEditField.about => _draft!.copyWith(about: value),
            PageEditField.area => _draft!.copyWith(area: value),
            PageEditField.instagram => _draft!.copyWith(instagram: value),
            PageEditField.phone => _draft!.copyWith(phone: value),
            PageEditField.email => _draft!.copyWith(email: value),
          };
        }),
        onFormat: (format) => setState(() => _draft = _draft!.toggle(format)),
        onListed: (listed) =>
            setState(() => _draft = _draft!.copyWith(listed: listed)),
        onChangeLogo: () => unawaited(_changeLogo(organizer)),
        onAddPhotos: () => unawaited(_addPhotos(organizer)),
        onRemovePhoto: (index) => unawaited(_removePhoto(organizer, index)),
      );
    }

    final ready = state != null;
    final dirty = state?.dirty ?? false;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-organizer-page-edit-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostOrganizerPageTitle,
          kicker: state?.pageLink,
          back: CatchTopBarBack(
            label: l10n.hostOrganizerBack,
            onPressed: () => _close(organizer),
          ),
          action: organizer == null
              ? null
              : CatchTopBarAction(
                  label: l10n.hostOrganizerPagePreview,
                  onPressed: () => context.pushNamed(
                    Routes.hostOrganizerDetailScreen.name,
                    pathParameters: {'organizerId': organizer.id},
                    extra: organizer,
                  ),
                ),
        ),
        body: body,
        dock: ready
            ? CatchDock(
                primary: CatchDockAction(
                  label: l10n.hostOrganizerPageSave,
                  loading: saving,
                  onPressed: dirty && state.draft.valid && !saving
                      ? () => unawaited(_save(state!))
                      : null,
                ),
                secondary: CatchDockAction(
                  label: l10n.hostOrganizerPageDiscard,
                  onPressed: dirty && !saving ? _discard : null,
                ),
              )
            : null,
      ),
    );
  }

  void _close(Organizer? organizer) => context.goNamed(
    Routes.hostOrganizerScreen.name,
    queryParameters: {'organizerId': ?organizer?.id},
  );

  void _discard() => setState(() {
    _draftFor = null;
    _draft = null;
  });

  Future<void> _save(OrganizerPageEditState state) async {
    final patch = state.draft.patchFor(state.organizer, isOwner: state.isOwner);
    if (patch.isEmpty) return;
    try {
      await HostOrganizerEditController.updateOrganizerMutation.run(
        ref,
        (tx) => tx
            .get(hostOrganizerEditControllerProvider)
            .updateOrganizer(organizerId: state.organizer.id, patch: patch),
      );
    } on Object {
      // The mutation listener shows the error; the draft stays to retry.
      return;
    }
    if (!mounted) return;
    showCatchNotice(context, context.l10n.hostOrganizerPageSaved);
    _close(state.organizer);
  }

  Future<void> _changeLogo(Organizer organizer) async {
    final actions = ref.read(hostOrganizerEditControllerProvider);
    final logo = await actions.pickOrganizerLogo();
    if (logo == null || !mounted) return;
    await _runMedia(
      () => actions.updateOrganizerMedia(organizer: organizer, logo: logo),
    );
  }

  Future<void> _addPhotos(Organizer organizer) async {
    final actions = ref.read(hostOrganizerEditControllerProvider);
    final picked = await actions.pickOrganizerPhotos();
    if (picked.isEmpty || !mounted) return;
    await _runMedia(
      () => actions.updateOrganizerMedia(
        organizer: organizer,
        photoInputs: [
          ..._existingPhotos(organizer),
          for (final photo in picked)
            HostNewOrganizerPhotoInput(id: photo.id, image: photo.image),
        ],
      ),
    );
  }

  Future<void> _removePhoto(Organizer organizer, int index) async {
    final l10n = context.l10n;
    final confirmed = await showCatchAdaptiveDialog<bool>(
      context: context,
      title: l10n.hostOrganizerPagePhotoRemoveTitle,
      message: l10n.hostOrganizerPagePhotoRemoveBody,
      actions: [
        CatchDialogAction(label: l10n.hostOrganizerCancel, value: false),
        CatchDialogAction(
          label: l10n.hostOrganizerPagePhotoRemove,
          value: true,
          isDestructive: true,
        ),
      ],
    );
    if (confirmed != true || !mounted) return;
    final photos = _existingPhotos(organizer)..removeAt(index);
    await _runMedia(
      () => ref
          .read(hostOrganizerEditControllerProvider)
          .updateOrganizerMedia(organizer: organizer, photoInputs: photos),
    );
  }

  List<HostOrganizerMediaInput> _existingPhotos(Organizer organizer) => [
    for (final photo in [
      ...organizer.organizerPhotos,
    ]..sort((a, b) => a.position.compareTo(b.position)))
      HostExistingOrganizerPhotoInput(photo),
  ];

  /// Runs one media update; a failed upload is said once and discarded.
  Future<void> _runMedia(
    Future<HostOrganizerMediaSaveResult> Function() update,
  ) async {
    setState(() => _mediaPending = true);
    try {
      final result = await HostOrganizerEditController.updateMediaMutation.run(
        ref,
        (_) => update(),
      );
      if (result.hasFailures && mounted) {
        showCatchNotice(context, context.l10n.hostOrganizerPagePhotoFailed);
        await ref
            .read(hostOrganizerEditControllerProvider)
            .discardOrganizerMedia(
              photoInputs: result.photoInputs ?? const [],
              logo: result.logo,
            );
      }
    } on Object {
      // The mutation listener shows the error.
    } finally {
      if (mounted) setState(() => _mediaPending = false);
    }
  }
}
