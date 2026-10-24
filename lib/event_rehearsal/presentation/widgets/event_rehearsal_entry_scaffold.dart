import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_configuration.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_entry_page_body.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// The rehearsal entry view, with a single start action and optional editors.
/// The route controller supplies source loading, persistence and navigation.
class EventRehearsalEntryScaffold extends StatelessWidget {
  const EventRehearsalEntryScaffold({
    super.key,
    required this.configuration,
    required this.onChooseSource,
    required this.onChooseScenario,
    required this.onCustomise,
    required this.onStart,
    this.isPending = false,
  });

  final EventRehearsalConfiguration configuration;
  final VoidCallback onChooseSource;
  final VoidCallback onChooseScenario;
  final VoidCallback onCustomise;
  final VoidCallback onStart;
  final bool isPending;

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !isPending,
    child: CatchRouteScaffold(
      topBarBuilder: (context, scrolled) => CatchTopBar.route(
        title: context.l10n.hostEventRehearsalTitle,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolled
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      // The action overlay owns the edge-to-edge plane. Its body delegates the
      // ordinary content gutter, responsive width and scroll to the page owner.
      body: CatchRouteBody.fullBleed(
        child: CatchBottomActionOverlay(
          body: CatchSectionList.page(
            emptyStateOmitted: true,
            terminalExtra: CatchLayout.bottomActionScrimHeight,
            items: [
              CatchSectionListItem(
                child: CatchSection.plain(
                  padding: EdgeInsets.zero,
                  child: EventRehearsalEntryPageBody(
                    configuration: configuration,
                    onChooseSource: isPending ? null : onChooseSource,
                    onChooseScenario: isPending ? null : onChooseScenario,
                    onCustomise: isPending ? null : onCustomise,
                  ),
                ),
              ),
            ],
          ),
          meta: ColoredBox(
            color: CatchTokens.of(context).bg,
            child: Padding(
              padding: CatchInsets.content,
              child: CatchText(
                context.l10n.hostRehearsalSafety,
                textAlign: TextAlign.center,
                variant: CatchTextVariant.bodyS,
                color: CatchTokens.of(context).ink2,
              ),
            ),
          ),
          actions: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(
                maxWidth: CatchLayout.maxContentWidth,
              ),
              child: CatchButton(
                label: context.l10n.hostRehearsalStart,
                fullWidth: true,
                size: CatchButtonSize.lg,
                status: isPending
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                onPressed:
                    isPending ||
                        configuration.actorCount < 2 ||
                        configuration.actorCount > 50 ||
                        !configuration.hasValidDuration
                    ? null
                    : onStart,
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
