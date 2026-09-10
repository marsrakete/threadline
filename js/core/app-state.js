/**
 * Creates a queue that runs asynchronous state writes one after another.
 * @returns {{enqueue: (task: () => Promise<unknown>) => Promise<unknown>}} Queue API for serialized tasks.
 */
export function createAsyncTaskQueue() {
  let pendingTask = Promise.resolve();

  return {
    /**
     * Adds one asynchronous task after all earlier queued tasks have settled.
     * @param {() => Promise<unknown>} task - Asynchronous task to run.
     * @returns {Promise<unknown>} Result of the queued task.
     */
    enqueue(task) {
      pendingTask = pendingTask.catch(() => {}).then(task);
      return pendingTask;
    },
  };
}
