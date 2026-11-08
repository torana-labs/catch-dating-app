import 'package:catch_dating_app/hosts/people/messages_body.dart';
import 'package:catch_dating_app/hosts/people/messages_controller.dart';
import 'package:catch_dating_app/hosts/people/messages_state.dart';
import 'package:catch_dating_app/hosts/people/people_controller.dart';
import 'package:catch_dating_app/hosts/people/people_screen.dart';
import 'package:catch_dating_app/hosts/people/widgets/people_scope_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The People tab's Messages view: every conversation with the organizer,
/// Catch and WhatsApp together, newest first.
///
/// It resolves the organizer, keeps the chip, watches
/// [hostMessagesControllerProvider] and opens a conversation, Automatic
/// messages or the compose screen. A conversation opens in the inbox
/// thread view, which stays until the chat redraw.
class HostMessagesScreen extends ConsumerStatefulWidget {
  const HostMessagesScreen({super.key, this.initialOrganizerId, this.now});

  final String? initialOrganizerId;

  /// A fixed clock for previews and tests; null follows the app clock.
  final DateTime? now;

  @override
  ConsumerState<HostMessagesScreen> createState() => _HostMessagesScreenState();
}

class _HostMessagesScreenState extends ConsumerState<HostMessagesScreen> {
  HostMessagesFilter _filter = HostMessagesFilter.all;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final now = widget.now ?? ref.read(appClockProvider).now();
    final scope = ref.watch(
      hostPeopleOrganizerProvider(widget.initialOrganizerId),
    );
    final organizer = scope.organizer;
    final Widget body;
    if (organizer == null) {
      body = HostPeopleScopeBody(
        organizer: scope,
        onRetry: () => retryHostPeopleOrganizer(ref, scope.uid),
        onSignIn: () => context.go(Routes.authScreen.path),
      );
    } else {
      final request = HostMessagesRequest(
        organizerId: organizer.id,
        day: DateTime(now.year, now.month, now.day),
        filter: _filter,
      );
      body = HostMessagesBody(
        state: ref.watch(hostMessagesControllerProvider(request)),
        now: now,
        onView: (view) => openHostPeopleView(context, view, organizer.id),
        onFilter: (filter) => setState(() => _filter = filter),
        onOpenThread: (thread) => context.goNamed(
          Routes.hostInboxScreen.name,
          queryParameters: {
            'organizerId': organizer.id,
            'threadId': thread.personId,
            if (thread.eventId case final eventId?)
              'eventId': eventId
            else
              'scope': 'general',
          },
        ),
        onAutomations: () => context.pushNamed(
          Routes.hostAudienceAutomationsScreen.name,
          queryParameters: {'organizerId': organizer.id},
        ),
        onRetry: () => retryHostMessagesReads(ref, organizer.id),
      );
    }
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-messages-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tabHome,
          kicker: organizer?.name,
          title: l10n.hostPeopleTitle,
          actions: [
            CatchButton(
              label: l10n.hostPeopleMessage,
              leading: CatchIcon(CatchIcons.add, size: CatchIconSize.md),
              onPressed: organizer == null
                  ? null
                  : () => context.pushNamed(
                      Routes.hostNewMessageScreen.name,
                      queryParameters: {'organizerId': organizer.id},
                    ),
            ),
          ],
        ),
        body: body,
      ),
    );
  }
}
