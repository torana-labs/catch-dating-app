import 'dart:async';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/core/widgets/confirm_danger_dialog.dart';
import 'package:catch_dating_app/image_uploads/domain/image_upload_job.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_upload_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/user_profile/data/user_profile_repository.dart';
import 'package:catch_dating_app/user_profile/domain/profile_photo.dart';
import 'package:catch_dating_app/user_profile/domain/profile_photo_policy.dart';
import 'package:catch_dating_app/user_profile/domain/profile_prompts.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProfilePhotoEditorScreen extends ConsumerStatefulWidget {
  const ProfilePhotoEditorScreen({
    super.key,
    required this.index,
    this.photo,
    this.initialImageBytes,
    this.canDelete = false,
  });

  final int index;
  final ProfilePhoto? photo;
  final Uint8List? initialImageBytes;
  final bool canDelete;

  @override
  ConsumerState<ProfilePhotoEditorScreen> createState() =>
      _ProfilePhotoEditorScreenState();
}

Future<bool?> openProfilePhotoEditor({
  required BuildContext context,
  required WidgetRef ref,
  required int index,
  ProfilePhoto? photo,
  bool canDelete = false,
}) async {
  Uint8List? initialImageBytes;
  if (photo == null) {
    final initialImage = await ref
        .read(photoUploadControllerProvider.notifier)
        .pickPhoto();
    if (initialImage == null || !context.mounted) return false;
    initialImageBytes = await initialImage.readAsBytes();
  }

  if (!context.mounted) return false;
  return Navigator.of(context, rootNavigator: true).push<bool>(
    MaterialPageRoute(
      builder: (_) => ProfilePhotoEditorScreen(
        index: index,
        photo: photo,
        initialImageBytes: initialImageBytes,
        canDelete: canDelete,
      ),
    ),
  );
}

