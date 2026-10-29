import 'package:catch_dating_app/contexts/programmes/data/program_snapshot_reader.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Function-lead Now/Next board: the program's functions bucketed by
/// in-progress, upcoming and finished, with door-side counts so a lead can
/// see where they are needed without opening each roster. Pure client
/// projection over the staff work-access payload — no dedicated read.
class ProgramNowNextScreen extends ConsumerWidget {
  const ProgramNowNextScreen({super.key, required this.programId, this.now});

  final String programId;

  /// Test seam for bucket boundaries; production uses wall clock.
  final DateTime Function()? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final accessAsync = ref.watch(programWorkEntryProvider(programId, null));
    return CatchAsyncBoundary<ProgramReadView<ProgramWorkAccess>>(
      retainDataOn: const {},
      value: accessAsync,
      onRetry: () => ref.invalidate(programWorkEntryProvider(programId, null)),
      loadingBuilder: (_) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsNowNextTitle,
          subtitle: context.l10n.programsNowNextSubtitle,
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
          title: context.l10n.programsNowNextTitle,
          subtitle: context.l10n.programsNowNextSubtitle,
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
      builder: (context, result) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsNowNextTitle,
          subtitle: context.l10n.programsNowNextSubtitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: CatchRouteBody.standardSections(
          sections: _sections(
            context,
            result.value.programId,
            result.value.functions,
            (now ?? DateTime.now)(),
          ),
        ),
      ),
    );
  }

  List<CatchSectionListItem> _sections(
    BuildContext context,
    String programId,
    List<ProgramFunction> functions,
    DateTime now,
  ) {
    final active = <ProgramFunction>[];
    final upcoming = <ProgramFunction>[];
    final finished = <ProgramFunction>[];
    for (final fn in functions) {
      if (fn.status == ProgramFunctionStatus.cancelled) continue;
      if (fn.endsAt.isAfter(now) && !fn.startsAt.isAfter(now)) {
        active.add(fn);
      } else if (fn.startsAt.isAfter(now)) {
        upcoming.add(fn);
      } else {
        finished.add(fn);
      }
    }
    active.sort((a, b) => a.endsAt.compareTo(b.endsAt));
    upcoming.sort((a, b) => a.startsAt.compareTo(b.startsAt));
    finished.sort((a, b) => b.startsAt.compareTo(a.startsAt));
    return [
      if (functions.isEmpty)
        CatchSectionListItem(
          child: CatchEmptyState(
            icon: CatchIcons.event,
            title: context.l10n.programsNowNextEmptyTitle,
            message: context.l10n.programsNowNextEmptyMessage,
          ),
        )
      else ...[
        _bucket(
          context,
          title: context.l10n.programsNowNextNowTitle,
          subtitle: context.l10n.programsNowNextNowSubtitle,
          programId: programId,
          functions: active,
          live: true,
        ),
        _bucket(
          context,
          title: context.l10n.programsNowNextUpcomingTitle,
          subtitle: context.l10n.programsNowNextUpcomingSubtitle,
          programId: programId,
          functions: upcoming,
          live: false,
        ),
        if (finished.isNotEmpty)
          _bucket(
            context,
            title: context.l10n.programsNowNextEarlierTitle,
            subtitle: context.l10n.programsNowNextEarlierSubtitle,
            programId: programId,
            functions: finished,
            live: false,
          ),
      ],
    ];
  }

  CatchSectionListItem _bucket(
    BuildContext context, {
    required String title,
    required String subtitle,
    required String programId,
    required List<ProgramFunction> functions,
    required bool live,
  }) => CatchSectionListItem(
    child: CatchSection.contained(
      title: title,
      subtitle: subtitle,
      child: functions.isEmpty
          ? CatchEmptyState(
              icon: CatchIcons.event,
              message: context.l10n.programsNowNextBucketEmpty,
              variant: CatchEmptyStateVariant.inline,
            )
          : Column(
              children: [
                for (final fn in functions)
                  ProgramFunctionNowNextRow(
                    fn: fn,
                    live: live,
                    programId: programId,
                  ),
              ],
            ),
    ),
  );
}

class ProgramFunctionNowNextRow extends StatelessWidget {
  const ProgramFunctionNowNextRow({
    super.key,
    required this.fn,
    required this.live,
    required this.programId,
  });

  final ProgramFunction fn;
  final bool live;
  final String programId;

  @override
  Widget build(BuildContext context) => CatchFieldRow.standard(
    leading: Icon(live ? CatchIcons.play : CatchIcons.time),
    body: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchText(fn.name, variant: CatchTextVariant.sectionTitle),
        CatchMetaRow(
          icon: CatchIcons.time,
          label:
              '${AppTimeFormatters.time(fn.startsAt)} – '
              '${AppTimeFormatters.time(fn.endsAt)}'
              '${fn.venueName == null ? '' : ' · ${fn.venueName!}'}',
        ),
        gapH4,
        Wrap(
          spacing: CatchSpacing.s2,
          runSpacing: CatchSpacing.s1,
          children: [
            CatchBadge.functional(
              label: context.l10n.programsDoorCountsCheckedIn(
                count: fn.checkedInCount,
              ),
              tone: CatchBadgeTone.success,
            ),
            CatchBadge(
              label: context.l10n.programsDoorCountsExpected(
                count: fn.expectedCount,
              ),
            ),
          ],
        ),
      ],
    ),
    trailing: Icon(CatchIcons.disclosure),
    onTap: () => context.pushNamed(
      Routes.hostWorkDoorScreen.name,
      pathParameters: {'programId': programId, 'functionId': fn.functionId},
      queryParameters: {'function': fn.name},
    ),
  );
}
