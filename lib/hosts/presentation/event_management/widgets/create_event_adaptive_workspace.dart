import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Route-owned adaptive composition for Create Event.
///
/// The flow keeps one controller, page state, validation contract, and action
/// footer at every width. Wider layouts add only provider-free views over that
/// same state: one editing pane and a flowing step/review preview. The shared
/// workspace owns adaptation and resizing.
class CreateEventAdaptiveWorkspace extends StatelessWidget {
  const CreateEventAdaptiveWorkspace({
    super.key,
    required this.header,
    required this.body,
    required this.steps,
    required this.currentStep,
    required this.onStepSelected,
    required this.summaryTitle,
    required this.summaryItems,
  });

  final Widget header;
  final Widget body;
  final List<CatchFormStepReviewItem> steps;
  final int currentStep;
  final ValueChanged<int> onStepSelected;
  final String summaryTitle;
  final List<CatchFormReviewSummaryItem> summaryItems;

  @override
  Widget build(BuildContext context) => HostNavigationWorkspace(
    spec: HostEditorWorkspace(
      editor: CreateEventWorkspaceLayout(
        key: const ValueKey('host-create-event-form-lane'),
        header: header,
        body: body,
      ),
      preview: ListView(
        padding: CatchInsets.pageBodyTight,
        children: [
          CreateEventStepRail(
            key: const ValueKey('host-create-event-step-rail'),
            steps: steps,
            currentStep: currentStep,
            onStepSelected: onStepSelected,
          ),
          gapH4,
          CreateEventConsequenceSection(
            key: const ValueKey('host-create-event-consequence-pane'),
            title: summaryTitle,
            items: summaryItems,
          ),
        ],
      ),
    ),
  );
}

class CreateEventWorkspaceLayout extends StatelessWidget {
  const CreateEventWorkspaceLayout({
    super.key,
    required this.header,
    required this.body,
  });

  final Widget header;
  final Widget body;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        header,
        gapH4,
        Expanded(child: body),
      ],
    );
  }
}

class CreateEventStepRail extends StatelessWidget {
  const CreateEventStepRail({
    super.key,
    required this.steps,
    required this.currentStep,
    required this.onStepSelected,
  });

  final List<CatchFormStepReviewItem> steps;
  final int currentStep;
  final ValueChanged<int> onStepSelected;

  @override
  Widget build(BuildContext context) {
    final selectedIndex = currentStep.clamp(0, steps.length - 1);
    return CatchSection.plain(
      title: steps[selectedIndex].title,
      count: '${selectedIndex + 1}/${steps.length}',
      child: CatchFieldLanes.divided(
        children: [
          for (final item in steps)
            CatchField.nav(
              copy: catchFieldCopy(context.l10n),
              key: ValueKey('catch-form-step-overview-${item.index}'),
              title: item.title,
              body: _statusLabel(context, item.status),
              tone: item.index == selectedIndex
                  ? CatchFieldTone.primary
                  : CatchFieldTone.normal,
              showChevron: false,
              onTap: () => onStepSelected(item.index),
            ),
        ],
      ),
    );
  }

  String _statusLabel(
    BuildContext context,
    CatchFormStepListStatus status,
  ) => switch (status) {
    CatchFormStepListStatus.complete => context.l10n.hostsWizardStatusComplete,
    CatchFormStepListStatus.needsInformation =>
      context.l10n.hostsWizardStatusNeedsInformation,
    CatchFormStepListStatus.optional => context.l10n.hostsWizardStatusOptional,
  };
}

class CreateEventConsequenceSection extends StatelessWidget {
  const CreateEventConsequenceSection({
    super.key,
    required this.title,
    required this.items,
  });

  final String title;
  final List<CatchFormReviewSummaryItem> items;

  @override
  Widget build(BuildContext context) {
    return CatchSection.plain(
      title: title,
      child: CatchFieldLanes.divided(
        children: [
          for (final item in items)
            CatchField.read(
              copy: catchFieldCopy(context.l10n),
              title: item.label,
              body: item.value,
              bodyMaxLines: 4,
              icon: item.icon,
            ),
        ],
      ),
    );
  }
}