class _ProfilePhotoEditorScreenState
    extends ConsumerState<ProfilePhotoEditorScreen> {
  final _cropKey = GlobalKey();
  String? _promptId;
  String? _draftPromptId;
  bool _promptOpen = false;
  Uint8List? _imageBytes;
  bool _loadingImage = false;
  bool _saving = false;
  bool _deleting = false;

  @override
  void initState() {
    super.initState();
    final existingPrompt = widget.photo?.prompt;
    _promptId = existingPrompt?.promptId;
    _draftPromptId = _promptId;
    final initialImageBytes = widget.initialImageBytes;
    if (initialImageBytes != null) {
      _imageBytes = initialImageBytes;
    }
  }

  Future<void> _pickReplacementImage() async {
    setState(() => _loadingImage = true);
    try {
      final image = await ref
          .read(photoUploadControllerProvider.notifier)
          .pickPhoto();
      final bytes = await image?.readAsBytes();
      if (!mounted) return;
      if (bytes != null) setState(() => _imageBytes = bytes);
    } finally {
      if (mounted) setState(() => _loadingImage = false);
    }
  }

  Future<void> _replaceImage() async {
    await _pickReplacementImage();
  }

  Future<Uint8List?> _croppedImageBytes() async {
    if (_imageBytes == null) return null;
    final boundary =
        _cropKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
    if (boundary == null) return null;
    final image = await boundary.toImage(pixelRatio: 3);
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    if (byteData == null) return null;
    return byteData.buffer.asUint8List();
  }

  Future<void> _save() async {
    if (_promptOpen || _saving || _deleting || _loadingImage) {
      return;
    }
    final hasExistingPhoto = widget.photo != null;
    if (!hasExistingPhoto && _imageBytes == null) return;

    setState(() => _saving = true);
    try {
      final prompt = _selectedPromptAnswer;
      final croppedImageBytes = await _croppedImageBytes();
      await PhotoUploadController.uploadPhotoMutation.run(ref, (tx) async {
        await tx
            .get(photoUploadControllerProvider.notifier)
            .savePhoto(
              index: widget.index,
              imageBytes: croppedImageBytes,
              prompt: prompt,
            );
      });
      if (mounted) Navigator.of(context).pop(true);
    } catch (_) {
      // The persistent mutation banner below owns the user-facing error.
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _deletePhoto() async {
    if (!widget.canDelete || widget.photo == null || _saving || _deleting) {
      return;
    }
    final confirmed = await showConfirmDangerDialog(
      context: context,
      title: context.l10n.imageUploadsProfilePhotoEditorScreenTitleDeletePhoto,
      message: context
          .l10n
          .imageUploadsProfilePhotoEditorScreenMessageThisRemovesThePhoto,
      confirmLabel:
          context.l10n.imageUploadsProfilePhotoEditorScreenVisiblecopyDelete,
    );
    if (confirmed != true || !mounted) return;

    setState(() => _deleting = true);
    try {
      await PhotoUploadController.uploadPhotoMutation.run(ref, (tx) async {
        await tx
            .get(photoUploadControllerProvider.notifier)
            .deletePhoto(widget.index);
      });
      if (mounted) Navigator.of(context).pop(true);
    } catch (_) {
      // The persistent mutation banner below owns the user-facing error.
    } finally {
      if (mounted) setState(() => _deleting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final uploadMutation = ref.watch(PhotoUploadController.uploadPhotoMutation);
    final uploadJob = ref
        .watch(photoUploadControllerProvider)
        .jobFor(widget.index);
    final hasEditableImage = _imageBytes != null;
    final profilePhotos =
        ref
            .watch(watchUserProfileProvider)
            .asData
            ?.value
            ?.effectiveProfilePhotos ??
        const <ProfilePhoto>[];
    final usedPromptIds = {
      for (final photo in profilePhotos)
        if (photo.position != widget.index && photo.prompt != null)
          photo.prompt!.promptId,
    };
    final canSave =
        !_promptOpen &&
        !_saving &&
        !_deleting &&
        !_loadingImage &&
        (widget.photo != null || hasEditableImage);
    final promptChoices = _PhotoPromptChoice.values(
      l10n: context.l10n,
      usedPromptIds: usedPromptIds,
      currentPromptId: _promptId,
      currentPromptLabel: widget.photo?.prompt?.displayPrompt,
    );
    final selectedPromptChoice = promptChoices.firstWhere(
      (choice) => choice.id == _draftPromptId,
      orElse: () => promptChoices.first,
    );
    final canDelete = widget.photo != null && widget.canDelete;
    final uploadPercent = uploadJob?.stage == ImageUploadJobStage.uploading
        ? (uploadJob!.progress * 100).round()
        : null;

    return CatchRouteScaffold(
      backgroundColor: t.bg,
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: widget.photo == null
            ? context.l10n.imageUploadsProfilePhotoEditorScreenTitleAddPhoto
            : context.l10n.imageUploadsProfilePhotoEditorScreenTitleEditPhoto,
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: CatchRouteBody.standardConstrained(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CatchSurface(
              backgroundColor: t.raised,
              borderRole: CatchBorderRole.separator,
              clipBehavior: Clip.antiAlias,
              child: AspectRatio(
                aspectRatio: profilePhotoAspectRatio,
                child: ProfilePhotoEditorPreview(
                  cropKey: _cropKey,
                  bytes: _imageBytes,
                  url: widget.photo?.url,
                  loading: _loadingImage,
                ),
              ),
            ),
            gapH16,
            CatchField<_PhotoPromptChoice>.choices(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('profile-photo-prompt-field'),
              title: context
                  .l10n
                  .imageUploadsProfilePhotoEditorScreenTitlePhotoPrompt,
              contract: CatchContractConstraints.photoPromptAnswerPromptId,
              contractValueBuilder: (choice) => choice.id ?? '',
              values: promptChoices,
              itemLabelBuilder: (choice) => choice.label,
              selected: {selectedPromptChoice},
              onSelectionChanged: _saving || _deleting
                  ? null
                  : (selection) {
                      if (selection.isEmpty) return;
                      setState(() => _draftPromptId = selection.single.id);
                    },
              disclosureMode: _promptOpen
                  ? CatchFieldMode.controlledExpanded
                  : CatchFieldMode.controlledCollapsed,
              onOpenChanged: _saving || _deleting
                  ? null
                  : (open) {
                      setState(() {
                        _promptOpen = open;
                        _draftPromptId = _promptId;
                      });
                    },
              onCancel: () {
                setState(() {
                  _draftPromptId = _promptId;
                  _promptOpen = false;
                });
              },
              onSubmit: () {
                setState(() {
                  _promptId = _draftPromptId;
                  _promptOpen = false;
                });
              },
              states: <WidgetState>{
                if (!(!_saving && !_deleting)) WidgetState.disabled,
              },
              icon: CatchIcons.autoAwesomeOutlined,
            ),
            gapH20,
            if (uploadMutation.hasError) ...[
              CatchLocalizedErrorBanner.mutation(mutation: uploadMutation),
              gapH12,
            ],
            CatchButton(
              label: _saving
                  ? uploadPercent == null
                        ? context
                              .l10n
                              .imageUploadsProfilePhotoEditorScreenLabelSaving
                        : '${context.l10n.imageUploadsProfilePhotoEditorScreenLabelSaving} '
                              '$uploadPercent%'
                  : context
                        .l10n
                        .imageUploadsProfilePhotoEditorScreenLabelSaveChanges,
              onPressed: canSave ? _save : null,
              status: (_saving)
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              fullWidth: true,
            ),
            gapH12,
            CatchButton(
              label: widget.photo == null
                  ? context
                        .l10n
                        .imageUploadsProfilePhotoEditorScreenLabelChoosePhoto
                  : context
                        .l10n
                        .imageUploadsProfilePhotoEditorScreenLabelChangePhoto,
              onPressed: _saving || _deleting ? null : _replaceImage,
              leading: Icon(CatchIcons.photoLibraryOutlined),
              variant: CatchButtonVariant.secondary,
              fullWidth: true,
            ),
            if (widget.photo != null) ...[
              gapH12,
              CatchButton(
                label: _deleting
                    ? context
                          .l10n
                          .imageUploadsProfilePhotoEditorScreenLabelDeleting
                    : context
                          .l10n
                          .imageUploadsProfilePhotoEditorScreenLabelDeletePhoto,
                onPressed: canDelete ? _deletePhoto : null,
                status: (_deleting)
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                leading: Icon(CatchIcons.deleteOutlineRounded),
                variant: CatchButtonVariant.danger,
                fullWidth: true,
                semanticsLabel: canDelete
                    ? context.l10n
                          .imageUploadsProfilePhotoEditorScreenCatchbuttonDeletePhotoValue1(
                            value1: widget.index + 1,
                          )
                    : context
                          .l10n
                          .imageUploadsProfilePhotoEditorScreenCatchbuttonDeletePhotoUnavailable,
              ),
              if (!widget.canDelete) ...[
                gapH8,
                CatchText(
                  context.l10n
                      .imageUploadsProfilePhotoEditorScreenTextKeepAtLeastMinimumprofilephotocount(
                        minimumProfilePhotoCount: minimumProfilePhotoCount,
                      ),
                  variant: CatchTextVariant.supporting,
                  color: t.ink2,
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  PhotoPromptAnswer? get _selectedPromptAnswer {
    final id = _promptId;
    if (id == null) return null;
    final existingPrompt = widget.photo?.prompt;
    if (existingPrompt?.promptId == id) {
      return existingPrompt!.copyWith(photoIndex: widget.index);
    }
    return photoPromptAnswerFor(
      photoIndex: widget.index,
      definition: photoPromptDefinition(id),
    );
  }
}

class ProfilePhotoEditorPreview extends StatelessWidget {
  const ProfilePhotoEditorPreview({
    super.key,
    required this.cropKey,
    required this.loading,
    this.bytes,
    this.url,
  });

  final GlobalKey cropKey;
  final bool loading;
  final Uint8List? bytes;
  final String? url;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final imageBytes = bytes;
    final existingUrl = url;

    if (loading) {
      return CatchSkeleton.custom(
        child: const ColoredBox(
          color: CatchTokens.editorialWhite,
          child: SizedBox.expand(),
        ),
      );
    }
    if (imageBytes != null) {
      return RepaintBoundary(
        key: cropKey,
        child: ClipRect(
          child: InteractiveViewer(
            minScale: 1,
            maxScale: 4,
            boundaryMargin: const EdgeInsets.all(
              CatchLayout.profilePhotoEditorBoundaryMargin,
            ),
            child: SizedBox.expand(
              child: Image.memory(imageBytes, fit: BoxFit.cover),
            ),
          ),
        ),
      );
    }
    if (existingUrl != null) {
      return CatchNetworkImage(existingUrl);
    }
    return ColoredBox(
      color: t.primarySoft,
      child: Center(
        child: Icon(CatchIcons.addPhotoAlternateOutlined, color: t.primary),
      ),
    );
  }
}

final class _PhotoPromptChoice {
  const _PhotoPromptChoice({required this.id, required this.label});

  final String? id;
  final String label;

  static List<_PhotoPromptChoice> values({
    required AppLocalizations l10n,
    Set<String> usedPromptIds = const {},
    String? currentPromptId,
    String? currentPromptLabel,
  }) => [
    _PhotoPromptChoice(
      id: null,
      label: l10n.imageUploadsProfilePhotoEditorScreenLabelNoPrompt,
    ),
    if (currentPromptId != null &&
        !photoPromptCatalog.any(
          (definition) => definition.id == currentPromptId,
        ))
      _PhotoPromptChoice(
        id: currentPromptId,
        label: currentPromptLabel ?? currentPromptId,
      ),
    for (final definition in photoPromptCatalog)
      if (!usedPromptIds.contains(definition.id) ||
          definition.id == currentPromptId)
        _PhotoPromptChoice(id: definition.id, label: definition.title),
  ];
}
