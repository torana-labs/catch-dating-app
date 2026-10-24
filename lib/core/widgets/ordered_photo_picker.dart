import 'dart:typed_data';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/material.dart';
import 'package:flutter_reorderable_grid_view/entities/reorderable_animation_config.dart';
import 'package:flutter_reorderable_grid_view/widgets/widgets.dart';

part 'ordered_photo_picker_actions.dart';
part 'ordered_photo_picker_models.dart';

class OrderedPhotoPicker extends StatefulWidget {
  const OrderedPhotoPicker({
    super.key,
    this.label,
    required this.photos,
    required this.onAddPhotos,
    required this.onRemovePhoto,
    required this.onReorderPhoto,
    required this.emptyActionLabel,
    required this.addActionLabel,
    this.maxPhotos,
    this.crossAxisCount = 2,
    this.childAspectRatio = CatchAspectRatio.wide16x9,
    this.showCoverBadge = false,
    this.showReorderHandle = true,
    this.onRetryPhoto,
    this.onAddPhotosInManager,
  });

  final Widget? label;
  final List<OrderedPhotoPreview> photos;
  final VoidCallback? onAddPhotos;
  final ValueChanged<int>? onRemovePhoto;
  final void Function(int fromIndex, int toIndex)? onReorderPhoto;
  final String emptyActionLabel;
  final String addActionLabel;

  /// Optional platform or contract limit. Host galleries leave this null so
  /// the editor never imposes a product-level photo cap.
  final int? maxPhotos;
  final int crossAxisCount;
  final double childAspectRatio;
  final bool showCoverBadge;
  final bool showReorderHandle;
  final ValueChanged<int>? onRetryPhoto;
  final Future<List<OrderedPhotoPreview>> Function()? onAddPhotosInManager;

  @override
  State<OrderedPhotoPicker> createState() => _OrderedPhotoPickerState();
}

class _OrderedPhotoPickerState extends State<OrderedPhotoPicker> {
  @override
  Widget build(BuildContext context) {
    final photos = widget.photos.where((photo) => photo.hasImage).toList();
    final canAdd =
        widget.onAddPhotos != null &&
        (widget.maxPhotos == null || photos.length < widget.maxPhotos!);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.label case final label?) ...[label, gapH8],
        if (photos.isEmpty)
          AspectRatio(
            aspectRatio: CatchAspectRatio.wide16x9,
            child: OrderedPhotoAddTile(
              label: widget.emptyActionLabel,
              onTap: widget.onAddPhotos,
            ),
          )
        else ...[
          Align(
            alignment: Alignment.centerLeft,
            child: ConstrainedBox(
              constraints: const BoxConstraints(
                maxWidth: CatchLayout.hostMediaCoverMaxWidth,
              ),
              child: AspectRatio(
                aspectRatio: CatchAspectRatio.wide16x9,
                child: OrderedPhotoTile(
                  key: ValueKey('ordered_photo_cover_${photos.first.id}'),
                  photo: photos.first,
                  index: 0,
                  canReorder: false,
                  showCoverBadge: true,
                  showReorderHandle: false,
                  onRetry:
                      photos.first.status == OrderedPhotoStatus.failed &&
                          widget.onRetryPhoto != null
                      ? () => widget.onRetryPhoto!(0)
                      : null,
                  statusActionKey: OrderedPhotoPickerKeys.coverRetryAction,
                ),
              ),
            ),
          ),
          gapH8,
          SizedBox(
            height: CatchLayout.hostMediaThumbnailExtent,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount:
                  (photos.length > 4 ? 4 : photos.length) + (canAdd ? 1 : 0),
              separatorBuilder: (_, _) => gapW8,
              itemBuilder: (context, index) {
                final visibleCount = photos.length > 4 ? 4 : photos.length;
                if (index >= visibleCount) {
                  return SizedBox.square(
                    dimension: CatchLayout.hostMediaThumbnailExtent,
                    child: OrderedPhotoAddTile(
                      label: widget.addActionLabel,
                      onTap: widget.onAddPhotos,
                    ),
                  );
                }
                return SizedBox.square(
                  dimension: CatchLayout.hostMediaThumbnailExtent,
                  child: ExcludeSemantics(
                    child: OrderedPhotoTile(
                      key: ValueKey(
                        'ordered_photo_preview_${photos[index].id}',
                      ),
                      photo: photos[index],
                      index: index,
                      canReorder: false,
                      showCoverBadge: false,
                      showReorderHandle: false,
                      onRetry:
                          photos[index].status == OrderedPhotoStatus.failed &&
                              widget.onRetryPhoto != null
                          ? () => widget.onRetryPhoto!(index)
                          : null,
                    ),
                  ),
                );
              },
            ),
          ),
          gapH12,
          CatchButton(
            key: OrderedPhotoPickerKeys.manageAction,
            label: context.l10n.coreOrderedPhotoPickerActionManageAll(
              count: photos.length,
            ),
            leading: Icon(CatchIcons.photoLibraryOutlined),
            onPressed: () => _openManager(context, photos),
            variant: CatchButtonVariant.secondary,
            fullWidth: true,
          ),
        ],
      ],
    );
  }
}

