import { retryTransientNativeCommand } from "../googleMapSurface.utils";

describe("SIT-42 retryTransientNativeCommand AAA", () => {
  afterEach(() => jest.useRealTimers());

  it("uses default retry settings for a successful command", async () => {
    // Arrange
    const command = jest.fn().mockResolvedValue("ready");
    // Act
    const result = await retryTransientNativeCommand(command, () => true);
    // Assert
    expect(result).toBe("ready");
  });

  it("returns the successful command value", async () => {
    // Arrange
    const command = jest.fn().mockResolvedValue("ready");
    // Act
    const result = await retryTransientNativeCommand(command, () => true, 3, 5);
    // Assert
    expect(result).toBe("ready");
  });

  it("does not repeat a successful command", async () => {
    // Arrange
    const command = jest.fn().mockResolvedValue("ready");
    // Act
    await retryTransientNativeCommand(command, () => true, 3, 5);
    // Assert
    expect(command).toHaveBeenCalledTimes(1);
  });

  it("waits the configured delay before retrying a transient failure", async () => {
    // Arrange
    jest.useFakeTimers();
    const error = new Error("native view unavailable");
    const command = jest.fn().mockRejectedValueOnce(error).mockResolvedValue("ready");
    // Act
    const promise = retryTransientNativeCommand(command, () => true, 3, 50);
    await jest.advanceTimersByTimeAsync(49);
    // Assert: temporal contract
    expect(command).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(await promise).toBe("ready");
  });

  it("propagates a permanent error without waiting", async () => {
    // Arrange
    const error = new Error("permanent");
    const command = jest.fn().mockRejectedValue(error);
    // Act
    const promise = retryTransientNativeCommand(command, () => false, 3, 50);
    // Assert
    await expect(promise).rejects.toBe(error);
    expect(command).toHaveBeenCalledTimes(1);
  });

  it("stops exactly at the attempt limit", async () => {
    // Arrange
    jest.useFakeTimers();
    const error = new Error("transient");
    const command = jest.fn().mockRejectedValue(error);
    // Act
    const assertion = expect(
      retryTransientNativeCommand(command, () => true, 3, 10),
    ).rejects.toBe(error);
    await jest.runAllTimersAsync();
    // Assert
    await assertion;
    expect(command).toHaveBeenCalledTimes(3);
  });

  it("does not invoke the command when attempts is zero", async () => {
    // Arrange
    const command = jest.fn();
    // Act
    const assertion = expect(
      retryTransientNativeCommand(command, () => true, 0, 10),
    ).rejects.toBeUndefined();
    // Assert
    await assertion;
    expect(command).not.toHaveBeenCalled();
  });
  it("does not schedule a delay after the final failed attempt", async () => {
    // Arrange
    jest.useFakeTimers();
    const error = new Error("transient");
    const command = jest.fn().mockRejectedValue(error);
    // Act
    const assertion = expect(
      retryTransientNativeCommand(command, () => true, 1, 50),
    ).rejects.toBe(error);
    await jest.advanceTimersByTimeAsync(0);
    // Assert
    expect(jest.getTimerCount()).toBe(0);
    await jest.runAllTimersAsync();
    await assertion;
  });
});
