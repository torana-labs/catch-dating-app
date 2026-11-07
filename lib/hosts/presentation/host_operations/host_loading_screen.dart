part of '../host_operations_screen.dart';

class HostLoadingScreen extends StatelessWidget {
  const HostLoadingScreen({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchLegacyTopBar.route(
        title: title,
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: const CatchRouteBody.standardViewport(
        child: CatchStateViewport.loading(accountForBottomOverlay: false),
      ),
    );
  }
}