enum _OrderedPhotoAction { retry, setCover, moveEarlier, moveLater, remove }

/// Full-screen editor for long ordered galleries. It keeps a local mirror so
/// dozens of items can be reordered or removed without collapsing the route;
/// every operation is also forwarded to the owning draft/controller.
class OrderedPhotoManagerScreen extends StatefulWidget {
  const OrderedPhotoManagerScreen({
    super.key,
    required this.photos,
    required this.onAddPhotos,
    required this.onRemovePhoto,
    required this.onReorderPhoto,
    required this.onRetryPhoto,
    required this.canAdd,
    this.onAddPhotosInManager,
    this.photosListenable,
    this.header,
    this.footer,
    this.showDoneAction = true,
  });

  final List<OrderedPhotoPreview> photos;
  final VoidCallback? onAddPhotos;
  final ValueChanged<int>? onRemovePhoto;
  final void Function(int fromIndex, int toIndex)? onReorderPhoto;
  final ValueChanged<int>? onRetryPhoto;
  final bool canAdd;
  final Future<List<OrderedPhotoPreview>> Function()? onAddPhotosInManager;

  /// Optional caller-owned draft stream. Features with asynchronous upload
  /// state can keep the open manager synchronized with controller progress and
  /// failures while the manager retains local drag interactions.
  final ValueListenable<List<OrderedPhotoPreview>>? photosListenable;

  /// Optional feature-owned content shown above the gallery controls. This
  /// lets organizer media management include its independent logo editor
  /// without moving logo persistence into the shared ordered-gallery widget.
  final Widget? header;

  /// Optional feature-owned transaction controls shown below the gallery.
  /// Persistence remains caller-owned; the shared manager only places the
  /// controls inside the full-screen media workspace.
  final Widget? footer;

  /// Generic galleries close with Done. Feature-owned transactional managers
  /// can hide it when their footer owns explicit Save and Discard actions.
  final bool showDoneAction;

  @override
  State<OrderedPhotoManagerScreen> createState() =>
      _OrderedPhotoManagerScreenState();
}

class _OrderedPhotoManagerScreenState extends State<OrderedPhotoManagerScreen> {
  late List<OrderedPhotoPreview> _photos;
  int? _draggedIndex;
  bool _adding = false;

  void _setLocalState(VoidCallback callback) => setState(callback);

  @override
  void initState() {
    super.initState();
    _photos = [...widget.photos];
    widget.photosListenable?.addListener(_syncCallerPhotos);
  }

