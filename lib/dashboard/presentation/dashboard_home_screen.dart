part of 'dashboard_screen.dart';

class DashboardHomeScreen extends StatelessWidget {
  const DashboardHomeScreen({
    super.key,
    required this.header,
    required this.dashboardSliver,
    this.actions = const <Widget>[],
  });

  final DashboardHomeHeaderModel header;
  final Widget dashboardSliver;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    return CatchRootScreenScaffold.standard(
      title: CatchLegacyTopBar.primaryRail(
        title: header.title(context.l10n),
        actions: actions,
      ),
      semanticsLabel: context.l10n.dashboardDashboardHomeScreenLabelHome,
      children: [dashboardSliver],
    );
  }
}
