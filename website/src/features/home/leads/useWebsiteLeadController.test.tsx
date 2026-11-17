import {act, renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import type {WebsiteLeadForm, WebsiteLeadOutcome, WebsiteLeadSubmission} from "../../../shared/api/websiteLead";
import {homeLeadCityFields, useWebsiteLeadController} from "./useWebsiteLeadController";

const form: WebsiteLeadForm = {kind: "city_alerts", phone: "9876543210", consentVersion: "sample-v1", sourcePage: "/", entry: "sample",
  answers: {interests: []}, city: "Mumbai"};

function fakeSubmission(...outcomes: WebsiteLeadOutcome[]) {
  const submit = vi.fn<WebsiteLeadSubmission["submit"]>();
  for (const outcome of outcomes) submit.mockResolvedValueOnce(outcome);
  return {submission: {submit, reset: vi.fn()} satisfies WebsiteLeadSubmission, submit};
}

describe("homeLeadCityFields", () => {
  it("names a catalog city by id, country and how the site reached it, and an unlisted one by its label alone", () => {
    expect(homeLeadCityFields({label: "Mumbai", slug: "mumbai", source: "picked"}))
      .toEqual({city: "Mumbai", cityId: "in-mh-mumbai", countryIsoCode: "IN", citySource: "picked"});
    expect(homeLeadCityFields({label: "Mumbai", slug: "mumbai"})).toEqual({city: "Mumbai", cityId: "in-mh-mumbai", countryIsoCode: "IN"});
    expect(homeLeadCityFields({label: "Atlantis", slug: "atlantis", source: "picked"})).toEqual({city: "Atlantis"});
  });
});

describe("useWebsiteLeadController", () => {
  it("is submitting while the lead is on its way, then sent", async () => {
    let resolve: (outcome: WebsiteLeadOutcome) => void = () => undefined;
    const submit = vi.fn(() => new Promise<WebsiteLeadOutcome>((done) => {resolve = done;}));
    const {result} = renderHook(() => useWebsiteLeadController({submit, reset: vi.fn()}));
    let sending: Promise<void> = Promise.resolve();
    act(() => {sending = result.current.send(form);});
    expect(result.current.submitting).toBe(true);
    // A second tap while the first is on its way sends nothing more.
    await act(() => result.current.send(form));
    expect(submit).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve({status: "sent", leadId: "lead-1", isNew: true});
      await sending;
    });
    expect(result.current).toMatchObject({submitting: false, sent: true, phoneProblem: null, sendProblem: null});
  });

  it("puts a refused number on the number, any other failure on the send, and clears either when the person edits", async () => {
    const {submission, submit} = fakeSubmission(
      {status: "invalid_phone", message: "Check your number."},
      {status: "busy", message: "Try later."},
    );
    const {result} = renderHook(() => useWebsiteLeadController(submission));
    await act(() => result.current.send(form));
    expect(result.current).toMatchObject({sent: false, phoneProblem: "Check your number.", sendProblem: null});
    act(() => result.current.clearProblem());
    expect(result.current.phoneProblem).toBeNull();
    await act(() => result.current.send(form));
    expect(result.current).toMatchObject({sent: false, phoneProblem: null, sendProblem: "Try later."});
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it("keeps one submission for the form's life", async () => {
    const first = fakeSubmission({status: "sent", leadId: null, isNew: true});
    const later = fakeSubmission({status: "sent", leadId: null, isNew: true});
    const {result, rerender} = renderHook(({value}) => useWebsiteLeadController(value), {initialProps: {value: first.submission}});
    rerender({value: later.submission});
    await act(() => result.current.send(form));
    expect(first.submit).toHaveBeenCalledWith(form);
    expect(later.submit).not.toHaveBeenCalled();
  });
});
