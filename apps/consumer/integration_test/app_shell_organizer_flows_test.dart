// Flutter runs device integration tests only from the current project's
// integration_test/ directory, so the Consumer macOS runner hosts the shared
// app-shell suite through this entrypoint.
import '../../../integration_test/app_shell_organizer_flows_test.dart' as suite;

void main() => suite.main();
