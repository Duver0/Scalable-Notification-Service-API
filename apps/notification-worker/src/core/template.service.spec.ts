import { Test, TestingModule } from "@nestjs/testing";
import { TemplateService } from "./template.service";
import { NotificationChannel } from "@app/common";

describe("TemplateService", () => {
  let service: TemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateService],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
  });

  it("should find a template by id", () => {
    const template = service.findById("welcome-email");
    expect(template).toBeDefined();
    expect(template!.channel).toBe(NotificationChannel.EMAIL);
  });

  it("should return undefined for unknown template", () => {
    expect(service.findById("unknown")).toBeUndefined();
  });

  it("should render template variables", () => {
    const template = service.findById("welcome-email")!;
    const rendered = service.render(template, { name: "John" });
    expect(rendered.subject).toBe("Welcome, John!");
    expect(rendered.body).toContain("John");
  });
});
