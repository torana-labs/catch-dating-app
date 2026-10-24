import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/components/catch_icon_action.dart';
import 'package:catch_ui/src/components/catch_top_bar.dart';
import 'package:catch_ui/src/components/catch_top_bar_navigation.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:flutter/material.dart';

/// Handoff `StepHeader`: wizard header built from the shared large AppBar plus
/// a 2px progress hairline.
class CatchStepHeader extends StatelessWidget {
  const CatchStepHeader({
    super.key,
    required this.title,
    required this.stepLabelBuilder,
    required this.compactStepLabelBuilder,
    this.subtitle,
    this.kicker,
    this.step,
    this.total,
    this.onBack,
    this.showBack = true,
    this.leadingType,
    this.onStepOverview,
    this.stepOverviewSemanticsLabel,
    this.trailing,
    this.gutter = true,
  });

  final String title;
  final String Function(int step, int total) stepLabelBuilder;
  final String Function(int step, int total) compactStepLabelBuilder;
  final String? subtitle;
  final String? kicker;
  final int? step;
  final int? total;
  final VoidCallback? onBack;
  final bool showBack;
  final CatchTopBarNavigationMode? leadingType;
  final VoidCallback? onStepOverview;
  final String? stepOverviewSemanticsLabel;
  final Widget? trailing;
  final bool gutter;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final hasProgress = step != null && total != null && total! > 0;
    final clampedStep = hasProgress ? step!.clamp(1, total!) : null;
    final fraction = hasProgress
        ? (clampedStep! / total!).clamp(0.0, 1.0)
        : 0.0;
    final stepLabel = hasProgress
        ? stepLabelBuilder(clampedStep!, total!)
        : null;
    final visibleStepLabel =
        hasProgress && MediaQuery.textScalerOf(context).scale(1) >= 1.6
        ? compactStepLabelBuilder(clampedStep!, total!)
        : stepLabel;
    final topRight =
        trailing ??
        (hasProgress
            ? (onStepOverview == null
                  ? Text(
                      visibleStepLabel!,
                      style: CatchTextStyles.bodyS(context, color: t.ink3),
                    )
                  : Semantics(
                      button: true,
                      label: stepOverviewSemanticsLabel ?? stepLabel,
                      excludeSemantics: true,
                      child: CatchButton.text(
                        label: visibleStepLabel!,
                        onPressed: onStepOverview,
                        tone: CatchButtonTone.neutral,
                        minimumSize: const Size(
                          CatchSpacing.s0,
                          CatchIconAction.navSize,
                        ),
                        padding: EdgeInsets.zero,
                        textStyle: CatchTextStyles.bodyS(
                          context,
                          color: t.ink3,
                        ),
                      ),
                    ))
            : null);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchTopBar.route(
          title: title,
          subtitle: [?kicker, ?subtitle].join(' · '),
          navigation: CatchTopBarNavigation(
            mode:
                leadingType ??
                (showBack
                    ? CatchTopBarNavigationMode.back
                    : CatchTopBarNavigationMode.none),
            onPressed: onBack,
          ),

          actions: [?topRight],
        ),
        if (hasProgress)
          Padding(
            padding: EdgeInsets.symmetric(
              horizontal: gutter ? CatchSpacing.screenPx : CatchSpacing.s0,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(CatchRadius.pill),
              child: SizedBox(
                height: CatchLayout.stepHeaderProgressHeight,
                child: ColoredBox(
                  color: t.line,
                  child: FractionallySizedBox(
                    alignment: Alignment.centerLeft,
                    widthFactor: fraction,
                    child: ColoredBox(color: t.ink),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
