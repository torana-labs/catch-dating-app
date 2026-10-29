import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';

String eventSuccessReportPercent(double value) => '${(value * 100).round()}%';

String eventSuccessFunnelSummaryCopy(EventSuccessHostFunnel funnel) {
  if (funnel.totalDemandCount == 0 && funnel.inviteOpenCount == 0) {
    return 'Waiting for booking and attribution data to build the operating funnel.';
  }
  if (funnel.requestCount > 0 && funnel.pendingRequestCount > 0) {
    return '${funnel.pendingRequestCount} request${funnel.pendingRequestCount == 1 ? '' : 's'} still need a host decision before demand can convert.';
  }
  if (funnel.waitlistOfferCount > 0 &&
      funnel.waitlistOfferAcceptanceRate < 0.5) {
    return 'Waitlist offers are the weak point; tighten timing or send clearer offer copy before the next release.';
  }
  if (funnel.noShowRate >= 0.2 && funnel.bookedCount >= 5) {
    return 'Attendance is leaking after booking; send stronger arrival reminders and make check-in easier.';
  }
  if (funnel.connectionRate < 0.4 && funnel.checkedInCount >= 5) {
    return 'Attendance converted, but connection needs stronger live prompts or post-event openers.';
  }
  return 'Demand, booking, attendance, and connection are now measured in one loop.';
}
