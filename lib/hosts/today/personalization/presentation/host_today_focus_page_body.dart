import 'package:catch_dating_app/hosts/today/personalization/domain/host_today_preference.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostTodayFocusPageBody extends StatelessWidget {
  const HostTodayFocusPageBody({
    super.key,
    required this.selected,
    required this.pending,
    required this.onSelect,
    required this.onContinue,
    required this.onSkip,
  });

  final HostTodayFocus? selected;
  final bool pending;
  final ValueChanged<HostTodayFocus> onSelect;
  final VoidCallback onContinue;
  final VoidCallback onSkip;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(l10n.hostTodayFocusHeading, variant: CatchTextVariant.titleL),
        const SizedBox(height: CatchSpacing.s3),
        CatchText(
          l10n.hostTodayFocusIntroduction,
          variant: CatchTextVariant.bodyL,
        ),
        const SizedBox(height: CatchSpacing.s6),
        for (final focus in HostTodayFocus.values) ...[
          Semantics(
            selected: focus == selected,
            inMutuallyExclusiveGroup: true,
            child: CatchChoiceTile(
              key: ValueKey('host-today-focus-${focus.name}'),
              title: hostTodayFocusTitle(l10n, focus),
              subtitle: hostTodayFocusDescription(l10n, focus),
              selected: focus == selected,
              contractExemption:
                  'Device-local Today focus, not backend form data.',
              onTap: pending ? null : () => onSelect(focus),
            ),
          ),
          const SizedBox(height: CatchSpacing.s3),
        ],
        const SizedBox(height: CatchSpacing.s3),
        CatchText(
          l10n.hostTodayFocusSafety,
          variant: CatchTextVariant.supporting,
        ),
        const SizedBox(height: CatchSpacing.s6),
        CatchButton(
          key: const ValueKey('host-today-focus-continue'),
          label: l10n.hostTodayFocusContinue,
          status: pending ? CatchButtonStatus.loading : CatchButtonStatus.idle,
          onPressed: pending || selected == null ? null : onContinue,
        ),
        const SizedBox(height: CatchSpacing.s2),
        CatchButton(
          key: const ValueKey('host-today-focus-skip'),
          label: l10n.hostTodayFocusSkip,
          variant: CatchButtonVariant.ghost,
          onPressed: pending ? null : onSkip,
        ),
      ],
    );
  }
}

String hostTodayFocusTitle(AppLocalizations l10n, HostTodayFocus focus) =>
    switch (focus) {
      HostTodayFocus.audience => l10n.hostTodayFocusAudienceTitle,
      HostTodayFocus.rehearsal => l10n.hostTodayFocusRehearsalTitle,
      HostTodayFocus.organizerPresence => l10n.hostTodayFocusPresenceTitle,
    };

String hostTodayFocusDescription(AppLocalizations l10n, HostTodayFocus focus) =>
    switch (focus) {
      HostTodayFocus.audience => l10n.hostTodayFocusAudienceBody,
      HostTodayFocus.rehearsal => l10n.hostTodayFocusRehearsalBody,
      HostTodayFocus.organizerPresence => l10n.hostTodayFocusPresenceBody,
    };
