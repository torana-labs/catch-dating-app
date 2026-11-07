import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The People tab's three views.
enum HostPeopleView { people, messages, forms }

/// People, Messages and Forms, the segmented control at the top of each
/// view of the People tab.
class HostPeopleTabs extends StatelessWidget {
  const HostPeopleTabs({
    super.key,
    required this.selected,
    required this.onView,
  });

  final HostPeopleView selected;
  final ValueChanged<HostPeopleView> onView;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchPageTabBar<HostPeopleView>.segmented(
      selected: selected,
      label: l10n.hostPeopleViewsLabel,
      options: [
        CatchOption(
          value: HostPeopleView.people,
          label: l10n.hostPeopleViewPeople,
        ),
        CatchOption(
          value: HostPeopleView.messages,
          label: l10n.hostPeopleViewMessages,
        ),
        CatchOption(
          value: HostPeopleView.forms,
          label: l10n.hostPeopleViewForms,
        ),
      ],
      onChanged: (view) {
        if (view != selected) onView(view);
      },
    );
  }
}
