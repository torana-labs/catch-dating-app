import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_dating_app/contexts/organizers/organizers.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_done_body.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_screen.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/device/clipboard.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Done: listens to the new page for its name, whether it is published and
/// its public address. Copy puts the address on the clipboard; the Next rows
/// and Create your first event open their host routes; Close goes to Today.
class HostSetupDoneScreen extends ConsumerStatefulWidget {
  const HostSetupDoneScreen({
    super.key,
    required this.organizerId,
    required this.fallbackName,
  });

  final String organizerId;

  /// The name typed in setup, until the page is read.
  final String fallbackName;

  @override
  ConsumerState<HostSetupDoneScreen> createState() =>
      _HostSetupDoneScreenState();
}

class _HostSetupDoneScreenState extends ConsumerState<HostSetupDoneScreen> {
  var _copied = false;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final organizer = catchAsyncStateFromAsyncValue(
      ref.watch(watchOrganizerProvider(widget.organizerId)),
    ).value;
    final page = organizer?.publicPage;
    final path = page?.canonicalPath;
    final link = path == null
        ? null
        : AppConfig.publicSiteUrl.resolve(path).toString();
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-setup-done'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.moment,
          back: CatchTopBarBack(
            label: l10n.hostOnboardingDoneClose,
            close: true,
            onPressed: () => context.goNamed(
              Routes.hostTodayScreen.name,
              queryParameters: {'organizerId': widget.organizerId},
            ),
          ),
        ),
        body: HostSetupDoneBody(
          name: organizer?.name ?? widget.fallbackName,
          live:
              page?.publishStatus == OrganizerPublicPagePublishStatus.published,
          link: link,
          copied: _copied,
          onCopy: link == null
              ? null
              : () {
                  unawaited(
                    ref.read(clipboardControllerProvider).copyText(link),
                  );
                  setState(() => _copied = true);
                },
          onNextStep: _openNextStep,
          onCreateEvent: () => context.pushNamed(
            Routes.hostCreateEventScreen.name,
            pathParameters: {'organizerId': widget.organizerId},
            extra: organizer == null
                ? null
                : HostCreateEventRouteArguments(initialOrganizer: organizer),
          ),
        ),
      ),
    );
  }

  void _openNextStep(HostSetupNextStep step) {
    final organizerId = widget.organizerId;
    switch (step) {
      case HostSetupNextStep.instagramBio:
        context.pushNamed(
          Routes.hostOrganizerScreen.name,
          queryParameters: {'organizerId': organizerId},
        );
      case HostSetupNextStep.team:
        context.pushNamed(
          Routes.hostOrganizerTeamScreen.name,
          queryParameters: {'organizerId': organizerId},
        );
      case HostSetupNextStep.rehearse:
        context.pushNamed(
          Routes.hostEventRehearsalStartScreen.name,
          pathParameters: {'organizerId': organizerId},
        );
    }
  }
}
