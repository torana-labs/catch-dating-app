import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Function-lead attention feed: program-scoped staffAttention moment sends
/// filtered server-side to the caller's duties — late-arrival and disruption
/// alerts raised by Moments land here for whoever holds the stamped duty.
class ProgramAttentionScreen extends ConsumerWidget {
  const ProgramAttentionScreen({super.key, required this.programId, this.now});

  final String programId;

  /// Test seam for recency labels; production uses wall clock.
  final DateTime Function()? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attentionAsync = ref.watch(programStaffAttentionProvider(programId));
    return CatchAsyncBoundary<ProgramStaffAttention>(
      retainDataOn: const {},
      value: attentionAsync,
      onRetry: () => ref.invalidate(programStaffAttentionProvider(programId)),
      loadingBuilder: (_) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsAttentionTitle,
          subtitle: context.l10n.programsAttentionSubtitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: const CatchRouteBody.standardViewport(
          child: CatchStateViewport.loading(accountForBottomOverlay: false),
        ),
      ),
      errorBuilder: (_, error, _, onBoundaryRetry) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsAttentionTitle,
          subtitle: context.l10n.programsAttentionSubtitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchLocalizedErrorState(
            error,
            context: AppErrorContext.event,
            onRetry: onBoundaryRetry,
          ),
        ),
      ),
      builder: (context, feed) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsAttentionTitle,
          subtitle: context.l10n.programsAttentionSubtitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: CatchRouteBody.standardSections(
          sections: [
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsAttentionFeedTitle,
                subtitle: feed.truncated
                    ? context.l10n.programsAttentionFeedSubtitleTruncated
                    : context.l10n.programsAttentionFeedSubtitle,
                child: feed.items.isEmpty
                    ? CatchEmptyState(
                        icon: CatchIcons.notifications,
                        message: context.l10n.programsAttentionEmpty,
                        variant: CatchEmptyStateVariant.inline,
                      )
                    : Column(
                        children: [
                          for (final item in feed.items)
                            ProgramAttentionRow(
                              item: item,
                              now: (now ?? DateTime.now)(),
                            ),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ProgramAttentionRow extends StatelessWidget {
  const ProgramAttentionRow({super.key, required this.item, required this.now});

  final ProgramStaffAttentionItem item;
  final DateTime now;

  @override
  Widget build(BuildContext context) => CatchFieldRow.standard(
    leading: Icon(switch (item.severity) {
      'urgent' => CatchIcons.error,
      'warning' => CatchIcons.warning,
      _ => CatchIcons.notifications,
    }),
    body: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchText(item.title, variant: CatchTextVariant.sectionTitle),
        gapH4,
        Wrap(
          spacing: CatchSpacing.s2,
          runSpacing: CatchSpacing.s1,
          children: [
            CatchBadge(
              label: item.duty,
              tone: switch (item.severity) {
                'urgent' => CatchBadgeTone.danger,
                'warning' => CatchBadgeTone.warning,
                _ => CatchBadgeTone.brand,
              },
            ),
            CatchBadge(
              label: AppTimeFormatters.compactRelativeTime(
                item.createdAt,
                now: now,
              ),
            ),
          ],
        ),
      ],
    ),
  );
}
