part of 'catch_field.dart';

extension _CatchFieldEdit on _CatchFieldState {
  void _handleSubmitted(String value) {
    widget.onSubmitted?.call(value);
  }

  EdgeInsets get _rowPadding {
    final vertical = widget._outlinedTextEntry
        ? CatchFieldTokens.boxRowVerticalPadding
        : CatchFieldTokens.rowVerticalPadding;
    final contentInsets = CatchFieldGeometryScope.contentInsetsOf(context);
    if (contentInsets != null) {
      return contentInsets.copyWith(top: vertical, bottom: vertical);
    }
    final containerOwnsGutter =
        CatchFieldGeometryScope.gutterOwnershipOf(context) ==
        CatchFieldGeometryScopeMode.container;
    // Outside every field section the parent pads the page, and an outlined
    // box has no band to bleed into that gutter, so it meets the content edge.
    if (widget._outlinedTextEntry &&
        CatchFieldGeometryScope.maybeInteractionShapeOf(context) == null) {
      return EdgeInsets.symmetric(vertical: vertical);
    }
    if (_compactTextEntry) {
      return containerOwnsGutter
          ? EdgeInsets.zero
          : const EdgeInsets.symmetric(horizontal: CatchSpacing.s1);
    }
    if (containerOwnsGutter) {
      return EdgeInsets.symmetric(vertical: vertical);
    }
    return EdgeInsets.fromLTRB(
      CatchFieldTokens.rowHorizontalPadding,
      vertical,
      CatchFieldTokens.rowHorizontalPadding,
      vertical,
    );
  }

  EdgeInsets get _rowHeaderPadding {
    final padding = _rowPadding;
    if (!_hasControl) return padding;
    return EdgeInsets.fromLTRB(
      padding.left,
      padding.top,
      padding.right,
      _isOpen ? 0 : padding.bottom,
    );
  }

  BoxConstraints get _rowConstraints {
    if (_compactTextEntry) {
      return const BoxConstraints(
        minHeight: CatchControlMetrics.floatingMinHeight,
      );
    }
    return const BoxConstraints();
  }
}

Duration _expansionMotionDuration(BuildContext context) {
  return catchFieldMotionDuration(context, CatchMotion.base);
}
