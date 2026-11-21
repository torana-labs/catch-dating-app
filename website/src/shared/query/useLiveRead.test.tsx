import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, expect, it, vi} from "vitest";
import {liveReadErrorCode, useLiveRead, type LiveSubscribe} from "./useLiveRead";

afterEach(cleanup);

it("stays pending without a key and shows each value once listening", async () => {
  let push: (value: number) => void = () => undefined;
  const stop = vi.fn();
  const subscribe: LiveSubscribe<number> = async (onValue) => {
    push = onValue;
    return stop;
  };
  const {result, rerender, unmount} = renderHook(({key}) => useLiveRead(key, subscribe), {initialProps: {key: null as string | null}});
  expect(result.current.status).toBe("pending");
  rerender({key: "a"});
  await waitFor(() => expect(push).not.toBe(undefined));
  act(() => push(1));
  expect(result.current).toEqual({status: "success", data: 1, error: null});
  act(() => push(2));
  expect(result.current.data).toBe(2);
  unmount();
  expect(stop).toHaveBeenCalledTimes(1);
});

it("hides the previous key's value and stops its listener", async () => {
  const stops: Record<string, () => void> = {a: vi.fn(), b: vi.fn()};
  const pushes: Record<string, (value: string) => void> = {};
  const {result, rerender} = renderHook(({key}) => useLiveRead<string>(key, (onValue) => {
    pushes[key] = onValue;
    return stops[key]!;
  }), {initialProps: {key: "a"}});
  await waitFor(() => expect(pushes.a).toBeDefined());
  act(() => pushes.a!("first"));
  rerender({key: "b"});
  expect(result.current.status).toBe("pending");
  expect(stops.a).toHaveBeenCalled();
});

it("reports listener and setup errors", async () => {
  const denied = Object.assign(new Error("denied"), {code: "permission-denied"});
  const {result} = renderHook(() => useLiveRead<number>("a", (_onValue, onError) => {
    onError(denied);
    return () => undefined;
  }));
  await waitFor(() => expect(result.current.status).toBe("error"));
  expect(liveReadErrorCode(result.current.error)).toBe("permission-denied");
  const failed = renderHook(() => useLiveRead<number>("a", async () => {throw new Error("offline");}));
  await waitFor(() => expect(failed.result.current.error?.message).toBe("offline"));
  expect(liveReadErrorCode({code: "functions/aborted"})).toBe("aborted");
});
