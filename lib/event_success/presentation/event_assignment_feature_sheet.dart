import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/event_success/presentation/event_assignment_feature_choices_page_body.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The backend discovers only this verified respondent's answers. A separate
/// matching decision is required for each answer; prior grants stay visible.
class EventAssignmentFeatureSheet extends ConsumerWidget {
  const EventAssignmentFeatureSheet({super.key, required this.eventId});
  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authenticatedSessionProvider);
    return CatchSheet.standard(
      title: context.l10n.eventMatchingTitle,
      child: switch (session) {
        AsyncData(:final value) => EventAssignmentFeatureChoicesPageBody(
          key: ValueKey((eventId, value)),
          eventId: eventId,
          session: value,
        ),
        AsyncError(:final error) => CatchLocalizedErrorBanner(error),
        AsyncLoading() => const CatchLoadingIndicator(),
      },
    );
  }
}
