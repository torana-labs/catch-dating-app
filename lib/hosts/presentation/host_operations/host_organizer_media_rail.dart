part of '../host_operations_screen.dart';

class HostOrganizerMediaRail extends StatelessWidget {
  const HostOrganizerMediaRail({
    super.key,
    required this.logoImageBytes,
    required this.logoImageUrl,
    required this.photos,
    required this.logoBadgeLabel,
    required this.addPhotosLabel,
    required this.onManageMedia,
  });

  final Uint8List? logoImageBytes;
  final String? logoImageUrl;
  final List<OrderedPhotoPreview> photos;
  final String logoBadgeLabel;
  final String addPhotosLabel;
  final VoidCallback? onManageMedia;

  @override
  Widget build(BuildContext context) {
    const extent = CatchLayout.hostMediaThumbnailExtent;

    return SizedBox(
      key: HostOrganizerMediaKeys.summaryStrip,
      height: extent,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: photos.length + 2,
        separatorBuilder: (_, _) => gapW8,
        itemBuilder: (_, index) {
          if (index == 0) {
            return SizedBox.square(
              dimension: extent,
              child: Stack(
                key: HostOrganizerMediaKeys.logoTile,
                fit: StackFit.expand,
                children: [
                  OrganizerProfileImageTile(
                    imageBytes: logoImageBytes,
                    existingImageUrl: logoImageUrl,
                    onTap: onManageMedia,
                    size: extent,
                  ),
                  Positioned(
                    top: CatchSpacing.s1,
                    left: CatchSpacing.s1,
                    child: IgnorePointer(
                      child: CatchSurface.tinted(
                        radius: CatchRadius.pill,
                        backgroundColor: CatchTokens.of(context).ink.withValues(
                          alpha: CatchOpacity.photoSlotDeleteChrome,
                        ),
                        padding: CatchInsets.mediaRoleBadgeContent,
                        child: Text(
                          logoBadgeLabel,
                          style: CatchTextStyles.monoLabel(
                            context,
                            color: CatchTokens.of(context).surface,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }
          if (index == photos.length + 1) {
            return SizedBox.square(
              dimension: extent,
              child: OrderedPhotoAddTile(
                label: addPhotosLabel,
                onTap: onManageMedia,
              ),
            );
          }

          final photoIndex = index - 1;
          final photo = photos[photoIndex];
          final isCover = photoIndex == 0;
          return SizedBox(
            width:
                extent *
                (isCover
                    ? CatchAspectRatio.organizerCover
                    : CatchAspectRatio.organizerGallery),
            height: extent,
            child: OrderedPhotoTile(
              key: ValueKey('host-media-summary-photo-${photo.id}'),
              photo: photo,
              index: photoIndex,
              canReorder: false,
              showCoverBadge: isCover,
              showReorderHandle: false,
              statusActionKey: isCover
                  ? OrderedPhotoPickerKeys.coverRetryAction
                  : null,
            ),
          );
        },
      ),
    );
  }
}

/// The media manager's logo picker header.
class HostOrganizerLogoManagerHeader extends StatefulWidget {
  const HostOrganizerLogoManagerHeader({
    super.key,
    required this.imageBytes,
    required this.existingImageUrl,
    required this.onPickLogo,
    required this.onRemoveLogo,
  });

  final Uint8List? imageBytes;
  final String? existingImageUrl;
  final Future<HostPickedOrganizerLogo?> Function() onPickLogo;
  final Future<void> Function() onRemoveLogo;

  @override
  State<HostOrganizerLogoManagerHeader> createState() =>
      _HostOrganizerLogoManagerHeaderState();
}

class _HostOrganizerLogoManagerHeaderState
    extends State<HostOrganizerLogoManagerHeader> {
  late Uint8List? _imageBytes;
  late String? _existingImageUrl;

  @override
  void initState() {
    super.initState();
    _imageBytes = widget.imageBytes;
    _existingImageUrl = widget.existingImageUrl;
  }

  Future<void> _pickLogo() async {
    // provider-graph: ownership-widget-async-callback:_HostOrganizerLogoManagerHeaderState._pickLogo:await:widget.onPickLogo watch CAT156 -- Existing bounded review signal at _HostOrganizerLogoManagerHeaderState._pickLogo (await:widget.onPickLogo). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
    final logo = await widget.onPickLogo();
    if (!mounted || logo == null) return;
    setState(() {
      _imageBytes = logo.bytes;
      _existingImageUrl = null;
    });
  }

  Future<void> _removeLogo() async {
    // provider-graph: ownership-widget-async-callback:_HostOrganizerLogoManagerHeaderState._removeLogo:await:widget.onRemoveLogo watch CAT156 -- Existing bounded review signal at _HostOrganizerLogoManagerHeaderState._removeLogo (await:widget.onRemoveLogo). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
    await widget.onRemoveLogo();
    if (!mounted) return;
    setState(() {
      _imageBytes = null;
      _existingImageUrl = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return CreateOrganizerProfileImagePicker(
      imageBytes: _imageBytes,
      existingImageUrl: _existingImageUrl,
      onTap: () => unawaited(_pickLogo()),
      onRemove: _imageBytes != null || _existingImageUrl != null
          ? () => unawaited(_removeLogo())
          : null,
      variant: CreateOrganizerProfileImagePickerVariant.editLogo,
    );
  }
}

/// The media manager's save action and error line.
class HostOrganizerMediaManagerDock extends StatefulWidget {
  const HostOrganizerMediaManagerDock({
    super.key,
    required this.onSave,
    required this.errorText,
  });

  final Future<bool> Function() onSave;
  final String? Function(BuildContext context) errorText;

  @override
  State<HostOrganizerMediaManagerDock> createState() =>
      _HostOrganizerMediaManagerDockState();
}

class _HostOrganizerMediaManagerDockState
    extends State<HostOrganizerMediaManagerDock> {
  bool _saving = false;
  bool _showError = false;

  Future<void> _save() async {
    if (_saving) return;
    setState(() {
      _saving = true;
      _showError = false;
    });
    // provider-graph: ownership-widget-async-callback:_HostOrganizerMediaManagerDockState._save:await:widget.onSave watch CAT156 -- Existing bounded review signal at _HostOrganizerMediaManagerDockState._save (await:widget.onSave). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
    final saved = await widget.onSave();
    if (!mounted) return;
    if (saved) {
      Navigator.of(context).pop(true);
      return;
    }
    setState(() {
      _saving = false;
      _showError = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final error = _showError ? widget.errorText(context) : null;
    return SafeArea(
      top: false,
      // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
      child: DecoratedBox(
        // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
        decoration: BoxDecoration(
          color: CatchTokens.of(context).bg,
          // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
          border: Border(top: BorderSide(color: CatchTokens.of(context).line)),
        ),
        child: Padding(
          padding: CatchInsets.pageHorizontal.copyWith(
            top: CatchSpacing.s2,
            bottom: CatchSpacing.s2,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                key: const ValueKey('host-media-action-bar'),
                children: [
                  Expanded(
                    child: CatchButton(
                      key: const ValueKey('host-media-discard'),
                      label: context
                          .l10n
                          .hostsHostOrganizerEditTabActionDiscardMedia,
                      onPressed: _saving
                          ? null
                          : () => Navigator.of(context).pop(false),
                      variant: CatchButtonVariant.secondary,
                      fullWidth: true,
                    ),
                  ),
                  gapW8,
                  Expanded(
                    child: CatchButton(
                      key: const ValueKey('host-media-save'),
                      label:
                          context.l10n.hostsHostOrganizerEditTabActionSaveMedia,
                      onPressed: _saving ? null : () => unawaited(_save()),
                      status: (_saving)
                          ? CatchButtonStatus.loading
                          : CatchButtonStatus.idle,
                      fullWidth: true,
                    ),
                  ),
                ],
              ),
              if (error != null) ...[
                gapH8,
                CatchFieldSupportRow(
                  text: error,
                  color: CatchTokens.of(context).danger,
                  showErrorIcon: true,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

sealed class _HostOrganizerMediaDraft {
  const _HostOrganizerMediaDraft();

  String get id;
  OrderedPhotoPreview get preview;
  HostOrganizerMediaInput get input;
}

final class _HostExistingOrganizerMediaDraft extends _HostOrganizerMediaDraft {
  const _HostExistingOrganizerMediaDraft(this.photo);

  final UploadedPhoto photo;

  @override
  String get id => photo.id;

  @override
  OrderedPhotoPreview get preview => OrderedPhotoPreview(
    id: 'existing-${photo.id}',
    imageUrl: photo.thumbnailOrUrl,
  );

  @override
  HostOrganizerMediaInput get input => HostExistingOrganizerPhotoInput(photo);
}

final class _HostPickedOrganizerMediaDraft extends _HostOrganizerMediaDraft {
  const _HostPickedOrganizerMediaDraft(
    this.photo, {
    this.uploadedPhoto,
    this.job = const ImageUploadJobState.queued(),
  });

  final HostPickedOrganizerPhoto photo;
  final UploadedPhoto? uploadedPhoto;
  final ImageUploadJobState job;

  @override
  String get id => photo.id;

  _HostPickedOrganizerMediaDraft withJob(ImageUploadJobState job) =>
      _HostPickedOrganizerMediaDraft(
        photo,
        uploadedPhoto: uploadedPhoto,
        job: job,
      );

  _HostPickedOrganizerMediaDraft withResolvedInput(
    HostOrganizerMediaInput? resolved, {
    Object? error,
  }) {
    final uploaded = switch (resolved) {
      HostNewOrganizerPhotoInput(:final uploadedPhoto) => uploadedPhoto,
      _ => uploadedPhoto,
    };
    return _HostPickedOrganizerMediaDraft(
      photo,
      uploadedPhoto: uploaded,
      job: error == null
          ? const ImageUploadJobState(stage: ImageUploadJobStage.complete)
          : ImageUploadJobState(
              stage: ImageUploadJobStage.failed,
              error: error,
            ),
    );
  }

  _HostPickedOrganizerMediaDraft clearUpload(Object error) =>
      _HostPickedOrganizerMediaDraft(
        photo,
        job: ImageUploadJobState(
          stage: ImageUploadJobStage.failed,
          error: error,
        ),
      );

  @override
  OrderedPhotoPreview get preview => OrderedPhotoPreview(
    id: id,
    bytes: photo.bytes,
    status: switch (job.stage) {
      ImageUploadJobStage.failed => OrderedPhotoStatus.failed,
      ImageUploadJobStage.preparing ||
      ImageUploadJobStage.uploading ||
      ImageUploadJobStage.attaching => OrderedPhotoStatus.uploading,
      ImageUploadJobStage.queued ||
      ImageUploadJobStage.picking => OrderedPhotoStatus.queued,
      _ => OrderedPhotoStatus.ready,
    },
    progress: job.progress,
    error: job.error,
  );

  @override
  HostNewOrganizerPhotoInput get input => HostNewOrganizerPhotoInput(
    id: id,
    image: photo.image,
    uploadedPhoto: uploadedPhoto,
  );
}
