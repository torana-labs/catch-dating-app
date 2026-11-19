import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_content_section.dart';
import 'package:catch_ui/src/components/catch_field.dart';
import 'package:catch_ui/src/components/catch_field_activity_notification.dart';
import 'package:catch_ui/src/components/catch_field_divider_geometry.dart';
import 'package:catch_ui/src/components/catch_field_geometry_scope.dart';
import 'package:catch_ui/src/components/catch_field_geometry_scope_mode.dart';
import 'package:catch_ui/src/components/catch_field_geometry_scope_variant.dart';
import 'package:catch_ui/src/components/catch_field_motion.dart';
import 'package:catch_ui/src/components/catch_section_surface.dart';
import 'package:catch_ui/src/patterns/catch_row_viewport.dart';
import 'package:catch_ui/src/patterns/catch_skeleton.dart';
import 'package:catch_ui/src/primitives/catch_divider.dart';
import 'package:flutter/material.dart';

// Keep collection reconciliation keys distinct from the public Field identity.
final class _CatchSectionRowKey extends ValueKey<Object> {
  const _CatchSectionRowKey(super.value);
}

/// Internal renderer for the typed Field collection recipes on CatchSection.
///
/// The box occupies the interaction plane. Gutters constrain its content, never
/// its hit target. Lazy mode preserves the same geometry without eager widgets.
class CatchRowSection extends StatefulWidget {
  const CatchRowSection({
    super.key,
    required List<CatchField> this.children,
    this.title,
    this.count,
    this.trailing,
    this.contained = false,
    this.loading = false,
  }) : _itemCount = null,
       formLeadingInset = null,
       itemBuilder = null,
       indexForKeyBuilder = null;

  const CatchRowSection.sliver({
    super.key,
    required int this._itemCount,
    required this.itemBuilder,
    this.indexForKeyBuilder,
    this.title,
    this.count,
    this.trailing,
    this.loading = false,
  }) : children = null,
       formLeadingInset = null,
       contained = false;

  /// Package-owned form coordinators retain draft/save state around a Field.
  /// Every descriptor carries the canonical icon lane; product code cannot
  /// supply a widget builder to the public row-section recipes.
  const CatchRowSection.form({
    super.key,
    required List<Widget> this.children,
    required double leadingInset,
    this.title,
    this.count,
    this.trailing,
  }) : formLeadingInset = leadingInset,
       loading = false,
       _itemCount = null,
       itemBuilder = null,
       indexForKeyBuilder = null,
       contained = false;

  final List<Widget>? children;
  final double? formLeadingInset;

  final int? _itemCount;
  int get itemCount => children?.length ?? _itemCount!;
  final CatchField Function(BuildContext, int)? itemBuilder;
  final int? Function(Key)? indexForKeyBuilder;
  final String? title;
  final Object? count;
  final Widget? trailing;
  final bool contained;
  final bool loading;

  @override
  State<CatchRowSection> createState() => _CatchRowSectionState();
}

class _CatchRowSectionState extends State<CatchRowSection> {
  final Set<Object> _active = {};
  final Map<int, Object> _identities = {};