  @override
  void didUpdateWidget(covariant OrderedPhotoManagerScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.photos != widget.photos) _photos = [...widget.photos];
    if (oldWidget.photosListenable != widget.photosListenable) {
      oldWidget.photosListenable?.removeListener(_syncCallerPhotos);
      widget.photosListenable?.addListener(_syncCallerPhotos);
      _syncCallerPhotos();
    }
  }

  @override
  void dispose() {
    widget.photosListenable?.removeListener(_syncCallerPhotos);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchRouteScaffold(
      key: OrderedPhotoPickerKeys.managerScreen,
      backgroundColor: t.bg,
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.coreOrderedPhotoPickerTitlePhotoManager,
        subtitle: context.l10n.coreOrderedPhotoPickerSubtitlePhotoCount(
          count: _photos.length,
        ),
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.close,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        actions: widget.showDoneAction
            ? [
                CatchButton.text(
                  label: context.l10n.coreOrderedPhotoPickerActionDone,
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ]
            : const [],
      ),
      footer: widget.footer,
      body: CatchRouteBody.standardViewport(
        child: Column(
          children: [
            if (widget.header case final header?) ...[header, gapH12],
            if (_photos.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: CatchSpacing.s2),
                child: CatchText(
                  context.l10n.coreOrderedPhotoPickerBodyCoverPhoto,
                  variant: CatchTextVariant.supporting,
                  color: t.ink3,
                ),
              ),
            Row(
              children: [
                Expanded(
                  child: CatchText(
                    context.l10n.coreOrderedPhotoPickerTitleGallery,
                    variant: CatchTextVariant.sectionTitle,
                  ),
                ),
                CatchButton.text(
                  label: context.l10n.coreOrderedPhotoPickerActionAddPhotos,
                  onPressed:
                      widget.canAdd &&
                          !_adding &&
                          (widget.onAddPhotos != null ||
                              widget.onAddPhotosInManager != null)
                      ? _addPhotos
                      : null,
                  leading: Icon(
                    CatchIcons.addPhotoAlternateOutlined,
                    size: CatchIcon.sm,
                  ),
                ),
              ],
            ),
            gapH8,
            Expanded(
              child: _photos.isEmpty
                  ? OrderedPhotoAddTile(
                      label: context.l10n.coreOrderedPhotoPickerActionAddPhotos,
                      onTap:
                          widget.canAdd &&
                              !_adding &&
                              (widget.onAddPhotos != null ||
                                  widget.onAddPhotosInManager != null)
                          ? _addPhotos
                          : null,
                    )
                  : ReorderableBuilder<int>.builder(
                      itemCount: _photos.length,
                      animationConfig: const ReorderableAnimationConfig(
                        enableAnimations: false,
                      ),
                      enableDraggable: _canReorder,
                      onDragStarted: (index) => _draggedIndex = index,
                      onReorder: _canReorder
                          ? (reorderedListFunction) {
                              final originalOrder = List<int>.generate(
                                _photos.length,
                                (index) => index,
                              );
                              final reorderedOrder = reorderedListFunction(
                                originalOrder,
                              );
                              final fromIndex = _draggedIndex;
                              _draggedIndex = null;
                              if (fromIndex == null) return;
                              final toIndex = reorderedOrder.indexOf(fromIndex);
                              _move(fromIndex, toIndex);
                            }
                          : null,
                      childBuilder: (itemBuilder) => LayoutBuilder(
                        builder: (context, constraints) {
                          final columns =
                              constraints.maxWidth >=
                                  CatchLayout.hostMediaWideGridBreakpoint
                              ? 3
                              : 2;
                          return GridView.builder(
                            padding: const EdgeInsets.only(
                              bottom: CatchSpacing.s8,
                            ),
                            itemCount: _photos.length,
                            gridDelegate:
                                SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: columns,
                                  mainAxisSpacing: CatchSpacing.s2,
                                  crossAxisSpacing: CatchSpacing.s2,
                                  childAspectRatio: CatchAspectRatio.wide16x9,
                                ),
                            itemBuilder: (context, index) {
                              final photo = _photos[index];
                              final actionItems =
                                  <CatchActionMenuItem<_OrderedPhotoAction>>[
                                    if (photo.status ==
                                            OrderedPhotoStatus.failed &&
                                        widget.onRetryPhoto != null)
                                      CatchActionMenuItem(
                                        value: _OrderedPhotoAction.retry,
                                        label: context
                                            .l10n
                                            .coreOrderedPhotoPickerActionRetry,
                                        icon: CatchIcons.refreshRounded,
                                      ),
                                    if (index != 0 && _canReorder)
                                      CatchActionMenuItem(
                                        value: _OrderedPhotoAction.setCover,
                                        label: context
                                            .l10n
                                            .coreOrderedPhotoPickerActionSetAsCover,
                                        icon: CatchIcons.starOutlineRounded,
                                      ),
                                    if (index > 0 && _canReorder)
                                      CatchActionMenuItem(
                                        value: _OrderedPhotoAction.moveEarlier,
                                        label: context
                                            .l10n
                                            .coreOrderedPhotoPickerActionMoveEarlier,
                                        icon: CatchIcons.arrowBackRounded,
                                      ),
                                    if (index < _photos.length - 1 &&
                                        _canReorder)
                                      CatchActionMenuItem(
                                        value: _OrderedPhotoAction.moveLater,
                                        label: context
                                            .l10n
                                            .coreOrderedPhotoPickerActionMoveLater,
                                        icon: CatchIcons.arrowForwardRounded,
                                      ),
                                    if (widget.onRemovePhoto != null)
                                      CatchActionMenuItem(
                                        value: _OrderedPhotoAction.remove,
                                        label: context
                                            .l10n
                                            .coreOrderedPhotoPickerActionRemove,
                                        icon: CatchIcons.deleteOutline,
                                        isDestructive: true,
                                      ),
                                  ];
                              return itemBuilder(
                                OrderedPhotoTile(
                                  key: ValueKey(photo.id),
                                  photo: photo,
                                  index: index,
                                  canReorder: _canReorder,
                                  showCoverBadge: index == 0,
                                  showReorderHandle: _canReorder,
                                  onRetry:
                                      photo.status == OrderedPhotoStatus.failed
                                      ? () => _retry(index)
                                      : null,
                                  statusActionKey:
                                      OrderedPhotoPickerKeys.managerRetryAction(
                                        index,
                                      ),
                                  actionMenu: actionItems.isEmpty
                                      ? null
                                      : CatchActionMenu<_OrderedPhotoAction>(
                                          key:
                                              OrderedPhotoPickerKeys.setCoverAction(
                                                index,
                                              ),
                                          tooltip: context
                                              .l10n
                                              .coreOrderedPhotoPickerActionPhotoOptions,
                                          items: actionItems,
                                          onSelected: (action) {
                                            switch (action) {
                                              case _OrderedPhotoAction.retry:
                                                _retry(index);
                                                break;
                                              case _OrderedPhotoAction.setCover:
                                                _move(index, 0);
                                                break;
                                              case _OrderedPhotoAction
                                                  .moveEarlier:
                                                _move(index, index - 1);
                                                break;
                                              case _OrderedPhotoAction
                                                  .moveLater:
                                                _move(index, index + 1);
                                                break;
                                              case _OrderedPhotoAction.remove:
                                                _remove(index);
                                                break;
                                            }
                                          },
                                        ),
                                ),
                                index,
                              );
                            },
                          );
                        },
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class OrderedPhotoTile extends StatelessWidget {
  const OrderedPhotoTile({
    super.key,
    required this.photo,
    required this.index,
    required this.canReorder,
    required this.showCoverBadge,
    required this.showReorderHandle,
    this.onRemove,
    this.actionMenu,
    this.onRetry,
    this.statusActionKey,
  });

  final OrderedPhotoPreview photo;
  final int index;
  final bool canReorder;
  final bool showCoverBadge;
  final bool showReorderHandle;
  final VoidCallback? onRemove;
  final Widget? actionMenu;
  final VoidCallback? onRetry;
  final Key? statusActionKey;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Semantics(
      image: true,
      label: context.l10n.coreOrderedPhotoPickerLabelPhotoValue1(
        value1: index + 1,
      ),
      child: Tooltip(
        message: context.l10n.coreOrderedPhotoPickerMessagePhotoValue1(
          value1: index + 1,
        ),
        excludeFromSemantics: true,
        child: CatchSurface(
          tone: CatchSurfaceTone.raised,
          radius: CatchRadius.md,
          clipBehavior: Clip.antiAlias,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (photo.bytes != null)
                Image.memory(photo.bytes!, fit: BoxFit.cover)
              else
                CatchNetworkImage(
                  photo.imageUrl!,
                  errorBuilder: (_, _, _) => ColoredBox(
                    color: t.raised,
                    child: Center(
                      child: Icon(
                        CatchIcons.brokenImageOutlined,
                        size: CatchIcon.tile,
                        color: t.ink2,
                      ),
                    ),
                  ),
                ),
              if (onRemove != null)
                Positioned(
                  top: CatchSpacing.s1,
                  right: CatchSpacing.s1,
                  child: Tooltip(
                    message: context.l10n
                        .coreOrderedPhotoPickerMessageRemovePhotoValue1(
                          value1: index + 1,
                        ),
                    child: Material(
                      color: t.surface.withValues(
                        alpha: CatchOpacity.photoSlotDeleteChrome,
                      ),
                      shape: const CircleBorder(),
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        key: OrderedPhotoPickerKeys.removeAction(index),
                        customBorder: const CircleBorder(),
                        onTap: onRemove,
                        child: SizedBox.square(
                          dimension: CatchLayout.photoSlotDeleteExtent,
                          child: Icon(
                            CatchIcons.closeRounded,
                            size: CatchIcon.sm,
                            color: t.ink,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              if (actionMenu != null)
                Positioned(
                  top: CatchSpacing.s1,
                  right: CatchSpacing.s1,
                  child: Material(
                    color: t.surface.withValues(
                      alpha: CatchOpacity.imageEditControlFill,
                    ),
                    shape: const CircleBorder(),
                    clipBehavior: Clip.antiAlias,
                    child: actionMenu!,
                  ),
                ),
              if (showCoverBadge)
                Positioned(
                  top: CatchSpacing.s1,
                  left: CatchSpacing.s1,
                  child: CatchSurface.tinted(
                    radius: CatchRadius.pill,
                    backgroundColor: t.ink.withValues(
                      alpha: CatchOpacity.photoSlotDeleteChrome,
                    ),
                    padding: CatchInsets.mediaRoleBadgeContent,
                    child: Text(
                      context.l10n.coreOrderedPhotoPickerTextCover,
                      style: CatchTextStyles.monoLabel(
                        context,
                        color: t.surface,
                      ),
                    ),
                  ),
                ),
              if (canReorder &&
                  showReorderHandle &&
                  photo.status == OrderedPhotoStatus.ready)
                Positioned(
                  bottom: CatchSpacing.s1,
                  right: CatchSpacing.s1,
                  child: CatchIconTile(
                    icon: CatchIcons.dragIndicatorRounded,
                    iconColor: t.ink,
                    backgroundColor: t.surface.withValues(
                      alpha: CatchOpacity.imageEditControlFill,
                    ),
                    borderColor: Colors.transparent,
                    size: CatchIcon.row,
                    iconSize: CatchIcon.sm,
                    radius: CatchRadius.pill,
                  ),
                ),
              if (photo.status != OrderedPhotoStatus.ready)
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: _OrderedPhotoStatusBanner(
                    key: statusActionKey,
                    status: photo.status,
                    progress: photo.progress,
                    error: photo.error,
                    onRetry: onRetry,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OrderedPhotoStatusBanner extends StatelessWidget {
  const _OrderedPhotoStatusBanner({
    super.key,
    required this.status,
    this.progress,
    this.error,
    this.onRetry,
  });

  final OrderedPhotoStatus status;
  final double? progress;
  final Object? error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final failed = status == OrderedPhotoStatus.failed;
    final activelyUploading = status == OrderedPhotoStatus.uploading;
    final percent = progress == null
        ? null
        : (progress!.clamp(0, 1) * 100).round();
    final label = failed
        ? error == null
              ? context.l10n.coreOrderedPhotoPickerStatusUploadFailed
              : appErrorMessage(error!, l10n: context.l10n)
        : status == OrderedPhotoStatus.queued
        ? context.l10n.coreOrderedPhotoPickerStatusQueued
        : percent == null
        ? context.l10n.coreOrderedPhotoPickerStatusUploading
        : context.l10n.coreOrderedPhotoPickerStatusUploadingProgress(
            percent: percent,
          );
    final retryLabel = context.l10n.coreOrderedPhotoPickerActionRetry;
    return Semantics(
      button: failed && onRetry != null,
      label: failed && onRetry != null ? '$label. $retryLabel' : label,
      child: Material(
        color: (failed ? t.danger : t.ink).withValues(
          alpha: CatchOpacity.hostMediaStatusScrim,
        ),
        child: InkWell(
          onTap: failed ? onRetry : null,
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: CatchSpacing.s2,
              vertical: CatchSpacing.micro6,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (activelyUploading) ...[
                  SizedBox.square(
                    dimension: CatchIcon.xs,
                    child: CatchLoadingIndicator(color: t.surface),
                  ),
                  gapW6,
                ],
                Flexible(
                  child: Text(
                    failed && onRetry != null ? '$label · $retryLabel' : label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: CatchTextStyles.monoLabel(context, color: t.surface),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class OrderedPhotoAddTile extends StatelessWidget {
  const OrderedPhotoAddTile({super.key, required this.label, this.onTap});

  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Semantics(
      button: true,
      enabled: onTap != null,
      label: label,
      child: Tooltip(
        message: label,
        excludeFromSemantics: true,
        child: CatchSurface(
          key: OrderedPhotoPickerKeys.addAction(label),
          tone: CatchSurfaceTone.raised,
          radius: CatchRadius.md,
          clipBehavior: Clip.antiAlias,
          onTap: onTap,
          padding: CatchInsets.contentDense,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final textScale = MediaQuery.textScalerOf(context).scale(1);
              final showLabel = constraints.maxHeight >= 96 && textScale < 1.4;
              return ExcludeSemantics(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      CatchIcons.addPhotoAlternateOutlined,
                      size: CatchIcon.hero,
                      color: t.ink2,
                    ),
                    if (showLabel) ...[
                      gapH8,
                      CatchText(
                        label,
                        variant: CatchTextVariant.bodyLead,
                        color: t.ink2,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                      ),
                    ],
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
