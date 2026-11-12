import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

/// Hangs [child] on the baseline of the text beside it without making its
/// line taller.
///
/// In a baseline-aligned [CatchOverhangStack] row, the child is laid out at its
/// full size, but it takes no height in the row: its alphabetic baseline sits
/// on the row's baseline, and the rest of it overhangs the line above and
/// below. A section's quiet action uses this so its 48 px target does not push
/// the title down, and a section with an action starts where any other
/// section does.
///
/// The overhanging part still receives taps, as long as every ancestor up to
/// the area it overhangs is a [CatchOverhangStack] (or another widget that
/// hit-tests its children outside its own bounds).
class CatchBaselineOverhangLayout extends SingleChildRenderObjectWidget {
  const CatchBaselineOverhangLayout({required Widget super.child, super.key});

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderBaselineOverhang();
}

class _RenderBaselineOverhang extends RenderShiftedBox {
  _RenderBaselineOverhang() : super(null);

  @override
  void performLayout() {
    final child = this.child;
    if (child == null) {
      size = constraints.smallest;
      return;
    }
    child.layout(
      BoxConstraints(maxWidth: constraints.maxWidth),
      parentUsesSize: true,
    );
    final baseline =
        child.getDistanceToBaseline(TextBaseline.alphabetic) ??
        child.size.height;
    (child.parentData! as BoxParentData).offset = Offset(0, -baseline);
    size = constraints.constrain(Size(child.size.width, 0));
  }

  @override
  double? computeDistanceToActualBaseline(TextBaseline baseline) => 0;

  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) {
    if (!hitTestChildren(result, position: position)) return false;
    result.add(BoxHitTestEntry(this, position));
    return true;
  }
}

/// A row or column that hit-tests its children even outside its own bounds.
///
/// Use it for the rows and columns that hold a [CatchBaselineOverhangLayout],
/// so the part of the overhanging child that lies outside them still receives
/// its taps. It lays out exactly like a [Flex] with the same arguments, and
/// takes [Expanded] and [Flexible] children the same way.
class CatchOverhangStack extends MultiChildRenderObjectWidget {
  const CatchOverhangStack({
    required this.direction,
    required super.children,
    this.crossAxisAlignment = CrossAxisAlignment.center,
    this.mainAxisSize = MainAxisSize.max,
    this.textBaseline,
    this.spacing = 0,
    super.key,
  }) : assert(
         crossAxisAlignment != CrossAxisAlignment.baseline ||
             textBaseline != null,
         'A baseline-aligned stack needs a textBaseline.',
       );

  final Axis direction;
  final CrossAxisAlignment crossAxisAlignment;
  final MainAxisSize mainAxisSize;
  final TextBaseline? textBaseline;
  final double spacing;

  @override
  RenderFlex createRenderObject(BuildContext context) => _RenderOverhangStack(
    direction: direction,
    mainAxisSize: mainAxisSize,
    crossAxisAlignment: crossAxisAlignment,
    textDirection: Directionality.maybeOf(context),
    textBaseline: textBaseline,
    spacing: spacing,
  );

  @override
  void updateRenderObject(BuildContext context, RenderFlex renderObject) {
    renderObject
      ..direction = direction
      ..mainAxisSize = mainAxisSize
      ..crossAxisAlignment = crossAxisAlignment
      ..textDirection = Directionality.maybeOf(context)
      ..textBaseline = textBaseline
      ..spacing = spacing;
  }
}

class _RenderOverhangStack extends RenderFlex {
  _RenderOverhangStack({
    super.direction,
    super.mainAxisSize,
    super.crossAxisAlignment,
    super.textDirection,
    super.textBaseline,
    super.spacing,
  });

  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) {
    if (!hitTestChildren(result, position: position)) return false;
    result.add(BoxHitTestEntry(this, position));
    return true;
  }
}
