import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profiles_controller.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class FormProfilesScreen extends StatelessWidget {
  const FormProfilesScreen({super.key});
  @override
  Widget build(BuildContext context) => CatchRouteScaffold(
    topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
      title: context.l10n.formProfilesTitle,
      navigation: const CatchTopBarNavigation(
        mode: CatchTopBarNavigationMode.back,
      ),
      emphasis: scrolledUnder
          ? CatchTopBarEmphasis.divided
          : CatchTopBarEmphasis.plain,
    ),
    body: const CatchRouteBody.standardConstrained(
      child: FormProfilesAsyncBoundary(),
    ),
  );
}

/// The authenticated form directory can render inside the account pager before
/// the applicant has a Consumer profile. It owns its independent async state.
class FormProfilesAsyncBoundary extends ConsumerWidget {
  const FormProfilesAsyncBoundary({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      CatchAsyncBoundary<FormProfilesState>(
        value: ref.watch(formProfilesControllerProvider),
        retainDataOn: const {},
        errorContext: AppErrorContext.profile,
        onRetry: () => ref.invalidate(formProfilesControllerProvider),
        builder: (context, state) => FormProfilesSectionList(
          state: state,
          onOpen: (id) => context.pushNamed(
            Routes.formProfileReviewScreen.name,
            pathParameters: {'responseId': id},
          ),
          onLoadMore: () =>
              ref.read(formProfilesControllerProvider.notifier).loadMore(),
        ),
      );
}

class FormProfilesSectionList extends StatelessWidget {
  const FormProfilesSectionList({
    super.key,
    required this.state,
    required this.onOpen,
    required this.onLoadMore,
  });
  final FormProfilesState state;
  final ValueChanged<String> onOpen;
  final VoidCallback onLoadMore;
  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(
          l10n.formProfilesDescription,
          variant: CatchTextVariant.bodyM,
          color: CatchTokens.of(context).ink,
        ),
        gapH24,
        if (state.page.items.isEmpty && state.page.nextCursor == null)
          CatchEmptyState(
            icon: CatchIcons.personOutlineRounded,
            title: l10n.formProfilesEmptyTitle,
            message: l10n.formProfilesEmptyBody,
          ),
        if (state.page.items.isNotEmpty)
          CatchSectionList(
            emptyStateOmitted: true,
            children: [
              for (final group in state.page.organizerGroups)
                CatchSection.contained(
                  key: ValueKey('organizer-card-${group.first.organizerId}'),
                  title:
                      group.first.organizerName ??
                      l10n.formProfilesOrganizerFallback,
                  children: [
                    for (final row in group)
                      CatchField.nav(
                        key: ValueKey('form-profile-${row.responseId}'),
                        copy: catchFieldCopy(l10n),
                        title: row.formTitle,
                        emphasis: CatchFieldEmphasis.title,
                        body:
                            '${row.claimedAt == null
                                ? l10n.formProfilesUnclaimed
                                : row.cardFieldCount > 0
                                ? l10n.formProfilesSavedAnswers(count: row.cardFieldCount)
                                : l10n.formProfilesNoCardAnswers}\n${AppTimeFormatters.dateTime(row.submittedAt)}',
                        titleMaxLines: 2,
                        bodyMaxLines: 8,
                        onTap: () => onOpen(row.responseId),
                      ),
                  ],
                ),
            ],
          ),
        if (state.error case final error?)
          CatchLocalizedErrorState(
            error,
            context: AppErrorContext.profile,
            onRetry: onLoadMore,
          ),
        if (state.page.nextCursor != null) ...[
          gapH24,
          CatchButton(
            label: l10n.formProfilesLoadMore,
            status: state.loadingMore
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed: state.loadingMore ? null : onLoadMore,
            variant: CatchButtonVariant.secondary,
          ),
        ],
      ],
    );
  }
}
