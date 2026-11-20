import 'package:catch_dating_app/contexts/insights/parts/host_analytics_metric_tile.dart';
import 'package:catch_dating_app/hosts/today/host_today_body.dart';
import 'package:catch_dating_app/hosts/today/host_today_state.dart';
import 'package:flutter_test/flutter_test.dart';

const _all = [
  HostTodayStat(kind: HostTodayStatKind.bookings, value: 312),
  HostTodayStat(
    kind: HostTodayStatKind.ticketSales,
    value: 14800000,
    currencyCode: 'INR',
  ),
  HostTodayStat(
    kind: HostTodayStatKind.cameBack,
    value: 41,
    figure: HostAnalyticsFigure.percent,
  ),
  HostTodayStat(kind: HostTodayStatKind.followers, value: 1284),
];

List<HostTodayStatKind> _kinds(List<HostTodayStat> stats) =>
    stats.map((stat) => stat.kind).toList();

void main() {
  test('the sidebar layout shows all four Last 30 days figures', () {
    expect(_kinds(hostTodayVisibleStats(_all, wide: true)), [
      HostTodayStatKind.bookings,
      HostTodayStatKind.ticketSales,
      HostTodayStatKind.cameBack,
      HostTodayStatKind.followers,
    ]);
  });

  test('a phone keeps bookings and who came back', () {
    expect(_kinds(hostTodayVisibleStats(_all, wide: false)), [
      HostTodayStatKind.bookings,
      HostTodayStatKind.cameBack,
    ]);
  });

  test('a phone falls back to ticket sales when came back is missing', () {
    expect(
      _kinds(hostTodayVisibleStats([_all[0], _all[1], _all[3]], wide: false)),
      [HostTodayStatKind.bookings, HostTodayStatKind.ticketSales],
    );
  });
}
