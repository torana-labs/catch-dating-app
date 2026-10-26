import 'package:catch_ui/src/components/catch_badge.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:flutter/material.dart';

enum CatchPrivacyBadgeVariant { privateToYou, hostCanSee, catchPrivate }

/// Caller-resolved copy for the badge's fixed visibility concepts.
@immutable
class CatchPrivacyBadgeCopy {
  const CatchPrivacyBadgeCopy({
    required this.privateToYouLabel,
    required this.hostCanSeeLabel,
    required this.catchPrivateLabel,
  });

  final String privateToYouLabel;
  final String hostCanSeeLabel;
  final String catchPrivateLabel;
}

class CatchPrivacyBadge extends StatelessWidget {
  const CatchPrivacyBadge({
    super.key,
    required this.copy,
    this.variant = CatchPrivacyBadgeVariant.privateToYou,
  });

  final CatchPrivacyBadgeCopy copy;
  final CatchPrivacyBadgeVariant variant;

  @override
  Widget build(BuildContext context) {
    final data = _PrivacyBadgeData.from(variant, copy);

    return Semantics(
      label: data.label,
      child: ExcludeSemantics(
        child: CatchBadge.privacy(label: data.label, icon: data.icon),
      ),
    );
  }
}

class _PrivacyBadgeData {
  const _PrivacyBadgeData({required this.label, required this.icon});

  final String label;
  final IconData icon;

  static _PrivacyBadgeData from(
    CatchPrivacyBadgeVariant variant,
    CatchPrivacyBadgeCopy copy,
  ) {
    return switch (variant) {
      CatchPrivacyBadgeVariant.privateToYou => _PrivacyBadgeData(
        label: copy.privateToYouLabel,
        icon: CatchIcons.locked,
      ),
      CatchPrivacyBadgeVariant.hostCanSee => _PrivacyBadgeData(
        label: copy.hostCanSeeLabel,
        icon: CatchIcons.show,
      ),
      CatchPrivacyBadgeVariant.catchPrivate => _PrivacyBadgeData(
        label: copy.catchPrivateLabel,
        icon: CatchIcons.safety,
      ),
    };
  }
}