  @override
  void didUpdateWidget(CatchRowSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.children case final children?) {
      final identities = {
        for (var i = 0; i < children.length; i++) children[i].key ?? i,
      };
      _active.retainAll(identities);
    }
    _identities.clear();
  }

  Widget? _header(double gutter) {
    if (widget.title == null &&
        widget.count == null &&
        widget.trailing == null) {
      return null;
    }
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: gutter),
      child: CatchContentSectionHeader(
        title: widget.title,
        count: widget.count,
        trailing: widget.trailing,
      ),
    );
  }

  // A row that draws its own boundary needs no separator on either side.
  static bool _suppressesDividers(Widget? entry) => switch (entry) {
    CatchFieldDividerGeometry(:final suppressesFieldDividers) =>
      suppressesFieldDividers,
    _ => false,
  };

  bool _isActive(int index) {
    if (index >= widget.itemCount) return false;
    final children = widget.children;
    if (children != null &&
        children[index] is CatchField &&
        (children[index] as CatchField).states.contains(WidgetState.selected)) {
      return true;
    }
    final identity = children != null
        ? children[index].key ?? index
        : _identities[index];
    return identity != null && _active.contains(identity);
  }

  Widget _row(
    BuildContext context,
    int index,
    double gutter, {
    bool fullPlane = true,
  }) {
    final entry =
        widget.children?[index] ?? widget.itemBuilder!(context, index);
    final identity = entry.key ?? index;
    _identities[index] = identity;
    return KeyedSubtree(
      key: _CatchSectionRowKey(identity),
      child: NotificationListener<CatchFieldActivityNotification>(
        onNotification: (notification) {
          if (notification.active == _active.contains(identity)) return true;
          setState(() {
            if (notification.active) {
              _active.add(identity);
            } else {
              _active.remove(identity);
            }
          });
          return true;
        },
        child: Stack(
          children: [
            CatchFieldGeometryScope(
              gutterOwnership: CatchFieldGeometryScopeMode.field,
              contentInsets: EdgeInsets.symmetric(horizontal: gutter),
              interactionOutsets: EdgeInsets.zero,
              exactBounds: true,
              interactionShape: widget.contained
                  ? CatchFieldGeometryScopeVariant.sectionClipped
                  : fullPlane
                  ? CatchFieldGeometryScopeVariant.fullBleedBand
                  : CatchFieldGeometryScopeVariant.roundedTile,
              child: widget.loading
                  ? CatchSkeleton.content(child: entry)
                  : entry,
            ),
            if (index < widget.itemCount - 1 &&
                !_suppressesDividers(entry) &&
                !_suppressesDividers(widget.children?[index + 1]))
              PositionedDirectional(
                start:
                    gutter +
                    (widget.formLeadingInset ??
                        (entry as CatchField).fieldDividerLeadingInset),
                end: gutter,
                bottom: 0,
                child: IgnorePointer(
                  child: AnimatedOpacity(
                    opacity: _isActive(index) || _isActive(index + 1) ? 0 : 1,
                    duration: catchFieldMotionDuration(
                      context,
                      CatchFieldTokens.standard,
                    ),
                    // Section already positions the line at the text lane.
                    child: const CatchDivider.fieldRow(indent: 0),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.children == null) {
      return SliverLayoutBuilder(
        builder: (context, constraints) {
          assert(
            CatchRowViewport.matches(context, constraints.crossAxisExtent) !=
                false,
            'A row section must fill its page or pane. Remove outer padding; use containedRows for an inset surface.',
          );
          final gutter = catchSectionContentGutter(constraints.crossAxisExtent);
          final header = _header(gutter);
          return SliverMainAxisGroup(
            slivers: [
              if (header != null) SliverToBoxAdapter(child: header),
              SliverList.builder(
                itemCount: widget.itemCount,
                findChildIndexCallback: widget.indexForKeyBuilder == null
                    ? null
                    : (key) => key is _CatchSectionRowKey && key.value is Key
                          ? widget.indexForKeyBuilder!(key.value as Key)
                          : null,
                itemBuilder: (context, index) => _row(
                  context,
                  index,
                  gutter,
                  fullPlane:
                      CatchRowViewport.matches(
                        context,
                        constraints.crossAxisExtent,
                      ) ==
                      true,
                ),
              ),
            ],
          );
        },
      );
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        assert(
          constraints.hasBoundedWidth,
          'Row sections need a page or pane.',
        );
        assert(
          widget.contained ||
              CatchRowViewport.matches(context, constraints.maxWidth) != false,
          'A row section must fill its page or pane. Remove outer padding; use containedRows for an inset surface.',
        );
        final gutter = catchSectionContentGutter(constraints.maxWidth);
        final header = _header(gutter);
        final rows = Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < widget.itemCount; i++)
              _row(
                context,
                i,
                widget.contained
                    ? CatchFieldTokens.rowHorizontalPadding
                    : gutter,
                fullPlane:
                    CatchRowViewport.matches(context, constraints.maxWidth) ==
                    true,
              ),
          ],
        );
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ?header,
            if (widget.contained)
              Padding(
                padding: EdgeInsets.symmetric(horizontal: gutter),
                child: CatchSectionSurface.fieldRows(
                  padding: EdgeInsets.zero,
                  child: rows,
                ),
              )
            else
              rows,
          ],
        );
      },
    );
  }
}
