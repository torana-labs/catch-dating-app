import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/programs/data/program_setup_repository.dart';
import 'package:catch_dating_app/programs/data/program_snapshot_reader.dart';
import 'package:catch_dating_app/programs/data/program_work_repository.dart';
import 'package:catch_dating_app/programs/domain/program_models.dart';
import 'package:catch_dating_app/programs/presentation/program_guests_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProgramGuestDeskScreen extends ConsumerWidget {
  const ProgramGuestDeskScreen({super.key, required this.programId});

  final String programId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = DateTime.now();
    final accessAsync = ref.watch(programWorkEntryProvider(programId, null));
    final guestsAsync = ref.watch(programGuestListProvider(programId));
    return CatchAsyncBoundary<ProgramReadView<ProgramWorkAccess>>(
      retainDataOn: const {},
      value: accessAsync,
      onRetry: () => ref.invalidate(programWorkEntryProvider(programId, null)),
      loadingBuilder: (_) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsGuestsTitle,
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
          title: context.l10n.programsGuestsTitle,
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
      builder: (context, result) {
        final access = result.value;
        final canOpen =
            access.isManager ||
            access.hasDuty(ProgramStaffDuty.guestRelations, now: now);
        if (!canOpen) {
          return CatchRouteScaffold(
            topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
              title: access.title,
              subtitle: context.l10n.programsGuestsTitle,
              emphasis: scrolledUnder
                  ? CatchTopBarEmphasis.divided
                  : CatchTopBarEmphasis.plain,
              navigation: const CatchTopBarNavigation(
                mode: CatchTopBarNavigationMode.back,
              ),
            ),
            body: CatchRouteBody.standardViewport(
              child: CatchEmptyState(
                icon: CatchIcons.locked,
                title: context.l10n.programsGuestDeskAccessTitle,
                message: context.l10n.programsGuestDeskAccessMessage,
              ),
            ),
          );
        }
        return CatchAsyncBoundary<ProgramGuestListPage>(
          retainDataOn: const {},
          value: guestsAsync,
          onRetry: () => ref.invalidate(programGuestListProvider(programId)),
          loadingBuilder: (_) => CatchRouteScaffold(
            topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
              title: access.title,
              subtitle: context.l10n.programsGuestsTitle,
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
              title: access.title,
              subtitle: context.l10n.programsGuestsTitle,
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
          builder: (context, page) => ProgramGuestsPageBody(
            programId: programId,
            programTitle: access.title,
            functions: [
              for (final fn in access.functions)
                ProgramGuestsFunction(functionId: fn.functionId, name: fn.name),
            ],
            hotels: access.hotels,
            guestPage: page,
            canShareRsvpLinks:
                access.status != ProgramStatus.archived &&
                (access.hasDuty(ProgramStaffDuty.guestRelations, now: now) ||
                    access.hasDuty(ProgramStaffDuty.communications, now: now)),
            canManageGuests:
                access.isManager ||
                access.hasDuty(ProgramStaffDuty.programCoordinator, now: now),
          ),
        );
      },
    );
  }
}
