import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_extensions.dart';
import 'package:catch_dating_app/hosts/organizer/audience_body.dart';
import 'package:catch_dating_app/hosts/organizer/audience_state.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_controller.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_screen.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The organizer all-time figures and its audience. It reads the organizer
/// through [watchHostOrganizerScope], its events listener and the contact
/// directory summary; it writes nothing. Try again restarts the directory
/// listener the summary is read from.
class OrganizerAudienceScreen extends ConsumerWidget {
  const OrganizerAudienceScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final read = watchHostOrganizerScope(ref, organizerId: organizerId);
    final organizer = read.scope?.organizer;
    final Widget body;
    if (organizer == null) {
      body = HostOrganizerScopeBody(
        gap: read.gap,
        error: read.error,
        onRetry: () => retryHostOrganizerScope(ref),
      );
    } else {
      final events = ref.watch(watchEventsForOrganizerProvider(organizer.id));
      final summary = ref.watch(hostCrmSummaryProvider(organizer.id));
      final list = events.value;
      body = OrganizerAudienceBody(
        state: OrganizerAudienceState(
          organizer: organizer,
          eventCount: list?.length,
          upcomingCount: list?.where((event) => !event.isCancelled).length,
          summary: summary.value,
          audienceStatus: switch (summary) {
            AsyncValue(hasValue: true) => OrganizerAudienceStatus.content,
            AsyncValue(hasError: true) => OrganizerAudienceStatus.unavailable,
            _ => OrganizerAudienceStatus.loading,
          },
        ),
        onRetry: () =>
            ref.invalidate(hostContactDirectoryProvider(organizer.id)),
      );
    }
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-organizer-audience-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostsHostOrganizerCrmTitle,
          kicker: organizer?.name,
          back: CatchTopBarBack(label: l10n.hostOrganizerBack),
        ),
        body: body,
      ),
    );
  }
}
