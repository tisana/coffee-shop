export function registerWorktreeLauncherShutdown({
  signalEmitter = process,
  child,
  stopChild,
}) {
  let shutdownPromise;

  function requestShutdown() {
    shutdownPromise ??= Promise.resolve().then(() => stopChild(child));
    return shutdownPromise;
  }

  for (const signal of ["SIGINT", "SIGTERM"]) {
    signalEmitter.on(signal, requestShutdown);
  }

  return {
    requestShutdown,
    waitForShutdown: () => shutdownPromise ?? Promise.resolve(),
    get shutdownRequested() {
      return shutdownPromise !== undefined;
    },
  };
}
