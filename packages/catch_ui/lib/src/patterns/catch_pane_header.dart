import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_icon_action.dart';
import 'package:catch_ui/src/components/catch_top_bar.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/patterns/catch_workspace_pane_scaffold.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// The system PaneHeader as data: the 56 px row that heads one pane of a list
/// and detail layout, with one hairline under it.
///
/// A [kicker] is the breadcrumb before the [title] ("People / Rhea Kapoor"),
/// [count] follows the title muted (how many rows the pane holds) and [note]
/// adds a muted line after it. [back] draws a plain back or close button
/// first; [trailing] holds the small actions at the end. It sits in a
/// [CatchWorkspaceHeader], so the headers of panes side by side share one
/// height and one hairline.
class CatchPaneHeader extends StatelessWidget {
  const CatchPaneHeader({
    super.key,
    required this.title,
    this.kicker,
    this.count,
    this.note,
    this.back,
    this.trailing,
  });

  final String title;
  final String? kicker;
  final int? count;
  final String? note;
  final CatchTopBarBack? back;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final sizeClass = CatchRootScope.sizeClassOf(context);
    final localizations = MaterialLocalizations.of(context);
    final titleStyle = CatchTextVariant.titleBar
        .style(sizeClass)
        .copyWith(color: t.ink);
    final muted = titleStyle.copyWith(
      color: t.ink2,
      fontWeight: FontWeight.w500,
    );
    final kicker = this.kicker;
    final count = this.count;
    final note = this.note;
    final back = this.back;
    final trailing = this.trailing;
    return CatchWorkspaceHeader(
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(color: t.line, width: CatchStroke.hairline),
          ),
        ),
        child: ConstrainedBox(
          constraints: const BoxConstraints(
            minHeight: CatchLayout.topBarHeight,
          ),
          child: Row(
            spacing: CatchSpacing.s3,
            children: [
              if (back != null)
                CatchIconAction.icon(
                  icon: back.close ? CatchIcons.close : CatchIcons.back,
                  tooltip:
                      back.label ??
                      (back.close
                          ? localizations.closeButtonTooltip
                          : localizations.backButtonTooltip),
                  onPressed:
                      back.onPressed ?? () => Navigator.maybePop(context),
                  variant: CatchIconActionVariant.plain,
                  size: GeneratedCatchSizeTokens.controlSm,
                ),
              Expanded(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  spacing: CatchSpacing.s2,
                  children: [
                    Flexible(
                      flex: 2,
                      child: Semantics(
                        header: true,
                        child: Text.rich(
                          TextSpan(
                            children: [
                              if (kicker != null) ...[
                                TextSpan(text: kicker, style: muted),
                                TextSpan(
                                  text: ' / ',
                                  style: muted.copyWith(color: t.ink3),
                                ),
                              ],
                              TextSpan(text: title),
                              if (count != null)
                                TextSpan(text: ' $count', style: muted),
                            ],
                          ),
                          style: titleStyle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    if (note != null)
                      Flexible(
                        child: Text(
                          note,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: CatchTextVariant.bodyMeta
                              .style(sizeClass)
                              .copyWith(color: t.ink2),
                        ),
                      ),
                  ],
                ),
              ),
              ?trailing,
            ],
          ),
        ),
      ),
    );
  }
}
