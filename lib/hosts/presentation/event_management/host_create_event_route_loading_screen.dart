import 'package:catch_dating_app/hosts/presentation/widgets/host_wizard_step_header.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostCreateEventRouteLoadingScreen extends StatelessWidget {
  const HostCreateEventRouteLoadingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CatchScaffold.stepFlow(
      backgroundColor: t.bg,
      safeArea: CatchScaffoldPlacement.top,
      body: Column(
        children: [
          HostWizardStepHeader(
            title: context
                .l10n
                .hostsHostCreateEventRouteLoadingScreenTitleEventBasics,
            subtitle: context
                .l10n
                .hostsHostCreateEventRouteLoadingScreenBodyLoadingOrganizer,
            currentStep: 0,
            totalSteps: 5,
            onClose: () => Navigator.of(context).maybePop(),
          ),
          gapH4,
          const Expanded(child: CreateEventLoadingBody()),
          const CreateEventDockSkeleton(),
        ],
      ),
    );
  }
}

class CreateEventLoadingBody extends StatelessWidget {
  const CreateEventLoadingBody({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: CatchInsets.hostCreateEventLoadingBody,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchSkeleton.text(width: CatchLayout.skeletonTextInlineTitleWidth),
          gapH12,
          CatchSkeleton.card(
            height: CatchLayout.hostCreateEventRouteFormSkeletonHeight,
          ),
          gapH24,
          CatchSkeleton.text(width: CatchLayout.skeletonTextPageTitleWidth),
          gapH12,
          const LoadingChipRow(widths: [168, 108]),
          gapH10,
          const LoadingChipRow(widths: [212]),
          gapH18,
          CatchSkeleton.text(width: CatchLayout.skeletonTextBodyWidth),
          gapH12,
          CatchSkeleton.textBlock(),
        ],
      ),
    );
  }
}

class LoadingChipRow extends StatelessWidget {
  const LoadingChipRow({super.key, required this.widths});

  final List<double> widths;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: CatchSpacing.s2,
      runSpacing: CatchSpacing.s2,
      children: [
        for (final width in widths)
          CatchSkeleton.box(
            width: width,
            height: CatchLayout.controlMdMinHeight,
            radius: CatchRadius.pill,
          ),
      ],
    );
  }
}

class CreateEventDockSkeleton extends StatelessWidget {
  const CreateEventDockSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchSurface(
      duration: Duration.zero,
      radius: CatchRadius.none,
      backgroundColor: t.bg,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: CatchInsets.hostCreateEventLoadingFooter,
            child: Row(
              children: [
                CatchSkeleton.box(
                  width: CatchLayout.skeletonTextBodyWidth,
                  height: CatchButtonTokens.largeHeight,
                  radius: CatchRadius.pill,
                ),
                gapW12,
                Expanded(
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: CatchSkeleton.box(
                      width: CatchLayout.skeletonTextInlineTitleWidth,
                      height: CatchButtonTokens.largeHeight,
                      radius: CatchRadius.pill,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const CatchScrollTerminalGap(extra: CatchSpacing.s3),
        ],
      ),
    );
  }
}
