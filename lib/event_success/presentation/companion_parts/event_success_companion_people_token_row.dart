part of '../event_success_companion_screen.dart';

class PeopleTokenRow extends StatelessWidget {
  const PeopleTokenRow({
    super.key,
    required this.countLabel,
    required this.loading,
    required this.loadingLabel,
    required this.profiles,
  });

  final String countLabel;
  final bool loading;
  final String loadingLabel;
  final List<PublicProfile> profiles;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: CatchSpacing.s2,
      runSpacing: CatchSpacing.s2,
      children: [
        CatchBadge(label: countLabel, icon: CatchIcons.people),
        if (loading)
          CatchBadge(label: loadingLabel, icon: CatchIcons.pending)
        else
          for (final profile in profiles)
            CatchBadge(label: profile.name, icon: CatchIcons.person),
      ],
    );
  }
}
