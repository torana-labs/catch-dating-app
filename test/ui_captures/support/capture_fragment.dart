import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

/// One widget to cut out of a capture's screen: a website hero floats these
/// cut-outs over the screen they come from (docs/marketing_app_media_pipeline.md).
///
/// The runner lays the screen out as usual, scrolls the widget into view if
/// it is below the fold, and crops the PNG to the widget's box, so the
/// cut-out is the real widget at its natural size on the screen's own ground.
class CaptureFragment {
  const CaptureFragment({required this.find, this.padding = EdgeInsets.zero});

  /// Finds the one widget to cut out.
  final Finder Function() find;

  /// Screen ground kept around the widget, in points, such as the space
  /// around a card. It is clamped to the screen.
  final EdgeInsets padding;
}
