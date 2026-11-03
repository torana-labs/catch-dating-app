import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_field_geometry_scope.dart';
import 'package:catch_ui/src/components/catch_field_geometry_scope_variant.dart';
import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';
import 'package:flutter/widgets.dart';

/// Contained section perimeter, including explicit error/focus chrome.
///
/// The default recipe may reflect descendant focus. [CatchSectionSurface.fieldRows]
/// owns one clip around a group and leaves each child's active treatment inside
/// that boundary. Feature code composes `CatchSection` instead of this anatomy.
class CatchSectionSurface extends StatefulWidget {
  const CatchSectionSurface({
    super.key,
    required this.child,
    required this.padding,
    this.states = const {},
  }) : _fieldRows = false,
       backgroundColor = null,
       borderColor = null;

  const CatchSectionSurface.fieldRows({
    super.key,
    required this.child,
    required this.padding,
    this.backgroundColor,
    this.borderColor,
    this.states = const {},
  }) : _fieldRows = true;

  /// The single rounded clip that owns every contained row's external corners.
  ///
  /// Individual row press surfaces stay rectangular. Their top, middle,
  /// bottom, and single-row shapes are produced only where this group clip
  /// intersects the active row.
  static const rowGroupClipKey = ValueKey<String>(
    'catch-section-row-group-clip',
  );

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? backgroundColor;
  final Color? borderColor;

  /// Explicit section focus and error. Error takes precedence when both apply.
  final Set<WidgetState> states;
  final bool _fieldRows;

  @override
  State<CatchSectionSurface> createState() => _CatchSectionSurfaceState();
}

class _CatchSectionSurfaceState extends State<CatchSectionSurface> {
  bool _descendantFocused = false;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final focused = widget.states.contains(WidgetState.focused);
    final hasError = widget.states.contains(WidgetState.error);

    if (widget._fieldRows) {
      final duration = MediaQuery.maybeOf(context)?.disableAnimations == true
          ? Duration.zero
          : CatchFieldTokens.standard;
      final fieldContent = CatchFieldGeometryScope(
        gutterOwnership: CatchFieldGeometryScope.gutterOwnershipOf(context),
        // The section perimeter consumes one hairline of layout on every
        // edge. Active child chrome reclaims that exact horizontal inset so
        // both primitives paint on one coordinate instead of producing two
        // adjacent vertical strokes. Keep this contract here so direct users
        // of CatchSectionSurface cannot bypass it.
        // This surface owns one rounded clip for the complete row group.
        // Descendant press, focus, edit, and disclosure chrome therefore stays
        // rectangular and receives only the external corners it touches.
        interactionShape: CatchFieldGeometryScopeVariant.sectionClipped,
        child: widget.child,
      );
      final sectionRadius = BorderRadius.circular(
        CatchFieldTokens.sectionRadius,
      );
      final border = hasError
          ? CatchBorder.resolve(t, CatchBorderRole.danger)
          : focused
          ? CatchBorder.resolve(t, CatchBorderRole.focus)
          : CatchBorder.resolve(
              t,
              CatchBorderRole.boundary,
              color: widget.borderColor,
            );
      return ClipRRect(
        key: CatchSectionSurface.rowGroupClipKey,
        borderRadius: sectionRadius,
        clipBehavior: Clip.hardEdge,
        child: AnimatedContainer(
          duration: duration,
          curve: CatchFieldTokens.curve,
          decoration: BoxDecoration(
            color: widget.backgroundColor ?? t.surface,
            borderRadius: sectionRadius,
          ),
          // Paint the perimeter after the row tiles. Active edge rows overlap
          // this same perimeter geometry and first/last rows overlap their
          // internal hairlines, but neither may obscure the section-owned edge.
          foregroundDecoration: BoxDecoration(
            borderRadius: sectionRadius,
            border: border.all,
          ),
          child: Padding(
            // A decoration border contributes its dimensions to Container's
            // child layout; a foreground border does not. Preserve that exact
            // one-hairline content inset while moving only paint order forward.
            padding: const EdgeInsets.all(CatchStroke.hairline),
            child: Padding(padding: widget.padding, child: fieldContent),
          ),
        ),
      );
    }

    final effectiveFocused = focused || _descendantFocused;
    final border = hasError
        ? CatchBorder.resolve(t, CatchBorderRole.danger)
        : effectiveFocused
        ? CatchBorder.resolve(t, CatchBorderRole.focus)
        : CatchBorder.resolve(
            t,
            CatchBorderRole.boundary,
            color: widget.borderColor,
          );
    return Focus(
      canRequestFocus: false,
      skipTraversal: true,
      onFocusChange: _handleFocusChange,
      child: CatchLegacySurface(
        padding: widget.padding,
        radius: CatchRadius.md,
        borderSpec: border,
        boxShadow: effectiveFocused && !hasError
            ? CatchElevation.focusRing(t)
            : null,
        child: widget.child,
      ),
    );
  }

  void _handleFocusChange(bool focused) {
    if (_descendantFocused == focused) return;
    setState(() => _descendantFocused = focused);
  }
}
