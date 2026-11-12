import 'package:catch_dating_app/contexts/events/domain/event_host_photos.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// The host's photos full screen: swipe between them, pinch to zoom, close
/// to return to the after-event screen.
///
/// Guests cannot save or download photos from here; there is deliberately no
/// download action (a conservative default pending the owner's decision).
class EventHostPhotoViewerScreen extends StatefulWidget {
  const EventHostPhotoViewerScreen({
    super.key,
    required this.photos,
    this.initialIndex = 0,
  });

  final List<EventHostPhoto> photos;
  final int initialIndex;

  /// Opens the viewer over the current route.
  static Future<void> open(
    BuildContext context, {
    required List<EventHostPhoto> photos,
    required int initialIndex,
  }) => Navigator.of(context).push(
    MaterialPageRoute<void>(
      fullscreenDialog: true,
      builder: (_) => EventHostPhotoViewerScreen(
        photos: photos,
        initialIndex: initialIndex,
      ),
    ),
  );

  @override
  State<EventHostPhotoViewerScreen> createState() =>
      _EventHostPhotoViewerScreenState();
}

class _EventHostPhotoViewerScreenState
    extends State<EventHostPhotoViewerScreen> {
  late final PageController _pages;
  late int _index;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex.clamp(0, widget.photos.length - 1);
    _pages = PageController(initialPage: _index);
  }

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final photos = widget.photos;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('after-event-photo-viewer'),
        bodyScrolls: false,
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: photos.length > 1
              ? l10n.afterEventPhotoViewerCount(
                  index: _index + 1,
                  count: photos.length,
                )
              : null,
          back: CatchTopBarBack(
            label: l10n.afterEventPhotoViewerClose,
            close: true,
          ),
        ),
        body: PageView.builder(
          controller: _pages,
          itemCount: photos.length,
          onPageChanged: (index) => setState(() => _index = index),
          itemBuilder: (context, index) => InteractiveViewer(
            key: ValueKey<String>('after-event-photo-viewer-$index'),
            maxScale: 4,
            child: Center(
              child: CatchNetworkImage(
                photos[index].displayUrl,
                fit: BoxFit.contain,
                aspect: photos[index].aspectRatio,
                semanticLabel: l10n.afterEventPhotoViewerPhotoLabel(
                  index: index + 1,
                  count: photos.length,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
