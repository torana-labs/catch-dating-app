import 'package:catch_dating_app/hosts/forms/response_screen.dart';
import 'package:flutter/widgets.dart';

/// Compatibility entry for saved application URLs; all detail UI has one owner.
class HostApplicationDetailScreen extends StatelessWidget {
  const HostApplicationDetailScreen({
    super.key,
    required this.organizerId,
    required this.applicationId,
  });
  final String organizerId;
  final String applicationId;
  @override
  Widget build(BuildContext context) => HostResponseScreen.application(
    organizerId: organizerId,
    applicationId: applicationId,
  );
}
