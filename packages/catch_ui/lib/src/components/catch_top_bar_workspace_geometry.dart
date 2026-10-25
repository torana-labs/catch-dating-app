part of 'catch_top_bar.dart';

extension _WorkspaceTopBarGeometry on CatchTopBar {
  bool _workspace(BuildContext context) =>
      CatchWorkspacePaneScope.isSinglePaneOf(context) != null;

  EdgeInsets _paddingFor(BuildContext context) => _workspace(context)
      ? const EdgeInsets.symmetric(
          horizontal: CatchSpacing.screenPx,
          vertical: CatchSpacing.s3,
        )
      : _padding;

  TextStyle _titleStyle(BuildContext context, {Color? color}) {
    final style = _workspace(context) || _root
        ? CatchTextStyles.headline(context, color: color)
        : CatchTextStyles.titleL(context, color: color);
    return _kind == _TopBarKind.brand
        ? CatchFonts.head(
            fontSize: style.fontSize!,
            height: style.height!,
            color: style.color,
          )
        : style;
  }

  bool _navigationVisible(BuildContext context) => switch (navigation.mode) {
    CatchTopBarNavigationMode.none => false,
    CatchTopBarNavigationMode.close => true,
    CatchTopBarNavigationMode.back =>
      CatchWorkspacePaneScope.isSinglePaneOf(context) != false,
    CatchTopBarNavigationMode.auto =>
      CatchWorkspacePaneScope.isSinglePaneOf(context) != false &&
          (CatchWorkspaceBackScope.maybeOf(context) != null ||
              (Navigator.maybeOf(context)?.canPop() ?? false)),
  };

  ({double baseline, double inset}) _workspaceTitleMetrics(
    BuildContext context,
  ) {
    final painter = TextPainter(
      text: TextSpan(
        text: (identityName ?? title ?? '').split('\n').first,
        style: CatchTextStyles.headline(context),
      ),
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
    )..layout();
    final inset = math.max(
      0.0,
      (CatchToolbarMetrics.targetExtent - painter.height) / 2,
    );
    final baseline =
        painter.computeDistanceToActualBaseline(TextBaseline.alphabetic) +
        inset;
    painter.dispose();
    return (baseline: baseline, inset: inset);
  }

  double _actionsHeight(BuildContext context, double width) {
    var height = CatchPlatformTokens.minimumInteractiveExtent;
    final lane = math.max(
      1.0,
      (width - CatchSpacing.s2 * (actions.length - 1)) / actions.length,
    );
    for (final item in actions) {
      Widget? action = item;
      // Accessibility wrappers do not change a control's painted size.
      while (action is Semantics) {
        action = action.child;
      }
      if (action is Text) {
        height = math.max(
          height,
          _textHeight(
            context,
            action.data ?? action.textSpan?.toPlainText() ?? '',
            action.style ?? DefaultTextStyle.of(context).style,
            lane,
            maxLines: action.maxLines,
          ),
        );
      }
      if (action is CatchTopBarPrimaryButton &&
          !CatchWindowSize.fromWidth(
            MediaQuery.sizeOf(context).width,
          ).isCompact) {
        height = math.max(
          height,
          CatchToolbarButton.sizeFor(context, label: action.label).height,
        );
      }
      if (action is CatchButton && action.isTextAction) {
        final tapTargetSize =
            action.tapTargetSize ??
            TextButtonTheme.of(context).style?.tapTargetSize ??
            Theme.of(context).materialTapTargetSize;
        height = math.max(height, action.minimumSize.height);
        if (tapTargetSize == MaterialTapTargetSize.padded) {
          height = math.max(height, kMinInteractiveDimension);
        }
        final padding = action.padding.resolve(Directionality.of(context));
        final labelWidth =
            lane -
            padding.horizontal -
            (action.leading == null
                ? 0
                : CatchPlatformTokens.minimumInteractiveExtent +
                      action.leadingGap);
        height = math.max(
          height,
          _textHeight(
                context,
                action.label,
                action.textStyle ??
                    CatchTextStyles.titleS(
                      context,
                      color: CatchTokens.of(context).ink,
                    ),
                math.max(1, labelWidth),
              ) +
              padding.vertical,
        );
      }
    }
    return height.ceilToDouble();
  }

  static double _textHeight(
    BuildContext context,
    String text,
    TextStyle style,
    double width, {
    int? maxLines,
  }) {
    final painter = TextPainter(
      text: TextSpan(text: text, style: style),
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
      locale: Localizations.maybeLocaleOf(context),
      maxLines: maxLines,
      ellipsis: maxLines == null ? null : '…',
    )..layout(maxWidth: width);
    final height = painter.height;
    painter.dispose();
    return height;
  }
}
