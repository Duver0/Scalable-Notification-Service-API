import { Test, TestingModule } from "@nestjs/testing";
import { AdapterRegistry } from "./adapter.registry";
import { EmailAdapter } from "./email.adapter";
import { SmsAdapter } from "./sms.adapter";
import { PushAdapter } from "./push.adapter";

describe("AdapterRegistry", () => {
  let registry: AdapterRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdapterRegistry, EmailAdapter, SmsAdapter, PushAdapter],
    }).compile();

    registry = module.get<AdapterRegistry>(AdapterRegistry);
  });

  it("should return email adapter for email channel", () => {
    const adapter = registry.getAdapter("email");
    expect(adapter.channelName).toBe("email");
  });

  it("should return sms adapter for sms channel", () => {
    const adapter = registry.getAdapter("sms");
    expect(adapter.channelName).toBe("sms");
  });

  it("should return push adapter for push channel", () => {
    const adapter = registry.getAdapter("push");
    expect(adapter.channelName).toBe("push");
  });

  it("should throw for unknown channel", () => {
    expect(() => registry.getAdapter("unknown")).toThrow(
      "No adapter found for channel: unknown",
    );
  });
});
