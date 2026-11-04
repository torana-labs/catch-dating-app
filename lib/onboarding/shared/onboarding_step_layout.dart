import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class OnboardingStepLayout extends StatelessWidget {
  const OnboardingStepLayout({
    super.key,
    required this.children,
    this.footer,
    this.padding = const EdgeInsets.fromLTRB(
      CatchSpacing.s5,
      CatchSpacing.s5,
      CatchSpacing.s5,
      CatchSpacing.s0,
    ),
    this.footerPadding = const EdgeInsets.fromLTRB(
      CatchSpacing.s5,
      CatchSpacing.s3,
      CatchSpacing.s5,
      CatchSpacing.s6,
    ),
  });

  static const scrollBodyKey = ValueKey<String>('onboarding-step-scroll-body');

  final List<Widget> children;
  final Widget? footer;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry footerPadding;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: CatchPageBody.screen(
            key: scrollBodyKey,
            padding: padding,
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(
                  maxWidth: CatchLayout.maxContentWidth,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: children,
                ),
              ),
            ),
          ),
        ),
        if (footer != null)
          SafeArea(
            top: false,
            child: CatchLegacyDock(
              includeSafeArea: false,
              padding: footerPadding,
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(
                    maxWidth: CatchLayout.maxContentWidth,
                  ),
                  child: footer,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
